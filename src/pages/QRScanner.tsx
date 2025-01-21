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

  // DOM Ready function
  const domReady = (fn: () => void) => {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      setTimeout(fn, 1000);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  };

  useEffect(() => {
    domReady(() => {
      const newScanner = new Html5QrcodeScanner(
        "reader",
        {
          qrbox: {
            width: 250,
            height: 250,
          },
          fps: 10,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          },
          rememberLastUsedCamera: true,
          aspectRatio: 1.0,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        },
        false
      );

      setScanner(newScanner);
    });

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    if (scanner) {
      scanner.clear();
    }
    toast.success("QR Code scanned successfully!");
    setIsProcessing(false);
  };

  const handleScanError = (err: string) => {
    console.warn(err);
    setIsProcessing(false);
  };

  const startScanning = () => {
    if (scanner) {
      scanner.render(handleScanSuccess, handleScanError);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const html5QrCode = new Html5Qrcode("reader");
      
      const imageUrl = URL.createObjectURL(file);
      
      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        handleScanSuccess(decodedText);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("No MultiFormat Readers")) {
            toast.error("Unable to detect QR code. Try these tips:\n- Ensure image is well-lit and in focus\n- QR code should be clearly visible\n- Try a higher resolution image");
          } else {
            toast.error("Failed to process the file. Please try a different image with a clearer QR code.");
          }
          console.log("Scanning error:", error.message);
        }
        handleScanError(error as string);
      } finally {
        URL.revokeObjectURL(imageUrl);
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Error processing the file. Please try again with a different file.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Scanner</h1>
          <p className="text-gray-600">Scan QR codes using your camera or upload an image containing a QR code</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera Scanner Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Scan with Camera</CardTitle>
              <CardDescription>
                Position the QR code within the frame to scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div id="reader" className="overflow-hidden rounded-lg"></div>
              {!scanResult && !isProcessing && (
                <Button 
                  onClick={startScanning}
                  className="w-full mt-4"
                >
                  Start Camera Scanning
                </Button>
              )}
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Upload QR Code Image</CardTitle>
              <CardDescription>
                Upload an image containing a QR code to scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label 
                htmlFor="file-upload" 
                className="block w-full"
              >
                <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG or JPEG</p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </div>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {(isProcessing || scanResult) && (
          <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle>Scan Result</CardTitle>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Processing...</p>
                </div>
              ) : scanResult && (
                <div className="space-y-4">
                  <p className="text-lg break-all bg-gray-50 p-4 rounded-lg border">{scanResult}</p>
                  <Button 
                    onClick={() => {
                      setScanResult(null);
                      startScanning();
                    }}
                  >
                    Scan Another Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QRScanner;