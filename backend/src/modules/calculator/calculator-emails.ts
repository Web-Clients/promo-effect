/**
 * Calculator Email Templates
 * Generates HTML email content for order placement notifications
 *
 * Email flow after "Plasează Comanda":
 *   1. Agent (China)  — English, subject: "New Order, Promo Effect, {bookingId}"
 *   2. Client (Moldova) — Romanian, subject: "Comanda dumneavoastră {bookingId} a fost plasată"
 *   3. Supplier (China) — English, informational
 */

import { infobipService } from '../../services/infobip.service';
import prisma from '../../lib/prisma';
import { PriceOffer, CalculatorInput, ContainerEntry, SupplierData } from './calculator.types';
import logger from '../../utils/logger';

interface SendOrderEmailsData {
  booking: any;
  offer: PriceOffer;
  supplierData: SupplierData;
  user: any;
  calculatorInput: CalculatorInput;
  containers?: ContainerEntry[];
  totalContainers?: number;
}

/**
 * Send order emails to agent, client, and supplier after order placement.
 */
export async function sendOrderEmails(data: SendOrderEmailsData): Promise<void> {
  const { booking, offer, supplierData, user, calculatorInput, containers, totalContainers } = data;

  // Format containers for display
  const containersList =
    containers && containers.length > 0
      ? containers
      : [{ type: calculatorInput.containerType, quantity: 1 }];
  const containersHtml = containersList.map((c) => `<li>${c.quantity}× ${c.type}</li>`).join('');
  const containersSummary = containersList.map((c) => `${c.quantity}× ${c.type}`).join(', ');
  const totalContainerCount =
    totalContainers || containersList.reduce((sum, c) => sum + c.quantity, 0);

  const salesEmail = process.env.SALES_EMAIL || process.env.ADMIN_EMAIL || 'office@promo-efect.md';
  const salesPhone = process.env.SALES_PHONE || '+373 69 123 456';

  const cargoReadyFormatted = new Date(calculatorInput.cargoReadyDate).toLocaleDateString('en-GB');
  const etdFormatted = booking.eta
    ? new Date(booking.eta).toLocaleDateString('ro-RO')
    : 'Estimat în funcție de tranzit';

  // ─────────────────────────────────────────────────────────────
  // 1. Email to AGENT (China) — English only, no Chinese
  // ─────────────────────────────────────────────────────────────
  const agent = await prisma.agent.findFirst({
    where: { status: 'ACTIVE' },
    include: { user: true },
  });

  if (agent && agent.user) {
    const agentEmailHtml = buildAgentEmail({
      bookingId: booking.id,
      containerType: calculatorInput.containerType,
      containersSummary,
      totalContainerCount,
      containersHtml,
      cargoDescription: supplierData.cargoDescription,
      cargoWeight: calculatorInput.cargoWeight,
      portOrigin: calculatorInput.portOrigin,
      portDestination: offer.portIntermediate,
      finalDestination: offer.portFinal,
      totalPriceUSD: offer.totalPriceUSD,
      supplierName: supplierData.supplierName,
      supplierAddress: supplierData.supplierAddress,
      supplierContact: supplierData.supplierContact,
      supplierPhone: supplierData.supplierPhone || '',
      supplierEmail: supplierData.supplierEmail || '',
      beneficiaryName: supplierData.beneficiaryName || user.name || user.email,
      beneficiaryAddress: supplierData.beneficiaryAddress || '',
      beneficiaryContact: supplierData.beneficiaryContact || user.name,
      beneficiaryPhone: supplierData.beneficiaryPhone || user.phone || '',
      cargoReadyDate: cargoReadyFormatted,
      specialInstructions: supplierData.specialInstructions,
    });

    try {
      await infobipService.sendEmail({
        to: agent.user.email,
        subject: `New Order, Promo Effect, ${booking.id}`,
        html: agentEmailHtml,
      });
      logger.info(`[Calculator] Agent email sent to ${agent.user.email}`);
    } catch (error) {
      logger.error(`[Calculator] Failed to send agent email:`, error);
    }
  } else {
    logger.warn(`[Calculator] No active agent found — agent email not sent`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Email to CLIENT (Moldovan beneficiary) — Romanian
  // ─────────────────────────────────────────────────────────────
  const clientEmail = supplierData.beneficiaryEmail || user.email;
  const clientName = supplierData.beneficiaryName || user.name || user.email;
  const agentName = agent?.user?.name || agent?.contactName || 'Agentul nostru de transport';

  const clientEmailHtml = buildClientEmail({
    bookingId: booking.id,
    clientName,
    containersSummary,
    cargoDescription: supplierData.cargoDescription,
    portOrigin: calculatorInput.portOrigin,
    portDestination: offer.portIntermediate,
    finalDestination: offer.portFinal,
    totalPriceUSD: offer.totalPriceUSD,
    etd: etdFormatted,
    agentName,
    salesEmail,
    salesPhone,
    containersHtml,
    totalContainerCount,
    freightPrice: offer.freightPrice,
    portTaxes: offer.portTaxes,
    customsTaxes: offer.customsTaxes,
    terrestrialTransport: offer.terrestrialTransport,
    commission: offer.commission,
  });

  try {
    await infobipService.sendEmail({
      to: clientEmail,
      subject: `Comanda dumneavoastră ${booking.id} a fost plasată`,
      html: clientEmailHtml,
    });
    logger.info(`[Calculator] Client email sent to ${clientEmail}`);
  } catch (error) {
    logger.error(`[Calculator] Failed to send client email:`, error);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Email to SUPPLIER (China) — English, informational
  // ─────────────────────────────────────────────────────────────
  if (supplierData.supplierEmail) {
    const supplierEmailHtml = buildSupplierEmail({
      bookingId: booking.id,
      supplierContact: supplierData.supplierContact,
      containersHtml,
      totalContainerCount,
      cargoDescription: supplierData.cargoDescription,
      cargoCategory: calculatorInput.cargoCategory,
      invoiceValue: supplierData.invoiceValue,
      invoiceCurrency: supplierData.invoiceCurrency,
      route: offer.route,
      shippingLine: offer.shippingLine,
      cargoReadyDate: cargoReadyFormatted,
      estimatedTransitDays: offer.estimatedTransitDays,
      specialInstructions: supplierData.specialInstructions,
    });

    try {
      await infobipService.sendEmail({
        to: supplierData.supplierEmail,
        subject: `New Export Order - ${booking.id}`,
        html: supplierEmailHtml,
      });
      logger.info(`[Calculator] Supplier email sent to ${supplierData.supplierEmail}`);
    } catch (error) {
      logger.error(`[Calculator] Failed to send supplier email:`, error);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE BUILDERS
// ─────────────────────────────────────────────────────────────

interface AgentEmailParams {
  bookingId: string;
  containerType: string;
  containersSummary: string;
  totalContainerCount: number;
  containersHtml: string;
  cargoDescription: string;
  cargoWeight: string;
  portOrigin: string;
  portDestination: string;
  finalDestination: string;
  totalPriceUSD: number;
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  supplierPhone: string;
  supplierEmail: string;
  beneficiaryName: string;
  beneficiaryAddress: string;
  beneficiaryContact: string;
  beneficiaryPhone: string;
  cargoReadyDate: string;
  specialInstructions?: string;
}

function buildAgentEmail(p: AgentEmailParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 620px; margin: 0 auto; padding: 20px;">
    <div style="background: #003d7a; color: white; padding: 24px; text-align: center; border-radius: 4px 4px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">New Order — Promo Effect</h1>
      <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">Order Number: <strong>${p.bookingId}</strong></p>
    </div>
    <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e0e0e0;">
      <p>Hello,</p>
      <p>Please organize the following shipment:</p>

      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; width:45%; border:1px solid #ccc;">Order Number</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.bookingId}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Container Type</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.containerType}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Quantity</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.containersSummary} (${p.totalContainerCount} total)</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Cargo Description</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.cargoDescription}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Estimated Weight</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.cargoWeight}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Origin Port</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.portOrigin}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Destination Port</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.portDestination}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Final Destination</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.finalDestination}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Cargo Ready Date</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.cargoReadyDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc; background:#003d7a; color:white;">Confirmed Price</td>
          <td style="padding:8px 12px; border:1px solid #ccc; background:#003d7a; color:white; font-weight:bold;">$${p.totalPriceUSD.toFixed(2)}</td>
        </tr>
      </table>

      <h3 style="color:#003d7a; border-bottom:2px solid #003d7a; padding-bottom:4px;">SUPPLIER (China)</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr>
          <td style="padding:6px 12px; font-weight:bold; width:45%; border:1px solid #ccc;">Company</td>
          <td style="padding:6px 12px; border:1px solid #ccc;">${p.supplierName}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Address</td>
          <td style="padding:6px 12px; border:1px solid #ccc;">${p.supplierAddress}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Contact</td>
          <td style="padding:6px 12px; border:1px solid #ccc;">${p.supplierContact}</td>
        </tr>
        ${p.supplierPhone ? `<tr style="background:#f5f5f5;"><td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Phone</td><td style="padding:6px 12px; border:1px solid #ccc;">${p.supplierPhone}</td></tr>` : ''}
        ${p.supplierEmail ? `<tr><td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Email</td><td style="padding:6px 12px; border:1px solid #ccc;">${p.supplierEmail}</td></tr>` : ''}
      </table>

      <h3 style="color:#003d7a; border-bottom:2px solid #003d7a; padding-bottom:4px;">CONSIGNEE (Moldova)</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr>
          <td style="padding:6px 12px; font-weight:bold; width:45%; border:1px solid #ccc;">Company</td>
          <td style="padding:6px 12px; border:1px solid #ccc;">${p.beneficiaryName}</td>
        </tr>
        ${p.beneficiaryAddress ? `<tr style="background:#f5f5f5;"><td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Address</td><td style="padding:6px 12px; border:1px solid #ccc;">${p.beneficiaryAddress}</td></tr>` : ''}
        <tr>
          <td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Contact</td>
          <td style="padding:6px 12px; border:1px solid #ccc;">${p.beneficiaryContact}</td>
        </tr>
        ${p.beneficiaryPhone ? `<tr style="background:#f5f5f5;"><td style="padding:6px 12px; font-weight:bold; border:1px solid #ccc;">Phone</td><td style="padding:6px 12px; border:1px solid #ccc;">${p.beneficiaryPhone}</td></tr>` : ''}
      </table>

      ${p.specialInstructions ? `<div style="background:#fff3cd; border:1px solid #ffc107; padding:12px; border-radius:4px; margin-bottom:16px;"><strong>Special Instructions:</strong><br>${p.specialInstructions}</div>` : ''}

      <p>Please confirm receipt and proceed with booking the shipment.</p>

      <p>Best regards,<br><strong>Promo Effect Team</strong></p>
    </div>
    <div style="text-align:center; padding:16px; font-size:12px; color:#888;">
      Promo-Efect SRL | Maritime Logistics | promo-efect.md
    </div>
  </div>
</body>
</html>`;
}

interface ClientEmailParams {
  bookingId: string;
  clientName: string;
  containersSummary: string;
  cargoDescription: string;
  portOrigin: string;
  portDestination: string;
  finalDestination: string;
  totalPriceUSD: number;
  etd: string;
  agentName: string;
  salesEmail: string;
  salesPhone: string;
  containersHtml: string;
  totalContainerCount: number;
  freightPrice: number;
  portTaxes: number;
  customsTaxes: number;
  terrestrialTransport: number;
  commission: number;
}

function buildClientEmail(p: ClientEmailParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 620px; margin: 0 auto; padding: 20px;">
    <div style="background: #003d7a; color: white; padding: 24px; text-align: center; border-radius: 4px 4px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">Confirmarea Comenzii</h1>
      <p style="margin: 6px 0 0; opacity: 0.85; font-size: 14px;">Nr. comandă: <strong>${p.bookingId}</strong></p>
    </div>
    <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e0e0e0;">
      <p>Stimate <strong>${p.clientName}</strong>,</p>
      <p>Vă confirmăm plasarea comenzii cu numărul <strong>${p.bookingId}</strong>. Mai jos găsiți toate detaliile.</p>

      <h3 style="color:#003d7a; border-bottom:2px solid #003d7a; padding-bottom:4px;">Detalii Comandă</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; width:45%; border:1px solid #ccc;">Nr. Comandă</td>
          <td style="padding:8px 12px; border:1px solid #ccc;"><strong>${p.bookingId}</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Container</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.containersSummary}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Marfă</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.cargoDescription}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Rută</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.portOrigin} → ${p.portDestination} → ${p.finalDestination}</td>
        </tr>
        <tr style="background:#e8f0fb;">
          <td style="padding:8px 12px; font-weight:bold; border:1px solid #ccc;">Data estimativă plecare</td>
          <td style="padding:8px 12px; border:1px solid #ccc;">${p.etd}</td>
        </tr>
      </table>

      <h3 style="color:#003d7a; border-bottom:2px solid #003d7a; padding-bottom:4px;">Defalcare Costuri</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px; border:1px solid #ccc;">Tarif Maritim</td>
          <td style="padding:8px 12px; border:1px solid #ccc; text-align:right;">$${p.freightPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; border:1px solid #ccc;">Taxe Portuare</td>
          <td style="padding:8px 12px; border:1px solid #ccc; text-align:right;">$${p.portTaxes.toFixed(2)}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px; border:1px solid #ccc;">Taxe Vamale</td>
          <td style="padding:8px 12px; border:1px solid #ccc; text-align:right;">$${p.customsTaxes.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; border:1px solid #ccc;">Transport Terestru</td>
          <td style="padding:8px 12px; border:1px solid #ccc; text-align:right;">$${p.terrestrialTransport.toFixed(2)}</td>
        </tr>
        <tr style="background:#f5f5f5;">
          <td style="padding:8px 12px; border:1px solid #ccc;">Comision</td>
          <td style="padding:8px 12px; border:1px solid #ccc; text-align:right;">$${p.commission.toFixed(2)}</td>
        </tr>
        <tr style="background:#003d7a; color:white; font-weight:bold;">
          <td style="padding:10px 12px; border:1px solid #003d7a;">TOTAL</td>
          <td style="padding:10px 12px; border:1px solid #003d7a; text-align:right;">$${p.totalPriceUSD.toFixed(2)}</td>
        </tr>
      </table>

      <div style="background:#e8f4e8; border:1px solid #4caf50; padding:14px; border-radius:4px; margin-bottom:16px;">
        <p style="margin:0;">Agentul nostru de transport (<strong>${p.agentName}</strong>) a primit comanda și va organiza încărcarea. Veți fi notificat despre stadiul transportului.</p>
      </div>

      <p>Pentru orice întrebări, contactați-ne:</p>
      <ul>
        <li>Email: <a href="mailto:${p.salesEmail}">${p.salesEmail}</a></li>
        <li>Telefon: ${p.salesPhone}</li>
      </ul>

      <p>Cu stimă,<br><strong>Echipa Promo Effect</strong><br>
      <a href="https://promo-efect.md">promo-efect.md</a></p>
    </div>
    <div style="text-align:center; padding:16px; font-size:12px; color:#888;">
      Promo-Efect SRL | Logistică Maritimă<br>
      Acest email a fost generat automat la plasarea comenzii dvs.
    </div>
  </div>
</body>
</html>`;
}

interface SupplierEmailParams {
  bookingId: string;
  supplierContact: string;
  containersHtml: string;
  totalContainerCount: number;
  cargoDescription: string;
  cargoCategory: string;
  invoiceValue?: number;
  invoiceCurrency?: string;
  route: string;
  shippingLine: string;
  cargoReadyDate: string;
  estimatedTransitDays: number;
  specialInstructions?: string;
}

function buildSupplierEmail(p: SupplierEmailParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 620px; margin: 0 auto; padding: 20px;">
    <div style="background: #003d7a; color: white; padding: 24px; text-align: center; border-radius: 4px 4px 0 0;">
      <h1 style="margin: 0; font-size: 20px;">New Export Order</h1>
    </div>
    <div style="padding: 24px; background: #f9f9f9; border: 1px solid #e0e0e0;">
      <p>Dear ${p.supplierContact},</p>
      <p>A new export order (ref: <strong>${p.bookingId}</strong>) has been placed for your cargo. Our agent will contact you to arrange pickup and documentation.</p>

      <h3>Order Details:</h3>
      <ul>
        <li><strong>Reference:</strong> ${p.bookingId}</li>
        <li><strong>Route:</strong> ${p.route}</li>
        <li><strong>Shipping Line:</strong> ${p.shippingLine}</li>
        <li><strong>Cargo Ready Date:</strong> ${p.cargoReadyDate}</li>
        <li><strong>Estimated Transit:</strong> ${p.estimatedTransitDays} days</li>
      </ul>

      <h3>Containers (${p.totalContainerCount} total):</h3>
      <ul>${p.containersHtml}</ul>

      <h3>Cargo Information:</h3>
      <ul>
        <li><strong>Description:</strong> ${p.cargoDescription}</li>
        <li><strong>HS Code:</strong> ${p.cargoCategory}</li>
        ${p.invoiceValue ? `<li><strong>Invoice Value:</strong> ${p.invoiceValue} ${p.invoiceCurrency || 'USD'}</li>` : ''}
      </ul>

      ${p.specialInstructions ? `<h3>Special Instructions:</h3><p>${p.specialInstructions}</p>` : ''}

      <p>Best regards,<br><strong>Promo-Efect Team</strong></p>
    </div>
    <div style="text-align:center; padding:16px; font-size:12px; color:#888;">
      Promo-Efect SRL | Maritime Logistics
    </div>
  </div>
</body>
</html>`;
}
