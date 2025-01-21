import { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const enhanceImageQuality = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const processedImage = await enhanceImageQuality(file);
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, /* showImage= */ true);
      setScanResult(decodedText);
      toast.success("QR code successfully scanned!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to scan QR code from the uploaded file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanning = () => {
    if (scanner) {
      scanner.render(
        (decodedText: string) => {
          setScanResult(decodedText);
          toast.success("QR Code successfully scanned!");
          scanner.clear();
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
        qrbox: { width: 300, height: 300 },
        fps: 15,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        rememberLastUsedCamera: true,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
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
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>
            Upload an invoice/document or scan a QR code to analyze its contents.
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
                      <p className="text-xs text-gray-500">
                        High-quality PNG, JPG, JPEG, or PDF files supported
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
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-4">- OR -</p>
                {!scanResult && !isProcessing && (
                  <Button onClick={startScanning}>
                    Start Camera Scanning
                  </Button>
                )}
              </div>
            </div>

            <div id="reader" className="w-full max-w-xl mx-auto"></div>
            
            {isProcessing && (
              <div className="text-center">
                <p>Processing document...</p>
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
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                  >
                    Scan Another Code
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;