import { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Camera, Upload } from "lucide-react";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    setScanner(html5QrCode);

    return () => {
      if (html5QrCode) {
        html5QrCode.clear().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scanner) return;

    try {
      setIsScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        {
          qrbox: { width: 250, height: 250 },
          fps: 10,
        },
        (decodedText) => {
          setScanResult(decodedText);
          toast.success("QR Code successfully scanned!");
          stopScanning();
        },
        (error) => {
          if (!error.includes("No QR code found")) {
            console.warn(error);
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to start camera scanning");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        setIsScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scanner) {
      toast.error("Please select a file to scan");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please select a valid image file");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await scanner.scanFile(file, false);
      setScanResult(result);
      toast.success("QR code successfully scanned!");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error("Failed to scan QR code from file");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardContent className="p-6">
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">QR Code Scanner</h1>
            <p className="text-gray-600">Scan or upload QR Codes to decode their contents.</p>
          </header>

          <div className="space-y-6">
            <div id="qr-scanner-container" className="text-center">
              <div 
                id="reader" 
                className="w-full max-w-[500px] mx-auto aspect-square rounded-lg overflow-hidden bg-gray-100"
              ></div>
              
              <Button
                onClick={isScanning ? stopScanning : startScanning}
                className="mt-4"
              >
                <Camera className="mr-2" />
                {isScanning ? "Stop Scanning" : "Start Scanning"}
              </Button>
            </div>

            <div id="upload-container" className="text-center">
              <label htmlFor="file-upload" className="block">
                <Button variant="outline" className="w-full" disabled={isProcessing}>
                  <Upload className="mr-2" />
                  Upload a QR Code
                </Button>
              </label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            {scanResult && (
              <div id="scan-result" className="mt-6 p-4 border rounded-lg bg-gray-50">
                <h2 className="font-semibold mb-2">Scan Result:</h2>
                <p className="break-all text-gray-700">{scanResult}</p>
                <Button
                  className="mt-4 w-full"
                  onClick={() => setScanResult(null)}
                >
                  Scan Another Code
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;