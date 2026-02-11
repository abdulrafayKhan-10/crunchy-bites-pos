const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { exec, spawn } = require('child_process');
const iconv = require('iconv-lite');

class EscPosService {
    constructor() {
        this.printer = new ThermalPrinter({
            type: PrinterTypes.EPSON, // Most common
            interface: 'tcp://127.0.0.1', // Use TCP dummy interface to bypass native driver
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            lineCharacter: "-",
            options: {
                timeout: 5000
            }
        });
    }

    /**
     * Generate raw ESC/POS buffer for a receipt
     */
    async generateReceiptBuffer(orderData) {
        this.printer.clear();

        // 1. Header
        this.printer.alignCenter();
        this.printer.bold(true);
        this.printer.setTextSize(1, 1);
        this.printer.println("Crunchy Bites");
        this.printer.bold(false);
        this.printer.setTextSize(0, 0);
        this.printer.println("Fast Food & Grill");
        this.printer.newLine();

        // 2. Order Info
        this.printer.alignLeft();
        this.printer.println(`Order: #${orderData.id}`);
        this.printer.println(`Date: ${new Date(orderData.order_date).toLocaleString('en-PK')}`);
        this.printer.println(orderData.is_walk_in ? "Type: Walk-in" : "Type: Delivery");

        if (!orderData.is_walk_in && orderData.customer_name) {
            this.printer.println(`Customer: ${orderData.customer_name}`);
            if (orderData.customer_phone) this.printer.println(`Phone: ${orderData.customer_phone}`);
            if (orderData.customer_address) this.printer.println(`Addr: ${orderData.customer_address.substring(0, 30)}`);
        }

        this.printer.drawLine();

        // 3. Items
        // Adjusted widths to prevent right-side cutoff
        // Total width < 1.0 to add a safe margin
        this.printer.tableCustom([
            { text: "Item", align: "LEFT", width: 0.50 },
            { text: "Qty", align: "CENTER", width: 0.15 },
            { text: "Price", align: "RIGHT", width: 0.25 } // Reduced from 0.35
        ]);

        if (orderData.items && Array.isArray(orderData.items)) {
            orderData.items.forEach(item => {
                const name = item.product_name || item.deal_name || "Unknown Item";
                // Determine price (handle nulls if any)
                const price = item.unit_price || item.price || 0;
                const total = item.total_price || (price * item.quantity) || 0;

                this.printer.tableCustom([
                    { text: name, align: "LEFT", width: 0.50 },
                    { text: item.quantity.toString(), align: "CENTER", width: 0.15 },
                    { text: total.toFixed(0), align: "RIGHT", width: 0.25 } // Reduced from 0.35
                ]);

                // If it's a deal and has sub-items (if we had that data, but currently DB just links deal_id)
                // If we need deal contents, we'd need a more complex query. 
                // For now, just showing the deal name is standard.
            });
        }

        this.printer.drawLine();

        // 4. Totals
        this.printer.alignRight();
        this.printer.bold(true);
        // User requested smaller total size, so removing setTextSize(1, 1)
        this.printer.setTextSize(0, 0);
        this.printer.println(`Total: Rs. ${orderData.total_amount.toFixed(0)}`);
        this.printer.bold(false);
        this.printer.newLine();

        // 5. Footer
        this.printer.alignCenter();
        this.printer.println("Thank you for your order!");
        this.printer.println("Please come again.");
        this.printer.newLine();

        // 6. Cut
        // Feed lines to ensure nothing is cut off
        this.printer.newLine();
        this.printer.newLine();
        this.printer.newLine();
        this.printer.cut();

        return this.printer.getBuffer();
    }

    /**
     * Send raw buffer to Windows printer using PowerShell
     * This bypasses problematic native node modules and works with default drivers
     */
    async printToWindows(buffer, printerName) {
        // Create temp file for the raw bytes
        const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.bin`);

        try {
            // Write buffer to temp file
            fs.writeFileSync(tempPath, buffer);
            console.log(`✓ Buffer written to: ${tempPath} (${buffer.length} bytes)`);

            // PowerShell script to send RAW bytes directly to printer using .NET
            // This is safer than 'copy' command as it handles printer handles properly
            const psScript = `
                $printerName = "${printerName}"
                $filePath = "${tempPath}"
                
                # Check if printer exists
                $printer = Get-WmiObject Win32_Printer | Where-Object { $_.Name -eq $printerName }
                
                if (-not $printer) { 
                    Write-Error "Printer not found: $printerName"
                    exit 1 
                }
                
                # Use raw copy command (most reliable for thermal printers on USB/network)
                # If printer is shared: copy /b file \\computer\share
                # If local: copy /b file LPT1 (if mapped)
                # But since we have just a name, let's use the Print spooler API via .NET
                
                # Simple fallback first: try strictly sending raw to the printer via standard Out-Printer
                # Creating a raw string might mess up encoding, so bytes are critical.
                
                # Let's try the most robust way: Invoke-CimMethod to print test page? No.
                # Let's use the standard "print /D:PrinterName File" command if possible or copy.
                
                # Direct approach: Write to printer spooler using .NET
                $code = @"
using System;
using System.Runtime.InteropServices;
using System.IO;

public class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public class DOCINFOW
    {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string src, ref IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOW pDocInfo);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendFile(string szPrinterName, string szFileName)
    {
        FileStream fs = new FileStream(szFileName, FileMode.Open);
        BinaryReader br = new BinaryReader(fs);
        Byte[] bytes = new Byte[fs.Length];
        bool bSuccess = false;
        IntPtr pUnmanagedBytes = new IntPtr(0);
        int nLength = Convert.ToInt32(fs.Length);
        
        bytes = br.ReadBytes(nLength);
        pUnmanagedBytes = Marshal.AllocCoTaskMem(nLength);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, nLength);
        
        bSuccess = SendBytes(szPrinterName, pUnmanagedBytes, nLength);
        
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        return bSuccess;
    }

    public static bool SendBytes(string szPrinterName, IntPtr pBytes, Int32 dwCount)
    {
        Int32 dwWritten = 0;
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOW di = new DOCINFOW();
        bool bSuccess = false;

        di.pDocName = "RAW Receipt";
        di.pDataType = "RAW";

        if (OpenPrinter(szPrinterName, ref hPrinter, IntPtr.Zero))
        {
            if (StartDocPrinter(hPrinter, 1, di))
            {
                if (StartPagePrinter(hPrinter))
                {
                    bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

                Add-Type -TypeDefinition $code
                $success = [RawPrinter]::SendFile($printerName, $filePath)
                
                if ($success) { Write-Output "Success" } else { Write-Error "Failed to print" }
            `;

            return new Promise((resolve, reject) => {
                const psParams = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript];

                const child = spawn('powershell.exe', psParams);

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => stdout += data);
                child.stderr.on('data', (data) => stderr += data);

                child.on('close', (code) => {
                    // Cleanup
                    try { fs.unlinkSync(tempPath); } catch (e) { }

                    console.log('PowerShell Output:', stdout);
                    if (stderr) console.error('PowerShell Error:', stderr);

                    if (code === 0 && stdout.includes("Success")) {
                        resolve(true);
                    } else {
                        reject(new Error(`Printing failed: ${stderr || stdout}`));
                    }
                });
            });

        } catch (error) {
            console.error('Print Service Error:', error);
            throw error;
        }
    }
}

module.exports = new EscPosService();
