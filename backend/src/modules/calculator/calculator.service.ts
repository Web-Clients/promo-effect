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
import nodemailer from 'nodemailer';

// Container entry for multiple containers
export interface ContainerEntry {
  type: string;
  quantity: number;
}

export interface CalculatorInput {
  portOrigin: string;
  portDestination: string; // Constanta or Odessa
  containerType: string; // Primary container type (backward compatibility)
  containers?: ContainerEntry[]; // Multiple containers support
  cargoCategory: string;
  cargoWeight: string;
  cargoReadyDate: string; // ISO date string
  includeInsurance?: boolean;
}

// Price breakdown per container type
export interface ContainerPriceBreakdown {
  type: string;
  quantity: number;
  unitPriceUSD: number;
  totalPriceUSD: number;
  freightPrice: number;
  portAdjustment: number;
}

export interface PriceOffer {
  rank: number;
  shippingLine: string;
  basePriceId: string;

  // Route info
  route: string; // "Shanghai → Constanța → Chișinău"
  portOrigin: string;
  portIntermediate: string; // Constanta or Odessa
  portFinal: string; // Chișinău

  // Price breakdown (aggregate for all containers)
  freightPrice: number;
  portAdjustment: number;
  portTaxes: number;
  customsTaxes: number;
  terrestrialTransport: number;
  commission: number;
  insurance: number;

  totalPriceUSD: number;
  totalPriceMDL: number;

  // Multiple containers support
  containerBreakdown?: ContainerPriceBreakdown[];
  totalContainers?: number;

  estimatedTransitDays: number;
  availability: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
}

export interface CalculatorResult {
  offers: PriceOffer[];
  exchangeRate: number;
  calculatedAt: Date;
  totalContainers: number;
  input: CalculatorInput;
}

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
    const containers: ContainerEntry[] = input.containers && input.containers.length > 0
      ? input.containers.filter(c => c.quantity > 0)
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
    const isConstanta = portDestination.toLowerCase().includes('constanta') ||
                        portDestination.toLowerCase().includes('constanța');

    const portTaxes = isConstanta
      ? settings.portTaxesConstanta
      : settings.portTaxesOdessa;

    const terrestrialTransport = isConstanta
      ? settings.terrestrialTransportConstanta
      : settings.terrestrialTransportOdessa;

    const insurance = input.includeInsurance ? settings.insuranceCost : 0;

    // 4. Query BasePrice for ALL container types
    const containerTypes = [...new Set(containers.map(c => c.type))];

    const basePrices = await prisma.basePrice.findMany({
      where: {
        portOrigin: input.portOrigin,
        portDestination: {
          contains: isConstanta ? 'Constanta' : 'Odessa',
          mode: 'insensitive',
        },
        containerType: { in: containerTypes },
        isActive: true,
        validFrom: { lte: readyDate },
        validUntil: { gte: readyDate },
      },
    });

    // If no prices found in BasePrice, fall back to AgentPrice
    if (basePrices.length === 0) {
      return this.calculateWithAgentPrices(input, settings, originAdjustment, portTaxes, terrestrialTransport, insurance, containers, totalContainerCount);
    }

    // Group base prices by shipping line
    const pricesByShippingLine = new Map<string, typeof basePrices>();
    for (const price of basePrices) {
      if (!pricesByShippingLine.has(price.shippingLine)) {
        pricesByShippingLine.set(price.shippingLine, []);
      }
      pricesByShippingLine.get(price.shippingLine)!.push(price);
    }

    // 5. Calculate total price for each shipping line across all container types
    const offers: PriceOffer[] = [];

    for (const [shippingLine, prices] of pricesByShippingLine) {
      // Build price map by container type for this shipping line
      const priceByType = new Map<string, typeof basePrices[0]>();
      for (const price of prices) {
        priceByType.set(price.containerType, price);
      }

      // Check if we have prices for all requested container types
      const missingTypes = containerTypes.filter(t => !priceByType.has(t));
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

      // Fixed costs are per shipment, not per container
      const totalFixedCosts = portTaxes + settings.customsTaxes + terrestrialTransport + settings.commission + insurance;

      // Total price = container costs + fixed costs
      const totalPriceUSD = totalFreight + totalPortAdjustment + totalFixedCosts;

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
        freightPrice: totalFreight,
        portAdjustment: totalPortAdjustment,
        portTaxes,
        customsTaxes: settings.customsTaxes,
        terrestrialTransport,
        commission: settings.commission,
        insurance,
        totalPriceUSD,
        totalPriceMDL: 0,
        containerBreakdown,
        totalContainers: totalContainerCount,
        estimatedTransitDays: maxTransitDays,
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
    totalContainerCount?: number
  ): Promise<CalculatorResult> {
    const readyDate = new Date(input.cargoReadyDate);
    const isConstanta = input.portDestination.toLowerCase().includes('constanta') ||
                        input.portDestination.toLowerCase().includes('constanța');

    // Use containers if provided, otherwise single containerType
    const containerList = containers && containers.length > 0
      ? containers
      : [{ type: input.containerType, quantity: 1 }];

    const containerTypes = [...new Set(containerList.map(c => c.type))];
    const totalContainers = totalContainerCount || containerList.reduce((sum, c) => sum + c.quantity, 0);

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
      const priceByType = new Map<string, typeof agentPrices[0]>();
      for (const price of prices) {
        priceByType.set(price.containerType, price);
      }

      // Skip if missing container types
      const missingTypes = containerTypes.filter(t => !priceByType.has(t));
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

      const totalFixedCosts = portTaxes + settings.customsTaxes + terrestrialTransport + settings.commission + insurance;
      const totalPriceUSD = totalFreight + totalPortAdjustment + totalFixedCosts;

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
        freightPrice: totalFreight,
        portAdjustment: totalPortAdjustment,
        portTaxes,
        customsTaxes: settings.customsTaxes,
        terrestrialTransport,
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
    const daysUntil = Math.floor(
      (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

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
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${from}`
      );

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
    // First try BasePrice
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
    const containers = calculatorInput.containers && calculatorInput.containers.length > 0
      ? calculatorInput.containers
      : [{ type: calculatorInput.containerType, quantity: 1 }];

    const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);

    // Generate booking reference (used as id)
    const bookingRef = `PE-${Date.now().toString(36).toUpperCase()}`;

    // Build containers summary for storage
    const containersSummary = containers.map(c => `${c.quantity}× ${c.type}`).join(', ');

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
    await this.sendOrderEmails({
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

  /**
   * Send order emails to supplier, agent, and customer
   */
  private async sendOrderEmails(data: {
    booking: any;
    offer: PriceOffer;
    supplierData: SupplierData;
    user: any;
    calculatorInput: CalculatorInput;
    containers?: ContainerEntry[];
    totalContainers?: number;
  }) {
    const { booking, offer, supplierData, user, calculatorInput, containers, totalContainers } = data;

    // Format containers for display
    const containersList = containers && containers.length > 0
      ? containers
      : [{ type: calculatorInput.containerType, quantity: 1 }];
    const containersHtml = containersList.map(c => `<li>${c.quantity}× ${c.type}</li>`).join('');
    const containersSummary = containersList.map(c => `${c.quantity}× ${c.type}`).join(', ');
    const totalContainerCount = totalContainers || containersList.reduce((sum, c) => sum + c.quantity, 0);

    const transporter = this.getEmailTransporter();
    if (!transporter) {
      console.log('[Calculator] Email transporter not configured, logging emails to console');
      console.log('=== SUPPLIER EMAIL ===');
      console.log(`To: ${supplierData.supplierEmail}`);
      console.log(`Subject: Nouă comandă de export - ${booking.id}`);
      console.log('=== AGENT EMAIL ===');
      console.log(`Subject: Nouă rezervare pentru procesare - ${booking.id}`);
      console.log('=== CUSTOMER EMAIL ===');
      console.log(`To: ${user.email}`);
      console.log(`Subject: Confirmarea comenzii - ${booking.id}`);
      return;
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@promo-efect.md';
    const fromName = process.env.SMTP_FROM_NAME || 'Promo-Efect';

    // 1. Email to supplier (in English)
    const supplierEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0066CC; color: white; padding: 20px; text-align: center;">
            <h1>New Export Order</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Dear ${supplierData.supplierContact},</p>
            <p>We are pleased to inform you that a new export order has been placed for your cargo:</p>

            <h3>Order Details:</h3>
            <ul>
              <li><strong>Reference:</strong> ${booking.id}</li>
              <li><strong>Route:</strong> ${offer.route}</li>
              <li><strong>Shipping Line:</strong> ${offer.shippingLine}</li>
              <li><strong>Cargo Ready Date:</strong> ${new Date(calculatorInput.cargoReadyDate).toLocaleDateString()}</li>
              <li><strong>Estimated Transit:</strong> ${offer.estimatedTransitDays} days</li>
            </ul>

            <h3>Containers (${totalContainerCount} total):</h3>
            <ul>${containersHtml}</ul>

            <h3>Cargo Information:</h3>
            <ul>
              <li><strong>Description:</strong> ${supplierData.cargoDescription}</li>
              <li><strong>HS Code:</strong> ${calculatorInput.cargoCategory}</li>
              <li><strong>Invoice Value:</strong> ${supplierData.invoiceValue} ${supplierData.invoiceCurrency}</li>
            </ul>

            ${supplierData.specialInstructions ? `<h3>Special Instructions:</h3><p>${supplierData.specialInstructions}</p>` : ''}

            <p>Our agent will contact you shortly to arrange pickup and documentation.</p>

            <p>Best regards,<br>Promo-Efect Team</p>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
            <p>Promo-Efect SRL | Maritime Logistics</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: supplierData.supplierEmail,
        subject: `New Export Order - ${booking.id}`,
        html: supplierEmailHtml,
      });
      console.log(`[Calculator] ✅ Supplier email sent to ${supplierData.supplierEmail}`);
    } catch (error) {
      console.error(`[Calculator] ❌ Failed to send supplier email:`, error);
    }

    // 2. Email to agent (find an active agent)
    const agent = await prisma.agent.findFirst({
      where: {
        status: 'ACTIVE',
      },
      include: {
        user: true,
      },
    });

    if (agent && agent.user) {
      const agentEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0066CC; color: white; padding: 20px; text-align: center;">
              <h1>新出口订单 / New Export Order</h1>
            </div>
            <div style="padding: 20px; background: #f9f9f9;">
              <h3>订单详情 / Order Details:</h3>
              <ul>
                <li><strong>参考号 / Reference:</strong> ${booking.id}</li>
                <li><strong>路线 / Route:</strong> ${offer.route}</li>
                <li><strong>船公司 / Shipping Line:</strong> ${offer.shippingLine}</li>
                <li><strong>货物准备日期 / Cargo Ready:</strong> ${new Date(calculatorInput.cargoReadyDate).toLocaleDateString()}</li>
              </ul>

              <h3>集装箱 / Containers (${totalContainerCount}):</h3>
              <ul>${containersHtml}</ul>

              <h3>供应商信息 / Supplier Info:</h3>
              <ul>
                <li><strong>公司 / Company:</strong> ${supplierData.supplierName}</li>
                <li><strong>联系人 / Contact:</strong> ${supplierData.supplierContact}</li>
                <li><strong>地址 / Address:</strong> ${supplierData.supplierAddress}</li>
                <li><strong>电话 / Phone:</strong> ${supplierData.supplierPhone}</li>
                <li><strong>邮箱 / Email:</strong> ${supplierData.supplierEmail}</li>
              </ul>

              <h3>货物信息 / Cargo Info:</h3>
              <ul>
                <li><strong>描述 / Description:</strong> ${supplierData.cargoDescription}</li>
                <li><strong>HS编码 / HS Code:</strong> ${calculatorInput.cargoCategory}</li>
                <li><strong>发票金额 / Invoice:</strong> ${supplierData.invoiceValue} ${supplierData.invoiceCurrency}</li>
              </ul>

              ${supplierData.specialInstructions ? `<h3>特殊说明 / Special Instructions:</h3><p>${supplierData.specialInstructions}</p>` : ''}

              <p>请尽快联系供应商安排提货。/ Please contact supplier to arrange pickup.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: agent.user.email,
          subject: `新订单 / New Order - ${booking.id}`,
          html: agentEmailHtml,
        });
        console.log(`[Calculator] ✅ Agent email sent to ${agent.user.email}`);
      } catch (error) {
        console.error(`[Calculator] ❌ Failed to send agent email:`, error);
      }
    } else {
      console.log(`[Calculator] ⚠️ No agent found for port ${calculatorInput.portOrigin}`);
    }

    // 3. Email to customer (in Romanian)
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0066CC; color: white; padding: 20px; text-align: center;">
            <h1>Confirmarea Comenzii</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Stimate ${user.name || user.email},</p>
            <p>Comanda dvs. a fost plasată cu succes. Mai jos găsiți detaliile:</p>

            <h3>Detalii Comandă:</h3>
            <ul>
              <li><strong>Referință:</strong> ${booking.id}</li>
              <li><strong>Rută:</strong> ${offer.route}</li>
              <li><strong>Linie Maritimă:</strong> ${offer.shippingLine}</li>
              <li><strong>Data Pregătirii:</strong> ${new Date(calculatorInput.cargoReadyDate).toLocaleDateString('ro-RO')}</li>
              <li><strong>Tranzit Estimat:</strong> ${offer.estimatedTransitDays} zile</li>
            </ul>

            <h3>Containere (${totalContainerCount} total):</h3>
            <ul>${containersHtml}</ul>

            <h3>Detalii Furnizor:</h3>
            <ul>
              <li><strong>Nume:</strong> ${supplierData.supplierName}</li>
              <li><strong>Contact:</strong> ${supplierData.supplierContact}</li>
              <li><strong>Adresă:</strong> ${supplierData.supplierAddress}</li>
            </ul>

            <h3>Defalcare Costuri:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background: #eee;">
                <td style="padding: 8px; border: 1px solid #ddd;">Tarif Maritim (${containersSummary})</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.freightPrice.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Taxe Portuare</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.portTaxes.toFixed(2)}</td>
              </tr>
              <tr style="background: #eee;">
                <td style="padding: 8px; border: 1px solid #ddd;">Taxe Vamale</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.customsTaxes.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Transport Terestru</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.terrestrialTransport.toFixed(2)}</td>
              </tr>
              <tr style="background: #eee;">
                <td style="padding: 8px; border: 1px solid #ddd;">Comision</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.commission.toFixed(2)}</td>
              </tr>
              <tr style="background: #0066CC; color: white; font-weight: bold;">
                <td style="padding: 8px; border: 1px solid #ddd;">TOTAL</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${offer.totalPriceUSD.toFixed(2)}</td>
              </tr>
            </table>

            <p style="margin-top: 20px;">Veți fi notificat despre stadiul comenzii dvs. Puteți urmări transportul în contul dvs.</p>

            <p>Cu stimă,<br>Echipa Promo-Efect</p>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
            <p>Promo-Efect SRL | Logistică Maritimă</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: user.email,
        subject: `Confirmarea Comenzii - ${booking.id}`,
        html: customerEmailHtml,
      });
      console.log(`[Calculator] ✅ Customer email sent to ${user.email}`);
    } catch (error) {
      console.error(`[Calculator] ❌ Failed to send customer email:`, error);
    }
  }

  /**
   * Get email transporter for sending order emails
   */
  private getEmailTransporter(): nodemailer.Transporter | null {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

    if (!smtpHost && !smtpUser) {
      return null;
    }

    // Auto-detect Gmail
    if (smtpUser?.endsWith('@gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
    }

    // Custom SMTP
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPassword ? {
        user: smtpUser,
        pass: smtpPassword,
      } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
}

// Interfaces for order placement
export interface SupplierData {
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierEmail: string;
  supplierPhone: string;
  cargoDescription: string;
  invoiceValue: number;
  invoiceCurrency: string;
  specialInstructions?: string;
}

export interface PlaceOrderRequest {
  offerId: string;
  offer: PriceOffer;
  calculatorInput: CalculatorInput;
  supplierData: SupplierData;
}

export interface PlaceOrderResult {
  success: boolean;
  bookingId: string;
  message: string;
}
