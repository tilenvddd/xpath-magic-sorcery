import { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Link } from "lucide-react";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [url, setUrl] = useState("");
  const [activeScanner, setActiveScanner] = useState(false);

  const enhanceImageQuality = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Set optimal dimensions for QR scanning
        const maxDimension = 1024;
        let width = img.width;
        let height = img.height;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Apply image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/png' }));
          } else {
            resolve(file);
          }
        }, 'image/png', 1.0);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const processedFile = await enhanceImageQuality(file);
      const html5QrCode = new Html5Qrcode("reader");
      
      const decodedText = await html5QrCode.scanFile(processedFile, /* showImage= */ true);
      setScanResult(decodedText);
      toast.success("QR code successfully scanned!");
      await html5QrCode.clear();
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        if (error.message.includes("No MultiFormat Readers")) {
          toast.error("Could not detect a valid QR code. Please try a clearer image.");
        } else {
          toast.error(`Failed to scan QR code: ${error.message}`);
        }
      } else {
        toast.error("Failed to scan QR code from the uploaded file.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a valid URL");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], "qr-from-url.png", { type: blob.type });
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, /* showImage= */ true);
      setScanResult(decodedText);
      toast.success("QR code successfully scanned from URL!");
      await html5QrCode.clear();
    } catch (error) {
      console.error(error);
      toast.error("Failed to scan QR code from the URL.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanning = () => {
    setActiveScanner(true);
    if (scanner) {
      scanner.render(
        (decodedText: string) => {
          setScanResult(decodedText);
          toast.success("QR Code successfully scanned!");
          scanner.clear();
          setActiveScanner(false);
        },
        (errorMessage: string) => {
          console.warn("QR Code scan failed: ", errorMessage);
        }
      );
    }
  };

  useEffect(() => {
    const newScanner = new Html5QrcodeScanner(
      "reader",
      {
        qrbox: { width: 250, height: 250 },
        fps: 10,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        rememberLastUsedCamera: true,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.PDF_417
        ],
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
      },
      false
    );
    setScanner(newScanner);

    return () => {
      if (newScanner) {
        newScanner.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="camera" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-0">
              {!scanResult && !activeScanner && (
                <div className="text-center mb-4">
                  <Button onClick={startScanning} className="w-full">
                    Start Camera Scanning
                  </Button>
                </div>
              )}
              <div id="reader" className="w-full aspect-square max-w-xl mx-auto rounded-lg overflow-hidden"></div>
            </TabsContent>

            <TabsContent value="file" className="mt-0">
              <div className="flex flex-col gap-4">
                <label htmlFor="file-upload" className="w-full">
                  <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, JPEG, or PDF files supported
                      </p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept=".png,.jpg,.jpeg,.pdf"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                    />
                  </div>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-0">
              <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
                <Input
                  type="url"
                  placeholder="Enter image URL containing QR code"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                  disabled={isProcessing}
                />
                <Button type="submit" disabled={isProcessing || !url} className="w-full">
                  Scan QR Code from URL
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="text-center mt-4">
              <p className="text-gray-500">Processing document...</p>
            </div>
          )}

          {scanResult && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-2">Scan Result:</h3>
              <p className="break-all text-gray-700">{scanResult}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setScanResult(null);
                  setUrl("");
                  setActiveScanner(false);
                }}
              >
                Scan Another Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
