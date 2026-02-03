/**
 * Report Export Service
 * 
 * Handles export of reports to various formats: PDF, Excel, CSV
 */

import PDFDocument from 'pdfkit';
// XLSX removed - Excel/CSV export disabled

// Type for PDFDocument instance
type PDFDoc = InstanceType<typeof PDFDocument>;

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  reportType: 'containers' | 'financial' | 'client-performance' | 'operational';
  data: any;
  title?: string;
  filename?: string;
}

// Simple CSV generator without xlsx library
function arrayToCSV(data: any[][]): string {
  return data.map(row => 
    row.map(cell => {
      const str = String(cell || '');
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
}

export class ReportExportService {
  /**
   * Export report to requested format
   */
  async exportReport(options: ExportOptions): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(options);
      case 'excel':
        return this.exportToExcel(options);
      case 'csv':
        return this.exportToCSV(options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(options: ExportOptions): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: options.title || 'Report',
            Author: 'Promo-Efect Logistics Platform',
            Subject: `${options.reportType} Report`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => {
          resolve({
            buffer: Buffer.concat(buffers),
            filename: options.filename || `${options.reportType}-report.pdf`,
            contentType: 'application/pdf',
          });
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('PROMO-EFECT', 50, 50);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text('Logistics & Shipping Solutions', 50, 78);

        // Report title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#111827')
           .text(options.title || `${options.reportType.toUpperCase()} Report`, 50, 110);

        // Date
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#6b7280')
           .text(`Generated: ${new Date().toLocaleDateString('ro-RO')}`, 50, 140);

        let yPos = 180;

        // Generate content based on report type
        switch (options.reportType) {
          case 'containers':
            this.generateContainersPDF(doc, options.data, yPos);
            break;
          case 'financial':
            this.generateFinancialPDF(doc, options.data, yPos);
            break;
          case 'client-performance':
            this.generateClientPerformancePDF(doc, options.data, yPos);
            break;
          case 'operational':
            this.generateOperationalPDF(doc, options.data, yPos);
            break;
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate containers report PDF
   */
  private generateContainersPDF(doc: PDFDoc, data: any, startY: number) {
    let yPos = startY;

    // Statistics
    if (data.statistics) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Statistici', 50, yPos);
      yPos += 25;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151')
         .text(`Total containere: ${data.statistics.total}`, 50, yPos);
      yPos += 20;

      if (data.statistics.byStatus) {
        doc.text('După status:', 50, yPos);
        yPos += 15;
        Object.entries(data.statistics.byStatus).forEach(([status, count]) => {
          doc.text(`  ${status}: ${count}`, 60, yPos);
          yPos += 15;
        });
        yPos += 10;
      }
    }

    // Data table
    if (data.data && data.data.length > 0) {
      yPos += 20;
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Containere', 50, yPos);
      yPos += 25;

      // Table header
      doc.fillColor('#f3f4f6')
         .rect(50, yPos, 495, 25)
         .fill();

      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor('#374151')
         .text('Container', 55, yPos + 8)
         .text('Client', 150, yPos + 8)
         .text('Status', 300, yPos + 8)
         .text('ETA', 400, yPos + 8);

      yPos += 25;

      // Table rows (limit to 30 for PDF)
      const rows = data.data.slice(0, 30);
      doc.font('Helvetica').fontSize(9);

      rows.forEach((container: any, index: number) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }

        const rowColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
        doc.fillColor(rowColor)
           .rect(50, yPos, 495, 20)
           .fill();

        doc.fillColor('#111827')
           .text(container.containerNumber || 'N/A', 55, yPos + 5)
           .text(container.booking?.client?.companyName || 'N/A', 150, yPos + 5, { width: 140 })
           .text(container.currentStatus || 'N/A', 300, yPos + 5, { width: 90 })
           .text(container.eta ? new Date(container.eta).toLocaleDateString('ro-RO') : 'N/A', 400, yPos + 5);

        yPos += 20;
      });

      if (data.data.length > 30) {
        yPos += 10;
        doc.fontSize(9)
           .fillColor('#6b7280')
           .text(`... și încă ${data.data.length - 30} containere`, 50, yPos);
      }
    }
  }

  /**
   * Generate financial report PDF
   */
  private generateFinancialPDF(doc: PDFDoc, data: any, startY: number) {
    let yPos = startY;

    // Summary
    if (data.summary) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Sumar', 50, yPos);
      yPos += 25;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151')
         .text(`Total facturat: ${data.summary.totalInvoiced.toFixed(2)} ${data.currency || 'MDL'}`, 50, yPos);
      yPos += 15;
      doc.text(`Total plătit: ${data.summary.totalPaid.toFixed(2)} ${data.currency || 'MDL'}`, 50, yPos);
      yPos += 15;
      doc.text(`Rest de plată: ${data.summary.totalOutstanding.toFixed(2)} ${data.currency || 'MDL'}`, 50, yPos);
      yPos += 15;
      doc.text(`Total facturi: ${data.summary.totalInvoices}`, 50, yPos);
      yPos += 25;
    }

    // By period
    if (data.byPeriod && data.byPeriod.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('După perioadă', 50, yPos);
      yPos += 25;

      // Table header
      doc.fillColor('#f3f4f6')
         .rect(50, yPos, 495, 25)
         .fill();

      doc.font('Helvetica-Bold')
         .fontSize(9)
         .fillColor('#374151')
         .text('Perioadă', 55, yPos + 8)
         .text('Facturat', 200, yPos + 8, { align: 'right' })
         .text('Plătit', 320, yPos + 8, { align: 'right' })
         .text('Rest', 440, yPos + 8, { align: 'right' });

      yPos += 25;

      doc.font('Helvetica').fontSize(9);

      data.byPeriod.forEach((period: any, index: number) => {
        if (yPos > 750) {
          doc.addPage();
          yPos = 50;
        }

        const rowColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
        doc.fillColor(rowColor)
           .rect(50, yPos, 495, 20)
           .fill();

        doc.fillColor('#111827')
           .text(period.period, 55, yPos + 5)
           .text(period.invoiced.toFixed(2), 200, yPos + 5, { align: 'right', width: 110 })
           .text(period.paid.toFixed(2), 320, yPos + 5, { align: 'right', width: 110 })
           .text(period.outstanding.toFixed(2), 440, yPos + 5, { align: 'right', width: 100 });

        yPos += 20;
      });
    }
  }

  /**
   * Generate client performance report PDF
   */
  private generateClientPerformancePDF(doc: PDFDoc, data: any, startY: number) {
    let yPos = startY;

    if (!Array.isArray(data) || data.length === 0) {
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('Nu există date disponibile', 50, yPos);
      return;
    }

    // Table header
    doc.fillColor('#f3f4f6')
       .rect(50, yPos, 495, 25)
       .fill();

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor('#374151')
       .text('Client', 55, yPos + 8)
       .text('Bookings', 250, yPos + 8, { align: 'right' })
       .text('Containere', 330, yPos + 8, { align: 'right' })
       .text('Facturat', 410, yPos + 8, { align: 'right' })
       .text('Plătit', 480, yPos + 8, { align: 'right' });

    yPos += 25;

    doc.font('Helvetica').fontSize(9);

    data.forEach((client: any, index: number) => {
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }

      const rowColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
      doc.fillColor(rowColor)
         .rect(50, yPos, 495, 20)
         .fill();

      doc.fillColor('#111827')
         .text(client.companyName || 'N/A', 55, yPos + 5, { width: 185 })
         .text(client.metrics.totalBookings.toString(), 250, yPos + 5, { align: 'right', width: 70 })
         .text(client.metrics.totalContainers.toString(), 330, yPos + 5, { align: 'right', width: 70 })
         .text(client.metrics.totalInvoiced.toFixed(2), 410, yPos + 5, { align: 'right', width: 60 })
         .text(client.metrics.totalPaid.toFixed(2), 480, yPos + 5, { align: 'right', width: 60 });

      yPos += 20;
    });
  }

  /**
   * Generate operational report PDF
   */
  private generateOperationalPDF(doc: PDFDoc, data: any, startY: number) {
    let yPos = startY;

    // Metrics
    if (data.metrics) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#111827')
         .text('Metrici Operaționale', 50, yPos);
      yPos += 25;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151')
         .text(`Total containere: ${data.metrics.totalContainers}`, 50, yPos);
      yPos += 15;
      doc.text(`Livrate: ${data.metrics.deliveredContainers}`, 50, yPos);
      yPos += 15;
      doc.text(`Întârziate: ${data.metrics.delayedContainers}`, 50, yPos);
      yPos += 15;
      doc.text(`Timp mediu tranzit: ${data.metrics.averageTransitDays} zile`, 50, yPos);
      yPos += 15;
      doc.text(`Rata întârzierilor: ${data.metrics.delayRate.toFixed(1)}%`, 50, yPos);
      yPos += 15;
      doc.text(`Eficiență: ${data.metrics.efficiencyRate.toFixed(1)}%`, 50, yPos);
      yPos += 25;
    }

    // Bottlenecks
    if (data.analysis?.bottlenecks && data.analysis.bottlenecks.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#ef4444')
         .text('Bottleneck-uri Identificate', 50, yPos);
      yPos += 25;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151');

      data.analysis.bottlenecks.forEach((bottleneck: string) => {
        doc.text(`• ${bottleneck}`, 60, yPos);
        yPos += 15;
      });
      yPos += 10;
    }

    // Recommendations
    if (data.analysis?.recommendations && data.analysis.recommendations.length > 0) {
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#10b981')
         .text('Recomandări', 50, yPos);
      yPos += 25;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#374151');

      data.analysis.recommendations.forEach((rec: string) => {
        doc.text(`• ${rec}`, 60, yPos);
        yPos += 15;
      });
    }
  }

  /**
   * Export to Excel (disabled - xlsx library removed)
   */
  private async exportToExcel(options: ExportOptions): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    throw new Error('Excel export is not available. Please use PDF or CSV format.');
  }

  /**
   * Generate CSV rows for containers report
   */
  private generateContainersCSV(data: any): string[][] {
    const rows: string[][] = [];

    // Header
    rows.push(['Container Number', 'Client', 'Status', 'Port Origin', 'Port Destination', 'Shipping Line', 'ETA', 'Created At']);

    // Data rows
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((container: any) => {
        rows.push([
          container.containerNumber || '',
          container.booking?.client?.companyName || '',
          container.currentStatus || '',
          container.booking?.portOrigin || '',
          container.booking?.portDestination || '',
          container.booking?.shippingLine || '',
          container.eta ? new Date(container.eta).toLocaleDateString('ro-RO') : '',
          container.createdAt ? new Date(container.createdAt).toLocaleDateString('ro-RO') : '',
        ]);
      });
    }

    return rows;
  }

  /**
   * Generate CSV rows for financial report
   */
  private generateFinancialCSV(data: any): string[][] {
    const rows: string[][] = [];

    // Summary
    if (data.summary) {
      rows.push(['Sumar']);
      rows.push(['Total Facturat', String(data.summary.totalInvoiced || 0)]);
      rows.push(['Total Plătit', String(data.summary.totalPaid || 0)]);
      rows.push(['Rest de Plată', String(data.summary.totalOutstanding || 0)]);
      rows.push(['Total Facturi', String(data.summary.totalInvoices || 0)]);
      rows.push([]);
    }

    // By period
    if (data.byPeriod && data.byPeriod.length > 0) {
      rows.push(['După Perioadă']);
      rows.push(['Perioadă', 'Facturat', 'Plătit', 'Rest', 'Număr Facturi']);
      data.byPeriod.forEach((period: any) => {
        rows.push([
          period.period,
          String(period.invoiced || 0),
          String(period.paid || 0),
          String(period.outstanding || 0),
          String(period.count || 0),
        ]);
      });
      rows.push([]);
    }

    // By client
    if (data.byClient) {
      rows.push(['După Client']);
      rows.push(['Client', 'Facturat', 'Plătit', 'Rest', 'Număr Facturi']);
      Object.values(data.byClient).forEach((client: any) => {
        rows.push([
          client.clientName || '',
          String(client.invoiced || 0),
          String(client.paid || 0),
          String(client.outstanding || 0),
          String(client.count || 0),
        ]);
      });
    }

    return rows;
  }

  /**
   * Generate CSV rows for client performance report
   */
  private generateClientPerformanceCSV(data: any): string[][] {
    const rows: string[][] = [];

    // Header
    rows.push(['Client', 'Bookings', 'Containere', 'Facturat', 'Plătit', 'Rest', 'Zile Medii Plată', 'Rata Plată (%)']);

    // Data rows
    if (Array.isArray(data)) {
      data.forEach((client: any) => {
        rows.push([
          client.companyName || '',
          String(client.metrics.totalBookings || 0),
          String(client.metrics.totalContainers || 0),
          String(client.metrics.totalInvoiced || 0),
          String(client.metrics.totalPaid || 0),
          String(client.metrics.outstanding || 0),
          String(client.metrics.averagePaymentDays || 0),
          String(client.metrics.paymentRate?.toFixed(2) || 0),
        ]);
      });
    }

    return rows;
  }

  /**
   * Generate CSV rows for operational report
   */
  private generateOperationalCSV(data: any): string[][] {
    const rows: string[][] = [];

    // Metrics
    if (data.metrics) {
      rows.push(['Metrici Operaționale']);
      rows.push(['Total Containere', String(data.metrics.totalContainers || 0)]);
      rows.push(['Livrate', String(data.metrics.deliveredContainers || 0)]);
      rows.push(['Întârziate', String(data.metrics.delayedContainers || 0)]);
      rows.push(['Timp Mediu Tranzit (zile)', String(data.metrics.averageTransitDays || 0)]);
      rows.push(['Rata Întârzierilor (%)', String(data.metrics.delayRate?.toFixed(1) || 0)]);
      rows.push(['Eficiență (%)', String(data.metrics.efficiencyRate?.toFixed(1) || 0)]);
      rows.push(['Rata On-Time (%)', String(data.metrics.onTimeRate?.toFixed(1) || 0)]);
      rows.push([]);
    }

    // Bottlenecks
    if (data.analysis?.bottlenecks && data.analysis.bottlenecks.length > 0) {
      rows.push(['Bottleneck-uri']);
      data.analysis.bottlenecks.forEach((bottleneck: string) => {
        rows.push([bottleneck]);
      });
      rows.push([]);
    }

    // Recommendations
    if (data.analysis?.recommendations && data.analysis.recommendations.length > 0) {
      rows.push(['Recomandări']);
      data.analysis.recommendations.forEach((rec: string) => {
        rows.push([rec]);
      });
    }

    return rows;
  }

  /**
   * Export to CSV (simple implementation without xlsx)
   */
  private async exportToCSV(options: ExportOptions): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    let rows: string[][];

    switch (options.reportType) {
      case 'containers':
        rows = this.generateContainersCSV(options.data);
        break;
      case 'financial':
        rows = this.generateFinancialCSV(options.data);
        break;
      case 'client-performance':
        rows = this.generateClientPerformanceCSV(options.data);
        break;
      case 'operational':
        rows = this.generateOperationalCSV(options.data);
        break;
      default:
        throw new Error(`Unsupported report type: ${options.reportType}`);
    }

    // Convert to CSV string
    const csv = arrayToCSV(rows);

    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: options.filename || `${options.reportType}-report.csv`,
      contentType: 'text/csv',
    };
  }
}

export const reportExportService = new ReportExportService();

