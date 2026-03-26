/**
 * Calculator Service v2
 * Calculates shipping prices for ALL 6 shipping lines and returns top 5 sorted by price
 *
 * Uses:
 * - BasePrice: Base freight prices per shipping line
 * - PortAdjustment: Additional costs per origin port
 * - AdminSettings: Fixed costs (port taxes, customs, transport, commission)
 */

import prisma from '../../lib/prisma';
import {
  ContainerEntry,
  CalculatorInput,
  ContainerPriceBreakdown,
  PriceOffer,
  CalculatorResult,
  SupplierData,
  PlaceOrderRequest,
  PlaceOrderResult,
} from './calculator.types';
import { sendOrderEmails } from './calculator-emails';

// Re-export types for backward compatibility
export {
  ContainerEntry,
  CalculatorInput,
  ContainerPriceBreakdown,
  PriceOffer,
  CalculatorResult,
  SupplierData,
  PlaceOrderRequest,
  PlaceOrderResult,
};

export class CalculatorService {
  /**
   * Calculate prices for ALL shipping lines and return top 5 sorted by price
   * Supports multiple container types with quantities
   */
  async calculatePrices(input: CalculatorInput): Promise<CalculatorResult> {
    // Validate input
    this.validateInput(input);

    const portDestination = input.portDestination || 'Constanta';
    const readyDate = new Date(input.cargoReadyDate);

    // Normalize containers: use containers array if provided, otherwise use single containerType
    const containers: ContainerEntry[] =
      input.containers && input.containers.length > 0
        ? input.containers.filter((c) => c.quantity > 0)
        : [{ type: input.containerType, quantity: 1 }];

    const totalContainerCount = containers.reduce((sum, c) => sum + c.quantity, 0);

    // 1. Get admin settings (fixed costs)
    const settings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      throw new Error('Admin settings not configured. Please contact administrator.');
    }

    // 2. Get port adjustment for origin port
    const portAdjustment = await prisma.portAdjustment.findUnique({
      where: { portName: input.portOrigin },
    });

    const originAdjustment = portAdjustment?.adjustment || 0;

    // 3. Get fixed costs based on destination port
    const isConstanta =
      portDestination.toLowerCase().includes('constanta') ||
      portDestination.toLowerCase().includes('constanța');

    const portTaxes = isConstanta ? settings.portTaxesConstanta : settings.portTaxesOdessa;

    const terrestrialTransport = isConstanta
      ? settings.terrestrialTransportConstanta
      : settings.terrestrialTransportOdessa;

    const insurance = input.includeInsurance ? settings.insuranceCost : 0;

    // 3b. Calculate weight surcharges from weight ranges
    let freightSurcharge = 0;
    let terrestrialSurcharge = 0;
    try {
      const weightRanges = JSON.parse(settings.weightRanges || '[]');
      if (Array.isArray(weightRanges) && input.cargoWeight) {
        const matchedRange = weightRanges.find(
          (r: any) => r.enabled && r.label === input.cargoWeight
        );
        if (matchedRange) {
          freightSurcharge = matchedRange.freightSurcharge || 0;
          terrestrialSurcharge = matchedRange.terrestrialSurcharge || 0;
        }
      }
    } catch (e) {
      // Invalid weight ranges JSON, skip surcharges
    }

    // 4. Query BasePrice for ALL container types
    const containerTypes = [...new Set(containers.map((c) => c.type))];

    const basePrices = await prisma.basePrice.findMany({
      where: {
        portOrigin: input.portOrigin,
        ...(isConstanta
          ? {
              OR: [
                { portDestination: { contains: 'Constanta', mode: 'insensitive' } },
                { portDestination: { contains: 'Constanța', mode: 'insensitive' } },
              ],
            }
          : { portDestination: { contains: 'Odessa', mode: 'insensitive' } }),
        containerType: { in: containerTypes },
        isActive: true,
        validFrom: { lte: readyDate },
        validUntil: { gte: readyDate },
      },
    });

    // If no prices found in BasePrice, fall back to AgentPrice
    if (basePrices.length === 0) {
      return this.calculateWithAgentPrices(
        input,
        settings,
        originAdjustment,
        portTaxes,
        terrestrialTransport,
        insurance,
        containers,
        totalContainerCount,
        freightSurcharge,
        terrestrialSurcharge
      );
    }

    // Group base prices by shipping line
    const pricesByShippingLine = new Map<string, typeof basePrices>();
    for (const price of basePrices) {
      if (!pricesByShippingLine.has(price.shippingLine)) {
        pricesByShippingLine.set(price.shippingLine, []);
      }
      pricesByShippingLine.get(price.shippingLine)!.push(price);
    }

    // 4b. Preload ShippingLineContainer configs (for local port taxes lookup)
    const shippingLineContainers = await prisma.shippingLineContainer.findMany({
      where: { isActive: true },
    });
    const slcMap = new Map<string, number>(); // "MSC__20DC" → portTaxes
    for (const slc of shippingLineContainers) {
      slcMap.set(`${slc.shippingLine}__${slc.containerType}`, slc.portTaxes);
    }

    // 4c. Preload TransportRate configs (for transport rate lookup)
    const transportRates = await prisma.transportRate.findMany({
      where: {
        isActive: true,
        destination: isConstanta ? 'Constanța' : 'Odessa',
      },
    });
    const trMap = new Map<string, number>(); // "20DC__1-10 tone" → rate
    for (const tr of transportRates) {
      trMap.set(`${tr.containerType}__${tr.weightRange}`, tr.rate);
    }

    // 5. Calculate total price for each shipping line across all container types
    const offers: PriceOffer[] = [];

    for (const [shippingLine, prices] of pricesByShippingLine) {
      // Build price map by container type for this shipping line
      const priceByType = new Map<string, (typeof basePrices)[0]>();
      for (const price of prices) {
        priceByType.set(price.containerType, price);
      }

      // Check if we have prices for all requested container types
      const missingTypes = containerTypes.filter((t) => !priceByType.has(t));
      if (missingTypes.length > 0) {
        // Skip this shipping line if it doesn't have prices for all container types
        continue;
      }

      // Calculate breakdown per container type
      const containerBreakdown: ContainerPriceBreakdown[] = [];
      let totalFreight = 0;
      let totalPortAdjustment = 0;
      let maxTransitDays = 0;

      for (const container of containers) {
        const price = priceByType.get(container.type)!;
        const unitPrice = price.basePrice + originAdjustment;
        const containerTotal = unitPrice * container.quantity;

        containerBreakdown.push({
          type: container.type,
          quantity: container.quantity,
          unitPriceUSD: price.basePrice,
          totalPriceUSD: containerTotal,
          freightPrice: price.basePrice * container.quantity,
          portAdjustment: originAdjustment * container.quantity,
        });

        totalFreight += price.basePrice * container.quantity;
        totalPortAdjustment += originAdjustment * container.quantity;
        maxTransitDays = Math.max(maxTransitDays, price.transitDays);
      }

      // Per-line cost overrides
      // Priority: BasePrice override → ShippingLineContainer / TransportRate table → global AdminSettings
      const firstPrice = prices[0];
      const primaryContainerType = containers[0]?.type || containerTypes[0];

      // Port taxes: BasePrice → ShippingLineContainer → AdminSettings
      const slcPortTaxes = slcMap.get(`${shippingLine}__${primaryContainerType}`);
      const linePortTaxes = firstPrice.portTaxes ?? slcPortTaxes ?? portTaxes;

      // Transport: BasePrice → TransportRate → AdminSettings
      const trRate = trMap.get(`${primaryContainerType}__${input.cargoWeight}`);
      const lineTerrestrialTransport =
        firstPrice.terrestrialTransport ?? trRate ?? terrestrialTransport;

      const lineCustomsTaxes = firstPrice.customsTaxes ?? settings.customsTaxes;
      const lineCommission = firstPrice.commission ?? settings.commission;

      // Apply weight surcharges
      const adjustedTerrestrialTransport = lineTerrestrialTransport + terrestrialSurcharge;
      const adjustedFreight = totalFreight + freightSurcharge;

      // Fixed costs are per shipment, not per container
      const totalFixedCosts =
        linePortTaxes +
        lineCustomsTaxes +
        adjustedTerrestrialTransport +
        lineCommission +
        insurance;

      // Total price = container costs + fixed costs
      const totalPriceUSD = adjustedFreight + totalPortAdjustment + totalFixedCosts;

      const portIntermediate = isConstanta ? 'Constanța' : 'Odessa';
      const route = `${input.portOrigin} → ${portIntermediate} → Chișinău`;

      offers.push({
        rank: 0,
        shippingLine,
        basePriceId: prices[0].id, // Use first price ID as reference
        route,
        portOrigin: input.portOrigin,
        portIntermediate,
        portFinal: 'Chișinău',
        freightPrice: adjustedFreight,
        portAdjustment: totalPortAdjustment,
        portTaxes: linePortTaxes,
        customsTaxes: lineCustomsTaxes,
        terrestrialTransport: adjustedTerrestrialTransport,
        commission: lineCommission,
        insurance,
        totalPriceUSD,
        totalPriceMDL: 0,
        containerBreakdown,
        totalContainers: totalContainerCount,
        estimatedTransitDays:
          maxTransitDays > 0
            ? maxTransitDays
            : this.estimateTransitDays(input.portOrigin, input.portDestination),
        availability: this.checkAvailability(readyDate),
      });
    }

    if (offers.length === 0) {
      throw new Error(
        `Nu s-au găsit prețuri pentru toate tipurile de containere selectate (${containerTypes.join(', ')})`
      );
    }

    // 6. Sort by price (lowest first)
    offers.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);

    // 7. Take top 5 and assign ranks
    const top5 = offers.slice(0, 5).map((offer, index) => ({
      ...offer,
      rank: index + 1,
    }));

    // 8. Get exchange rate USD → MDL
    const exchangeRate = await this.getExchangeRate('USD', 'MDL');

    // 9. Convert to MDL
    const withMDL = top5.map((offer) => ({
      ...offer,
      totalPriceMDL: Math.round(offer.totalPriceUSD * exchangeRate * 100) / 100,
    }));

    return {
      offers: withMDL,
      exchangeRate,
      calculatedAt: new Date(),
      totalContainers: totalContainerCount,
      input: {
        ...input,
        portDestination,
        containers,
      },
    };
  }

  /**
   * Fallback to AgentPrice if BasePrice not configured
   */
  private async calculateWithAgentPrices(
    input: CalculatorInput,
    settings: any,
    originAdjustment: number,
    portTaxes: number,
    terrestrialTransport: number,
    insurance: number,
    containers?: ContainerEntry[],
    totalContainerCount?: number,
    freightSurcharge: number = 0,
    terrestrialSurcharge: number = 0
  ): Promise<CalculatorResult> {
    const readyDate = new Date(input.cargoReadyDate);
    const isConstanta =
      input.portDestination.toLowerCase().includes('constanta') ||
      input.portDestination.toLowerCase().includes('constanța');

    const containerList =
      containers && containers.length > 0
        ? containers
        : [{ type: input.containerType, quantity: 1 }];

    const containerTypes = [...new Set(containerList.map((c) => c.type))];
    const totalContainers =
      totalContainerCount || containerList.reduce((sum, c) => sum + c.quantity, 0);

    const agentPrices = await prisma.agentPrice.findMany({
      where: {
        portOrigin: input.portOrigin,
        containerType: { in: containerTypes },
        weightRange: input.cargoWeight,
      },
      include: {
        agent: true,
      },
    });

    if (agentPrices.length === 0) {
      throw new Error(
        `Nu s-au găsit prețuri pentru ${input.portOrigin} → ${input.portDestination}, ${containerTypes.join(', ')}, ${input.cargoWeight}`
      );
    }

    // Group by shipping line
    const pricesByShippingLine = new Map<string, typeof agentPrices>();
    for (const price of agentPrices) {
      if (!pricesByShippingLine.has(price.shippingLine)) {
        pricesByShippingLine.set(price.shippingLine, []);
      }
      pricesByShippingLine.get(price.shippingLine)!.push(price);
    }

    const offers: PriceOffer[] = [];

    for (const [shippingLine, prices] of pricesByShippingLine) {
      const priceByType = new Map<string, (typeof agentPrices)[0]>();
      for (const price of prices) {
        priceByType.set(price.containerType, price);
      }

      // Skip if missing container types
      const missingTypes = containerTypes.filter((t) => !priceByType.has(t));
      if (missingTypes.length > 0) continue;

      // Calculate breakdown
      const containerBreakdown: ContainerPriceBreakdown[] = [];
      let totalFreight = 0;
      let totalPortAdjustment = 0;
      let latestDeparture: Date | null = null;

      for (const container of containerList) {
        const price = priceByType.get(container.type)!;
        const unitPrice = price.freightPrice + originAdjustment;
        const containerTotal = unitPrice * container.quantity;

        containerBreakdown.push({
          type: container.type,
          quantity: container.quantity,
          unitPriceUSD: price.freightPrice,
          totalPriceUSD: containerTotal,
          freightPrice: price.freightPrice * container.quantity,
          portAdjustment: originAdjustment * container.quantity,
        });

        totalFreight += price.freightPrice * container.quantity;
        totalPortAdjustment += originAdjustment * container.quantity;

        if (!latestDeparture || price.departureDate > latestDeparture) {
          latestDeparture = price.departureDate;
        }
      }

      const adjustedTerrestrialTransportAP = terrestrialTransport + terrestrialSurcharge;
      const adjustedFreightAP = totalFreight + freightSurcharge;
      const totalFixedCosts =
        portTaxes +
        settings.customsTaxes +
        adjustedTerrestrialTransportAP +
        settings.commission +
        insurance;
      const totalPriceUSD = adjustedFreightAP + totalPortAdjustment + totalFixedCosts;

      const portIntermediate = isConstanta ? 'Constanța' : 'Odessa';
      const route = `${input.portOrigin} → ${portIntermediate} → Chișinău`;

      offers.push({
        rank: 0,
        shippingLine,
        basePriceId: prices[0].id,
        route,
        portOrigin: input.portOrigin,
        portIntermediate,
        portFinal: 'Chișinău',
        freightPrice: adjustedFreightAP,
        portAdjustment: totalPortAdjustment,
        portTaxes,
        customsTaxes: settings.customsTaxes,
        terrestrialTransport: adjustedTerrestrialTransportAP,
        commission: settings.commission,
        insurance,
        totalPriceUSD,
        totalPriceMDL: 0,
        containerBreakdown,
        totalContainers,
        estimatedTransitDays: this.estimateTransitDays(input.portOrigin, input.portDestination),
        availability: this.checkAvailability(latestDeparture || readyDate),
      });
    }

    if (offers.length === 0) {
      throw new Error(
        `Nu s-au găsit prețuri pentru ${input.portOrigin} → ${input.portDestination}, ${containerTypes.join(', ')}, ${input.cargoWeight}`
      );
    }

    offers.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);

    const top5 = offers.slice(0, 5).map((offer, index) => ({
      ...offer,
      rank: index + 1,
    }));

    const exchangeRate = await this.getExchangeRate('USD', 'MDL');

    const withMDL = top5.map((offer) => ({
      ...offer,
      totalPriceMDL: Math.round(offer.totalPriceUSD * exchangeRate * 100) / 100,
    }));

    return {
      offers: withMDL,
      exchangeRate,
      calculatedAt: new Date(),
      totalContainers,
      input: {
        ...input,
        containers: containerList,
      },
    };
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: CalculatorInput): void {
    if (!input.portOrigin) {
      throw new Error('Portul de origine este obligatoriu');
    }

    if (!input.containerType) {
      throw new Error('Tipul containerului este obligatoriu');
    }

    if (!input.cargoWeight) {
      throw new Error('Greutatea mărfii este obligatorie');
    }

    if (!input.cargoReadyDate) {
      throw new Error('Data pregătirii mărfii este obligatorie');
    }

    // Validate date is in future
    const readyDate = new Date(input.cargoReadyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (readyDate < today) {
      throw new Error('Data pregătirii mărfii trebuie să fie în viitor');
    }
  }

  /**
   * Estimate transit days based on route (fallback)
   */
  private estimateTransitDays(origin: string, destination: string): number {
    const isConstanta = destination.toLowerCase().includes('constanta');
    const estimates: { [key: string]: { constanta: number; odessa: number } } = {
      Shanghai: { constanta: 32, odessa: 30 },
      Qingdao: { constanta: 30, odessa: 28 },
      Ningbo: { constanta: 33, odessa: 31 },
      Shenzhen: { constanta: 35, odessa: 33 },
      Guangzhou: { constanta: 35, odessa: 33 },
      Tianjin: { constanta: 28, odessa: 26 },
      Dalian: { constanta: 26, odessa: 24 },
      Xiamen: { constanta: 34, odessa: 32 },
    };

    const estimate = estimates[origin];
    if (estimate) {
      return isConstanta ? estimate.constanta : estimate.odessa;
    }
    return 30; // Default 30 days
  }

  /**
   * Check availability based on date
   */
  private checkAvailability(date: Date): 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE' {
    const today = new Date();
    const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 14) {
      return 'AVAILABLE';
    } else if (daysUntil > 7) {
      return 'LIMITED';
    } else {
      return 'UNAVAILABLE';
    }
  }

  /**
   * Get exchange rate from external API
   */
  private async getExchangeRate(from: string, to: string): Promise<number> {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate');
      }

      const data = await response.json();
      const rate = data.rates[to];

      if (!rate) {
        throw new Error(`Exchange rate not found for ${from} → ${to}`);
      }

      return rate;
    } catch (error) {
      console.error('Exchange rate error:', error);
      // Fallback to hardcoded rate
      return 18.0;
    }
  }

  /**
   * Get all available origin ports
   */
  async getAvailablePorts(): Promise<string[]> {
    // First try Port model (managed by admin)
    const portModelPorts = await prisma.port.findMany({
      where: { type: 'ORIGIN', isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    if (portModelPorts.length > 0) {
      return portModelPorts.map((p) => p.name);
    }

    // Fallback to BasePrice
    const basePricePorts = await prisma.basePrice.findMany({
      distinct: ['portOrigin'],
      where: { isActive: true },
      select: { portOrigin: true },
    });

    if (basePricePorts.length > 0) {
      return basePricePorts.map((p) => p.portOrigin).sort();
    }

    // Fallback to AgentPrice
    const agentPorts = await prisma.agentPrice.findMany({
      distinct: ['portOrigin'],
      select: { portOrigin: true },
    });

    return agentPorts.map((p) => p.portOrigin).sort();
  }

  /**
   * Get all available destination ports
   */
  async getAvailableDestinations(): Promise<string[]> {
    // First try Port model (managed by admin)
    const portModelPorts = await prisma.port.findMany({
      where: { type: 'DESTINATION', isActive: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    if (portModelPorts.length > 0) {
      return portModelPorts.map((p) => p.name);
    }

    // Fallback to hardcoded destinations
    return ['Constanța', 'Odessa'];
  }

  /**
   * Get all available container types
   */
  async getAvailableContainerTypes(): Promise<string[]> {
    // First try BasePrice
    const basePriceTypes = await prisma.basePrice.findMany({
      distinct: ['containerType'],
      where: { isActive: true },
      select: { containerType: true },
    });

    if (basePriceTypes.length > 0) {
      return basePriceTypes.map((t) => t.containerType).sort();
    }

    // Fallback to AgentPrice
    const agentTypes = await prisma.agentPrice.findMany({
      distinct: ['containerType'],
      select: { containerType: true },
    });

    return agentTypes.map((t) => t.containerType).sort();
  }

  /**
   * Get all available weight ranges
   */
  async getAvailableWeightRanges(): Promise<string[]> {
    const weights = await prisma.agentPrice.findMany({
      distinct: ['weightRange'],
      select: { weightRange: true },
    });

    if (weights.length > 0) {
      return weights.map((w) => w.weightRange).sort();
    }

    // Default weight ranges
    return ['1-5 tone', '5-10 tone', '10-15 tone', '15-20 tone', '20-24 tone'];
  }

  /**
   * Get available shipping lines
   */
  async getAvailableShippingLines(): Promise<string[]> {
    const basePriceLines = await prisma.basePrice.findMany({
      distinct: ['shippingLine'],
      where: { isActive: true },
      select: { shippingLine: true },
    });

    if (basePriceLines.length > 0) {
      return basePriceLines.map((l) => l.shippingLine).sort();
    }

    // Default shipping lines
    return ['MSC', 'Maersk', 'Hapag-Lloyd', 'CMA CGM', 'Cosco', 'Yangming'];
  }

  /**
   * Place order with selected offer
   * Creates booking and sends 3 emails: to supplier, agent, and customer
   * Supports multiple container types
   */
  async placeOrder(data: PlaceOrderRequest, userId: string): Promise<PlaceOrderResult> {
    const { offer, calculatorInput, supplierData } = data;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Utilizator negăsit');
    }

    // Get or create client for this order
    let client = await prisma.client.findFirst({
      where: {
        email: supplierData.supplierEmail,
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          companyName: supplierData.supplierName,
          email: supplierData.supplierEmail,
          phone: supplierData.supplierPhone,
          address: supplierData.supplierAddress,
          contactPerson: supplierData.supplierContact,
        },
      });
    }

    // Normalize containers
    const containers =
      calculatorInput.containers && calculatorInput.containers.length > 0
        ? calculatorInput.containers
        : [{ type: calculatorInput.containerType, quantity: 1 }];

    const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);

    // Generate booking reference (used as id)
    const bookingRef = `PE-${Date.now().toString(36).toUpperCase()}`;

    // Build containers summary for storage
    const containersSummary = containers.map((c) => `${c.quantity}× ${c.type}`).join(', ');

    // Create booking matching the actual Prisma schema
    const booking = await prisma.booking.create({
      data: {
        id: bookingRef,
        clientId: client.id,
        status: 'CONFIRMED',
        shippingLine: offer.shippingLine,
        portOrigin: calculatorInput.portOrigin,
        portDestination: offer.portIntermediate,
        containerType: calculatorInput.containerType, // Primary container type
        cargoCategory: calculatorInput.cargoCategory,
        cargoWeight: calculatorInput.cargoWeight,
        cargoReadyDate: new Date(calculatorInput.cargoReadyDate),
        freightPrice: offer.freightPrice,
        portTaxes: offer.portTaxes,
        customsTaxes: offer.customsTaxes,
        terrestrialTransport: offer.terrestrialTransport,
        commission: offer.commission,
        totalPrice: offer.totalPriceUSD,
        supplierName: supplierData.supplierName,
        supplierPhone: supplierData.supplierPhone,
        supplierEmail: supplierData.supplierEmail,
        supplierAddress: supplierData.supplierAddress,
        internalNotes: [
          supplierData.specialInstructions || '',
          `\n\n--- Containere ---\n${containersSummary}\nTotal: ${totalContainers} containere`,
        ].join(''),
        eta: new Date(
          new Date(calculatorInput.cargoReadyDate).getTime() +
            offer.estimatedTransitDays * 24 * 60 * 60 * 1000
        ),
      },
    });

    // Send emails with containers info
    await sendOrderEmails({
      booking,
      offer,
      supplierData,
      user,
      calculatorInput,
      containers,
      totalContainers,
    });

    return {
      success: true,
      bookingId: booking.id,
      message: `Comanda a fost plasată cu succes. Referința: ${booking.id}`,
    };
  }
}
