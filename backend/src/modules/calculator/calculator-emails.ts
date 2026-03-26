/**
 * Calculator Email Templates
 * Generates HTML email content for order placement notifications
 */

import { infobipService } from '../../services/infobip.service';
import prisma from '../../lib/prisma';
import { PriceOffer, CalculatorInput, ContainerEntry, SupplierData } from './calculator.types';

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
 * Send order emails to supplier, agent, and customer
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
    await infobipService.sendEmail({
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
      await infobipService.sendEmail({
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
    await infobipService.sendEmail({
      to: user.email,
      subject: `Confirmarea Comenzii - ${booking.id}`,
      html: customerEmailHtml,
    });
    console.log(`[Calculator] ✅ Customer email sent to ${user.email}`);
  } catch (error) {
    console.error(`[Calculator] ❌ Failed to send customer email:`, error);
  }
}
