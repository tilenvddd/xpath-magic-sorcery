import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { preprocessImage } from "@/utils/imageProcessing";
import { Link } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';
// In your component:
const processedFile = await preprocessImage(imageFile);
const qrCodeMessage = await html5QrCode.scanFile(processedFile, true);

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
    const page = await pdf.getPage(1); // Get first page
    
    // Increase scale for even better quality (8.0 provides extremely high resolution)
    const scale = 8.0;
    const viewport = page.getViewport({ scale });
    
    // Create a canvas with the desired dimensions
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { 
      alpha: false,
      willReadFrequently: true,
      desynchronized: true // Optimize rendering performance
    });
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    // Disable image smoothing for sharper edges
    context.imageSmoothingEnabled = false;
    
    // Set canvas dimensions
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Enhanced rendering parameters
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      renderInteractiveForms: false,
      enableWebGL: true,
      background: 'white' // Ensure white background for better contrast
    };
    
    // Render the PDF page
    await page.render(renderContext).promise;
    
    // Enhanced image processing
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply advanced image processing
    for (let i = 0; i < data.length; i += 4) {
      // Calculate luminance with proper color weights
      const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      
      // Apply adaptive thresholding
      const threshold = 160; // Increased threshold for better separation
      const gamma = 1.5; // Gamma correction factor
      
      // Apply gamma correction and thresholding
      const normalizedLuminance = Math.pow(luminance / 255, gamma) * 255;
      const newValue = normalizedLuminance > threshold ? 255 : 0;
      
      // Sharpen edges by increasing contrast in transition areas
      const edgeDetection = Math.abs(luminance - threshold) < 20;
      const finalValue = edgeDetection ? (luminance > threshold ? 255 : 0) : newValue;
      
      // Apply the processed values
      data[i] = finalValue;     // Red
      data[i + 1] = finalValue; // Green
      data[i + 2] = finalValue; // Blue
      data[i + 3] = 255;        // Alpha (fully opaque)
    }
    
    // Apply the processed image data back to the canvas
    context.putImageData(imageData, 0, 0);
    
    return canvas;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Please upload a PDF invoice document");
      return;
    }

    try {
      setIsProcessing(true);
      const html5QrCode = new Html5Qrcode("reader");
      
      try {
        // Convert PDF to image
        const canvas = await convertPDFToImage(file);
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
          }, 'image/jpeg', 1.0);
        });
        
        const imageFile = new File([imageBlob], 'pdf-page.jpg', { type: 'image/jpeg' });
        const processedFile = await preprocessImage(imageFile);
        
        const qrCodeMessage = await html5QrCode.scanFile(processedFile, /* verbose= */ true);
        
        if (qrCodeMessage.length > 0) {
          handleScanSuccess(qrCodeMessage);
        } else {
          toast.error("No QR code found in the PDF. Please ensure your invoice contains a clear, readable QR code and try again.", {
            duration: 5000
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("No MultiFormat Readers")) {
            toast.error("No QR code detected in the invoice. Please check that:", {
              duration: 6000,
              description: "1. The PDF contains a QR code\n2. The QR code is clearly visible\n3. The PDF quality is good\n4. Try zooming the PDF before saving it"
            });
          } else {
            toast.error("Failed to process the PDF. Please try a different file with a clearer QR code.", {
              duration: 5000
            });
          }
          console.log("Scanning error:", error.message);
        }
        handleScanError(error as string);
      } finally {
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Error processing the PDF. Please try again with a different file.", {
        duration: 5000
      });
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

            <div id="reader" className="w-full max-w-xl mx-auto"></div>
            
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
