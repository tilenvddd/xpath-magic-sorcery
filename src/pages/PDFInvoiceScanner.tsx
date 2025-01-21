import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { preprocessImage } from "@/utils/imageProcessing";
import { Link } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

const PDFInvoiceScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    toast.success("Invoice QR code scanned successfully!");
    setIsProcessing(false);
  };

  const handleScanError = (err: string) => {
    console.warn(err);
    setIsProcessing(false);
  };

  const convertPDFToImage = async (file: File): Promise<HTMLCanvasElement> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    
    // Process each page, if QR code is found, return immediately
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 8.0;
      const viewport = page.getViewport({ scale });
      
      // Render page onto canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      context.imageSmoothingEnabled = false;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Render PDF page to canvas
      await page.render(renderContext).promise;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Attempt to scan the canvas for a QR code
      const html5QrCode = new Html5Qrcode("reader");
      const qrCodeDetected = await html5QrCode.scanFile(imageData, true);

      if (qrCodeDetected) {
        return canvas; // Return as soon as QR code is found on any page
      }
    }
    
    // If no QR code found
    throw new Error("No QR code found in any page");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if uploaded file is a PDF
    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF invoice document");
      return;
    }

    try {
      setIsProcessing(true);
      const html5QrCode = new Html5Qrcode("reader");
      
      try {
        // Convert the PDF to image
        const canvas = await convertPDFToImage(file);
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', 1.0); // Convert canvas to high-quality JPEG
        });
        
        // Convert Blob to file, preprocess it
        const imageFile = new File([imageBlob], 'pdf-page.jpg', { type: 'image/jpeg' });
        const processedFile = await preprocessImage(imageFile);

        // Scan for QR code
        const qrCodeMessage = await html5QrCode.scanFile(processedFile, true);

        if (qrCodeMessage.length > 0) {
          handleScanSuccess(qrCodeMessage);
        } else {
          toast.error("No QR code found in the PDF. Please ensure your invoice contains a clear, readable QR code and try again.", {
            duration: 5000
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("Error during PDF processing:", error);
          toast.error("Failed to process the PDF. Make sure it’s not encrypted, corrupted, or too large.");
        }
        handleScanError(error as string);
      } finally {
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Error processing the PDF. Please try again with a different file.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>PDF Invoice QR Scanner</CardTitle>
          <CardDescription>
            Upload a PDF invoice document to scan its QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="w-full">
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF invoices only</p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                    />
                  </div>
                </label>
              </div>
            </div>

            {isProcessing && (
              <div className="text-center">
                <p>Processing invoice...</p>
              </div>
            )}

            {scanResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Scan Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg break-all">{scanResult}</p>
                  <Button 
                    className="mt-4"
                    onClick={() => setScanResult(null)}
                  >
                    Scan Another Invoice
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="text-center mt-4">
              <Link to="/qr-scanner">
                <Button variant="outline">
                  Switch to General QR Scanner
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFInvoiceScanner;
