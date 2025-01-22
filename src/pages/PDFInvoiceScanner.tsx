import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { preprocessImage } from "@/utils/imageProcessing";
import { Link } from "react-router-dom";
import * as pdfjsLib from 'pdfjs-dist';
import { ExternalLink, Upload, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

const PDFInvoiceScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [url, setUrl] = useState<string>("");

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    toast.success("Invoice QR code scanned successfully!");
    setIsProcessing(false);
  };

  const handleScanError = (err: string) => {
    console.warn(err);
    setIsProcessing(false);
  };

  const scanFullImage = async (canvas: HTMLCanvasElement, html5QrCode: Html5Qrcode): Promise<string | null> => {
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
        }, 'image/jpeg', 1.0);
      });

      const imageFile = new File([blob], 'full-image.jpg', { type: 'image/jpeg' });
      const processedImage = await preprocessImage(imageFile);
      const qrCodeMessage = await html5QrCode.scanFile(processedImage, /* verbose= */ true);
      
      return qrCodeMessage;
    } catch (error) {
      console.log("Full image scanning error:", error);
      return null;
    }
  };

  const scanSegment = async (
    canvas: HTMLCanvasElement,
    html5QrCode: Html5Qrcode,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string | null> => {
    const segmentCanvas = document.createElement('canvas');
    segmentCanvas.width = width;
    segmentCanvas.height = height;
    const segmentContext = segmentCanvas.getContext('2d');

    if (!segmentContext) return null;

    segmentContext.drawImage(
      canvas,
      x, y, width, height,
      0, 0, width, height
    );

    try {
      const blob = await new Promise<Blob>((resolve) => {
        segmentCanvas.toBlob((b) => {
          if (b) resolve(b);
        }, 'image/jpeg', 1.0);
      });

      const segmentFile = new File([blob], 'segment.jpg', { type: 'image/jpeg' });
      const processedSegment = await preprocessImage(segmentFile);
      const qrCodeMessage = await html5QrCode.scanFile(processedSegment, /* verbose= */ true);
      
      return qrCodeMessage;
    } catch (error) {
      console.log("Segment scanning error:", error);
      return null;
    }
  };

  const recursiveSegmentScan = async (
    canvas: HTMLCanvasElement,
    html5QrCode: Html5Qrcode,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number = 0
  ): Promise<string | null> => {
    // Try scanning current segment
    const result = await scanSegment(canvas, html5QrCode, x, y, width, height);
    if (result) return result;

    // Stop recursion if segments become too small
    if (width < 100 || height < 100 || depth > 3) return null;

    // Divide segment into quarters and scan each
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);

    const segments = [
      { x, y, w: halfWidth, h: halfHeight },
      { x: x + halfWidth, y, w: halfWidth, h: halfHeight },
      { x, y: y + halfHeight, w: halfWidth, h: halfHeight },
      { x: x + halfWidth, y: y + halfHeight, w: halfWidth, h: halfHeight }
    ];

    // Try each sub-segment
    for (const segment of segments) {
      const subResult = await recursiveSegmentScan(
        canvas,
        html5QrCode,
        segment.x,
        segment.y,
        segment.w,
        segment.h,
        depth + 1
      );
      if (subResult) return subResult;
    }

    return null;
  };

  const convertPDFToImage = async (file: File): Promise<HTMLCanvasElement> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
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
        const canvas = await convertPDFToImage(file);
        
        // First try scanning the full image
        const fullImageResult = await scanFullImage(canvas, html5QrCode);
        if (fullImageResult) {
          handleScanSuccess(fullImageResult);
          return;
        }

        // If full image scan fails, try recursive segmentation
        const qrCodeMessage = await recursiveSegmentScan(
          canvas,
          html5QrCode,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        if (qrCodeMessage) {
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

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsProcessing(true);
    setScanResult(null);
    console.log("Starting to process URL:", url);

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      console.log("Fetching from proxy URL:", proxyUrl);
      
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log("Received blob:", blob.type, blob.size);
      
      // Convert blob to File
      const file = new File([blob], 'downloaded-file.pdf', { 
        type: blob.type,
        lastModified: Date.now()
      });
      
      const html5QrCode = new Html5Qrcode("reader");

      try {
        let canvas: HTMLCanvasElement;
        
        if (blob.type === 'application/pdf') {
          console.log("Converting PDF to image...");
          canvas = await convertPDFToImage(file);
        } else {
          const tempImage = new Image();
          canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Could not get canvas context');
          }
          
          await new Promise((resolve, reject) => {
            tempImage.onload = () => {
              canvas.width = tempImage.width;
              canvas.height = tempImage.height;
              ctx.drawImage(tempImage, 0, 0);
              resolve(null);
            };
            tempImage.onerror = reject;
            tempImage.src = URL.createObjectURL(blob);
          });
        }

        // First try scanning the full image
        const fullImageResult = await scanFullImage(canvas, html5QrCode);
        if (fullImageResult) {
          handleScanSuccess(fullImageResult);
          return;
        }

        // If full image scan fails, try recursive segmentation
        const qrCodeMessage = await recursiveSegmentScan(
          canvas,
          html5QrCode,
          0,
          0,
          canvas.width,
          canvas.height
        );
        
        if (qrCodeMessage) {
          handleScanSuccess(qrCodeMessage);
        } else {
          toast.error("No QR code found in the file. Please ensure your invoice contains a clear, readable QR code and try again.", {
            duration: 5000
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("QR code scanning error:", error);
          if (error.message.includes("No MultiFormat Readers")) {
            toast.error("Unable to detect QR code. Try these tips:", {
              duration: 6000,
              description: "1. Ensure image is well-lit and in focus\n2. QR code should be clearly visible\n3. Try a higher resolution image"
            });
          } else {
            toast.error("Failed to process the file. Please try a different image with a clearer QR code.");
          }
          console.log("Scanning error:", error.message);
        }
        handleScanError(error as string);
      } finally {
        html5QrCode.clear();
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error("Failed to fetch the image. This might be due to:", {
        duration: 6000,
        description: "1. Invalid image URL\n2. Server is not responding\n3. Image format not supported\n\nTry downloading the image and using the PDF scanner instead."
      });
      setIsProcessing(false);
    }
  };

  const handleOpenLink = () => {
    if (scanResult && (scanResult.startsWith('http://') || scanResult.startsWith('https://'))) {
      window.open(scanResult, '_blank', 'noopener,noreferrer');
    } else {
      toast.error("The scanned QR code does not contain a valid URL");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Invoice QR Scanner</CardTitle>
          <CardDescription>
            Upload a PDF invoice or enter a URL to scan its QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs defaultValue="pdf" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pdf">
                  <Upload className="w-4 h-4 mr-2" />
                  PDF Upload
                </TabsTrigger>
                <TabsTrigger value="url">
                  <Link2 className="w-4 h-4 mr-2" />
                  URL Scanner
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pdf">
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
              </TabsContent>
              
              <TabsContent value="url">
                <form onSubmit={handleUrlSubmit} className="space-y-4">
                  <Input
                    type="url"
                    placeholder="Enter image or PDF URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isProcessing}
                  />
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Scan QR Code"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
                  <div className="flex gap-4 mt-4">
                    <Button onClick={() => setScanResult(null)}>
                      Scan Another Invoice
                    </Button>
                    {(scanResult.startsWith('http://') || scanResult.startsWith('https://')) && (
                      <Button onClick={handleOpenLink} variant="secondary">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Link
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFInvoiceScanner;
