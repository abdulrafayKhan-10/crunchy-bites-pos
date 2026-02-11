const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class PrintService {

  static async printReceipt(orderData, mainWindow) {
    let printWindow = null;
    const escPosService = require('./escposService');

    try {
      console.log('=== RECEIPT PRINT START ===');

      // 1. Get Printers to find the correct one
      // We still need a BrowserWindow to detect printers reliably in Electron
      printWindow = new BrowserWindow({ show: false });
      const printers = await printWindow.webContents.getPrintersAsync();
      printWindow.close(); // Close immediately after getting printers

      if (!printers || printers.length === 0) {
        throw new Error('No printers found');
      }

      console.log('Available printers:', printers.map(p => p.name).join(', '));

      // 2. Select Printer
      const defaultPrinter = printers.find(p => p.isDefault);
      const printerToUse = defaultPrinter || printers[0];
      const printerName = printerToUse.name;

      console.log(`Selected Printer: ${printerName}`);

      // 3. Generate ESC/POS Buffer
      console.log('Generating ESC/POS buffer...');
      const buffer = await escPosService.generateReceiptBuffer(orderData);

      // 4. Send to Printer
      console.log('Sending to printer...');
      await escPosService.printToWindows(buffer, printerName);

      console.log('✓ Print job sent successfully');

      return {
        success: true,
        method: 'escpos',
        printer: printerName
      };

    } catch (error) {
      console.error('❌ Print failed:', error);

      // Fallback to PDF if ESC/POS fails?
      // For now, let's just return the error so we can debug the raw printing
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async printReport(reportData, mainWindow) {
    try {
      console.log('Starting Report PDF generation');
      const html = this.generateReportHTML(reportData);

      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true
        }
      });

      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Generating report PDF...');
      const pdfData = await printWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false
      });

      const { app, shell } = require('electron');
      const downloadsPath = app.getPath('downloads');
      const fileName = `report-${reportData.date}-${Date.now()}.pdf`;
      const filePath = path.join(downloadsPath, fileName);

      fs.writeFileSync(filePath, pdfData);
      shell.openPath(filePath);  // Open PDF directly instead of showing folder
      printWindow.close();

      return { success: true, method: 'pdf', filePath, fileName };
    } catch (error) {
      console.error('Report print/PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  static generateReportHTML(data) {
    const summary = data.summary || data;
    const totalSales = summary.total_sales || 0;
    const totalOrders = summary.total_orders || 0;
    const averageOrder = totalOrders > 0 ? (totalSales / totalOrders) : 0;
    const date = new Date(data.date).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `
 <!DOCTYPE html>
 <html>
 <head>
   <meta charset="UTF-8">
   <style>
     body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
     .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
     .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
     .subtitle { font-size: 16px; color: #666; }
     .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
     .stat-card { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
     .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
     .stat-label { font-size: 14px; color: #7f8c8d; margin-top: 5px; }
     table { width: 100%; border-collapse: collapse; margin-top: 20px; }
     th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
     th { background-color: #f8f9fa; font-weight: bold; }
     .text-right { text-align: right; }
   </style>
 </head>
 <body>
   <div class="header">
     <div class="title">Crunchy Bites - Daily Sales Report</div>
     <div class="subtitle">${date}</div>
   </div>
 
   <div class="stats-grid">
     <div class="stat-card">
       <div class="stat-value">Rs. ${totalSales.toLocaleString()}</div>
       <div class="stat-label">Total Revenue</div>
     </div>
     <div class="stat-card">
       <div class="stat-value">${totalOrders}</div>
       <div class="stat-label">Total Orders</div>
     </div>
     <div class="stat-card">
       <div class="stat-value">Rs. ${averageOrder.toFixed(0)}</div>
       <div class="stat-label">Average Order Value</div>
     </div>
   </div>
 
   <h3>Product Breakdown</h3>
   <table>
     <thead>
       <tr>
         <th>Product Name</th>
         <th>Category</th>
         <th class="text-right">Qty</th>
         <th class="text-right">Revenue</th>
       </tr>
     </thead>
     <tbody>
       ${(data.products || []).length > 0 ? data.products.map(p => `
         <tr>
           <td>${p.product_name}</td>
           <td>${p.category}</td>
           <td class="text-right">${p.quantity_sold}</td>
           <td class="text-right">Rs. ${p.total_sales.toLocaleString()}</td>
         </tr>
       `).join('') : '<tr><td colspan="4" class="text-center">No products sold</td></tr>'}
     </tbody>
   </table>
 
   ${(data.deals || []).length > 0 ? `
   <h3>Deals Breakdown</h3>
   <table>
     <thead>
       <tr>
         <th>Deal Name</th>
         <th class="text-right">Qty</th>
         <th class="text-right">Revenue</th>
       </tr>
     </thead>
     <tbody>
       ${data.deals.map(d => `
         <tr>
           <td>${d.deal_name}</td>
           <td class="text-right">${d.quantity_sold}</td>
           <td class="text-right">Rs. ${d.total_sales.toLocaleString()}</td>
         </tr>
       `).join('')}
     </tbody>
   </table>
   ` : ''}
 </body>
 </html>
     `;
  }
}

module.exports = PrintService;
