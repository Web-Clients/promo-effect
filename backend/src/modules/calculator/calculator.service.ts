/**
 * Calculator Service v3
 * Calculates shipping prices for ALL shipping lines and returns top 5 sorted by price
 * Refactored: logic split into engine / incoterms / routes / validation modules
 *
 * Uses:
 * - BasePrice: Base freight prices per shipping line
 * - PortAdjustment: Additional costs per origin port
 * - AdminSettings: Fixed costs (port taxes, customs, transport, commission)
 */

import prisma from '../../lib/prisma';
import { generateBookingId } from '../../utils/booking-id.util';
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
import {
  computeFromBasePrices,
  computeFromAgentPrices,
  finalizeOffers,
  getExchangeRate,
  ExtendedCalculatorInput,
} from './calculator-engine';
import { validateCalculatorInput } from './calculator-validation';
import { estimateTransitDays, checkAvailability } from './calculator-routes';

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
   * Delegates to calculator-engine.ts for core computation
   */
  async calculatePrices(input: CalculatorInput): Promise<CalculatorResult> {
    // Validate input
    this.validateInput(input);

    const extInput = input as ExtendedCalculatorInput;
    const portDestination = extInput.portDestination || 'Constanta';

    // Normalize containers
    const containers: ContainerEntry[] =
      extInput.containers && extInput.containers.length > 0
        ? extInput.containers.filter((c) => c.quantity > 0)
        : [{ type: extInput.containerType, quantity: 1 }];

    const totalContainerCount = containers.reduce((sum, c) => sum + c.quantity, 0);

    // 1. Get admin settings
    const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new Error('Admin settings not configured. Please contact administrator.');
    }

    // 2. Port adjustment for origin
    const portAdjustment = await prisma.portAdjustment.findUnique({
      where: { portName: extInput.portOrigin },
    });
    const originAdjustment = portAdjustment?.adjustment || 0;

    // 3. Fixed costs based on destination
    const isConstanta =
      portDestination.toLowerCase().includes('constanta') ||
      portDestination.toLowerCase().includes('constanța');

    const portTaxes = isConstanta ? settings.portTaxesConstanta : settings.portTaxesOdessa;
    const terrestrialTransport = isConstanta
      ? settings.terrestrialTransportConstanta
      : settings.terrestrialTransportOdessa;
    const insurance = extInput.includeInsurance ? settings.insuranceCost : 0;

    // 3b. Weight surcharges
    let freightSurcharge = 0;
    let terrestrialSurcharge = 0;
    try {
      const weightRanges = JSON.parse(settings.weightRanges || '[]');
      if (Array.isArray(weightRanges) && extInput.cargoWeight) {
        const matchedRange = weightRanges.find(
          (r: any) => r.enabled && r.label === extInput.cargoWeight
        );
        if (matchedRange) {
          freightSurcharge = matchedRange.freightSurcharge || 0;
          terrestrialSurcharge = matchedRange.terrestrialSurcharge || 0;
        }
      }
    } catch {
      // Invalid weight ranges JSON, skip surcharges
    }

    const commonArgs: [
      ExtendedCalculatorInput,
      any,
      number,
      number,
      number,
      number,
      ContainerEntry[],
      number,
      number,
      number,
    ] = [
      extInput,
      settings,
      originAdjustment,
      portTaxes,
      terrestrialTransport,
      insurance,
      containers,
      totalContainerCount,
      freightSurcharge,
      terrestrialSurcharge,
    ];

    // 4. Try BasePrice, fall back to AgentPrice
    let offers = await computeFromBasePrices(...commonArgs);

    if (offers.length === 0) {
      offers = await computeFromAgentPrices(...commonArgs);
    }

    if (offers.length === 0) {
      throw new Error(
        `Nu s-au găsit prețuri pentru combinația selectată (${extInput.portOrigin} → ${portDestination}, containere: ${containers.map((c) => c.type).join(', ')})`
      );
    }

    const exchangeRate = await getExchangeRate('USD', 'MDL');
    return finalizeOffers(offers, exchangeRate, totalContainerCount, extInput);
  }

  /**
   * Validate input parameters — delegates to calculator-validation.ts
   */
  private validateInput(input: CalculatorInput): void {
    validateCalculatorInput(input);
  }

  /**
   * Estimate transit days — delegates to calculator-routes.ts
   */
  private estimateTransitDays(origin: string, destination: string): number {
    return estimateTransitDays(origin, destination);
  }

  /**
   * Check availability — delegates to calculator-routes.ts
   */
  private checkAvailability(date: Date): 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE' {
    return checkAvailability(date);
  }

  /**
   * Get exchange rate — delegates to calculator-engine.ts
   */
  private async getExchangeRate(from: string, to: string): Promise<number> {
    return getExchangeRate(from, to);
  }

  /**
   * Get all available origin ports.
   * Single source of truth: PortPricingMatrix (managed in Admin → Matrice Ajustări Porturi).
   * Falls back to Port model, then BasePrice, then AgentPrice for backward compatibility.
   */
  async getAvailablePorts(): Promise<string[]> {
    // Primary source: PortPricingMatrix (admin-managed, covers all China ports)
    const matrixPorts = await prisma.portPricingMatrix.findMany({
      select: { portName: true },
      distinct: ['portName'],
      orderBy: { portName: 'asc' },
    });

    if (matrixPorts.length > 0) {
      // Merge with Port model ports to keep any manually added ORIGIN ports too
      const portModelPorts = await prisma.port.findMany({
        where: { type: 'ORIGIN', isActive: true },
        select: { name: true },
      });
      const combined = new Set([
        ...matrixPorts.map((p) => p.portName),
        ...portModelPorts.map((p) => p.name),
      ]);
      return Array.from(combined).sort((a, b) => a.localeCompare(b));
    }

    // Fallback to Port model (managed by admin)
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

    // Resolve client:
    // 1. If clientId is provided (selected from dropdown), use it directly
    // 2. Else fall back to finding/creating by supplierEmail (legacy)
    let clientId: string;

    // BENEFICIAR (Moldovan client receiving cargo) — STRICT: never confuse with FURNIZOR (Chinese supplier).
    if (supplierData.clientId) {
      // Path 1: User selected existing beneficiary from dropdown (preferred)
      const existingClient = await prisma.client.findUnique({
        where: { id: supplierData.clientId },
      });
      if (!existingClient) {
        throw new Error('Beneficiarul selectat nu a fost găsit');
      }
      clientId = existingClient.id;
    } else if (supplierData.beneficiaryName) {
      // Path 2: User entered new beneficiary inline — create with BENEFICIARY data (NOT supplier data)
      const beneficiaryEmail = supplierData.beneficiaryEmail || user.email;
      let client = await prisma.client.findFirst({
        where: { companyName: supplierData.beneficiaryName },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            companyName: supplierData.beneficiaryName,
            email: beneficiaryEmail,
            phone: supplierData.beneficiaryPhone || '',
            contactPerson: supplierData.beneficiaryContact || user.name,
            address: supplierData.beneficiaryAddress,
          },
        });
      }
      clientId = client.id;
    } else {
      // Path 3: Fallback — use the ordering user as the client (their own company orders)
      const userClient = await prisma.client.findFirst({
        where: { email: user.email },
      });
      if (userClient) {
        clientId = userClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            companyName: user.company || user.name,
            email: user.email,
            phone: '',
            contactPerson: user.name,
          },
        });
        clientId = newClient.id;
      }
    }

    // Normalize containers
    const containers =
      calculatorInput.containers && calculatorInput.containers.length > 0
        ? calculatorInput.containers
        : [{ type: calculatorInput.containerType, quantity: 1 }];

    const totalContainers = containers.reduce((sum, c) => sum + c.quantity, 0);

    // Generate booking reference using MDPE nomenclator
    const bookingRef = await generateBookingId();

    // Build containers summary for storage
    const containersSummary = containers.map((c) => `${c.quantity}× ${c.type}`).join(', ');

    // Create booking matching the actual Prisma schema
    const booking = await prisma.booking.create({
      data: {
        id: bookingRef,
        clientId,
        agentId: supplierData.agentId || undefined,
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
        beneficiaryName: supplierData.beneficiaryName,
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
