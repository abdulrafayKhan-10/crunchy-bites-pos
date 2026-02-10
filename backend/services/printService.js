const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

class PrintService {

  static async printReceipt(orderData, mainWindow) {
    let printWindow = null;

    try {


      // Create hidden window with receipt dimensions (80mm = ~302px)
      printWindow = new BrowserWindow({
        show: false,
        width: 302,  // 80mm in pixels at 96 DPI
        height: 800, // Will be adjusted based on content
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      // Load template
      const templatePath = path.join(__dirname, '..', '..', 'assets', 'receipt_template.html');
      console.log('Template path:', templatePath);
      console.log('Template exists:', fs.existsSync(templatePath));

      await printWindow.loadFile(templatePath);
      console.log('✓ Template loaded');

      // Prepare logo - use file:// URL instead of base64 for printToPDF compatibility
      const logoPath = path.join(__dirname, '..', '..', 'assets', 'logo.png');
      let logoUrl = '';
      if (fs.existsSync(logoPath)) {
        // Convert to file:// URL for Electron
        logoUrl = `file:///${logoPath.replace(/\\/g, '/')}`;

      } else {

      }

      // Prepare receipt data
      // NOTE: Passing empty logoUrl because Electron's printToPDF has issues with images
      // The window display will show "Crunchy Bites" text instead
      const receiptData = {
        orderData,
        logoUrl: ''  // Empty to avoid printToPDF issues
      };



      // Call renderReceipt function with proper error handling
      const renderResult = await printWindow.webContents.executeJavaScript(`
        (function() {
          try {
            console.log('executeJavaScript: Starting render');
            if (typeof window.renderReceipt !== 'function') {
              return { success: false, error: 'renderReceipt function not found' };
            }
            
            const data = ${JSON.stringify(receiptData)};
            console.log('executeJavaScript: Data received, items count:', data.orderData.items.length);
            
            const result = window.renderReceipt(data);
            console.log('executeJavaScript: Render complete, result:', result);
            
            // Check if content was actually rendered
            const content = document.getElementById('receipt-content').innerHTML;
            const hasContent = content && !content.includes('Loading receipt');
            
            return { 
              success: result, 
              hasContent: hasContent,
              contentLength: content.length 
            };
          } catch (err) {
            console.error('executeJavaScript: Error:', err);
            return { success: false, error: err.message, stack: err.stack };
          }
        })()
      `);

      if (!renderResult.success) {
        throw new Error('Render failed: ' + (renderResult.error || 'Unknown error'));
      }

      if (!renderResult.hasContent) {
        throw new Error('Receipt content is empty after render');
      }

      // Delay for layout/paint to complete before screenshot
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ---------------------------------------------------------
      // PRINTER DETECTION & PRINTING
      // ---------------------------------------------------------

      const printers = await printWindow.webContents.getPrintersAsync();

      if (printers && printers.length > 0) {
        const printerName = printers[0].name;


        try {
          await printWindow.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: printerName,
            margins: { marginType: 'none' }
          });


          printWindow.close();
          return {
            success: true,
            method: 'print',
            printer: printerName
          };

        } catch (printErr) {
          console.error('Print failed:', printErr);
        }

      }

      // ---------------------------------------------------------
      // PDF FALLBACK - Using capturePage workaround
      // ---------------------------------------------------------



      // Capture the rendered page as an image
      const image = await printWindow.webContents.capturePage();
      const imageBuffer = image.toPNG();



      // Create PDF with the image using PDFKit
      const PDFDocument = require('pdfkit');
      const { app, shell } = require('electron');
      const downloadsPath = app.getPath('downloads');
      const fileName = `receipt-${orderData.id}-${Date.now()}.pdf`;
      const filePath = path.join(downloadsPath, fileName);

      // Create PDF document with thermal printer dimensions (80mm width)
      // Use actual image dimensions for perfect fit
      const imageSize = image.getSize();
      const pdfWidth = 226.77; // 80mm in points
      const pdfHeight = (imageSize.height / imageSize.width) * pdfWidth; // Maintain aspect ratio

      const doc = new PDFDocument({
        size: [pdfWidth, pdfHeight],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      // Pipe to file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Add the captured image to fill the entire page
      doc.image(imageBuffer, 0, 0, {
        width: pdfWidth,
        height: pdfHeight
      });

      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      shell.openPath(filePath);
      printWindow.close();

      return {
        success: true,
        method: 'pdf',
        filePath,
        fileName
      };

    } catch (error) {
      console.error('❌ Receipt error:', error);
      console.error('Stack:', error.stack);
      if (printWindow && !printWindow.isDestroyed()) printWindow.close();
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
