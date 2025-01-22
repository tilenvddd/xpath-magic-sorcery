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
    const page = await pdf.getPage(1);
    
    // Increase scale for better quality
    const scale = 8.0;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { 
      alpha: false,
      willReadFrequently: true,
      desynchronized: true
    });
    
    if (!context) {
      throw new Error('Could not get canvas context');
    }
    
    context.imageSmoothingEnabled = false;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      renderInteractiveForms: false,
      enableWebGL: true,
      background: 'white'
    };
    
    await page.render(renderContext).promise;
    
    // Enhanced image processing for noise reduction
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply advanced noise reduction and enhancement
    for (let i = 0; i < data.length; i += 4) {
      // Calculate weighted luminance using proper color weights
      const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      
      // Adaptive thresholding with noise reduction
      const threshold = 180; // Increased threshold for better noise handling
      const gamma = 1.8;    // Increased gamma for better contrast
      
      // Apply bilateral filtering for noise reduction while preserving edges
      let sum = 0;
      let count = 0;
      const radius = 1;
      
      // Simple bilateral filter implementation
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const offset = (dx + dy * canvas.width) * 4;
          if (i + offset >= 0 && i + offset < data.length) {
            const neighborLuminance = (
              data[i + offset] * 0.299 +
              data[i + offset + 1] * 0.587 +
              data[i + offset + 2] * 0.114
            );
            // Weight based on spatial and intensity difference
            const weight = Math.exp(
              -(Math.abs(luminance - neighborLuminance) / 30.0) -
              (dx * dx + dy * dy) / 2.0
            );
            sum += neighborLuminance * weight;
            count += weight;
          }
        }
      }
      
      // Get denoised value
      const denoisedLuminance = count > 0 ? sum / count : luminance;
      
      // Apply gamma correction and adaptive thresholding
      const normalizedLuminance = Math.pow(denoisedLuminance / 255, gamma) * 255;
      const finalValue = normalizedLuminance > threshold ? 255 : 0;
      
      // Sharpen edges in transition areas
      const edgeDetection = Math.abs(denoisedLuminance - threshold) < 25;
      const outputValue = edgeDetection ? (denoisedLuminance > threshold ? 255 : 0) : finalValue;
      
      // Apply the processed values
      data[i] = outputValue;     // Red
      data[i + 1] = outputValue; // Green
      data[i + 2] = outputValue; // Blue
      data[i + 3] = 255;         // Alpha
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
