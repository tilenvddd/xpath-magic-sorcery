import { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const newScanner = new Html5QrcodeScanner(
      "reader",
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
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

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    if (scanner) {
      scanner.clear();
    }
    toast.success("QR Code scanned successfully!");
  };

  const handleScanError = (err: string) => {
    console.warn(err);
  };

  const startScanning = () => {
    if (scanner) {
      scanner.render(handleScanSuccess, handleScanError);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>QR Code Scanner</CardTitle>
          <CardDescription>
            Upload or scan a QR code to analyze its contents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div id="reader" className="w-full max-w-xl mx-auto"></div>
            
            {!scanResult && (
              <div className="text-center">
                <Button onClick={startScanning}>
                  Start Scanning
                </Button>
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