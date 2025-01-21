import { useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const newScanner = new Html5QrcodeScanner(
      "reader",
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 30,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        rememberLastUsedCamera: true,
        aspectRatio: undefined,
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
      
      if (file.type === 'application/pdf') {
        toast.error("PDF scanning is currently not supported directly. Please convert the PDF to an image first or take a screenshot of the QR code.");
        setIsProcessing(false);
        return;
      }

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
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Error processing the file. Please try again with a different file.");
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }
      const blob = await response.blob();
      const file = new File([blob], "qr-from-url.png", { type: blob.type });
      
      const html5QrCode = new Html5Qrcode("reader");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (error) {
      toast.error("Failed to scan QR code from URL. Please ensure the URL is correct and points to a valid QR code image.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1">
              <TabsTrigger value="camera" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-4">
              {!scanResult && !isProcessing && (
                <Button 
                  onClick={startScanning}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  Start Camera Scanning
                </Button>
              )}
              <div id="reader" className="mt-4"></div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <label className="block w-full">
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="mb-2 text-sm text-slate-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG, JPEG supported</p>
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
            </TabsContent>

            <TabsContent value="url" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Enter URL of QR code image"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleUrlSubmit}
                  disabled={isProcessing}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  Scan
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="text-center mt-4">
              <p>Processing...</p>
            </div>
          )}

          {scanResult && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Scan Result</h3>
                <p className="text-sm break-all mb-4">{scanResult}</p>
                <Button 
                  onClick={() => {
                    setScanResult(null);
                    setUrl("");
                    startScanning();
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  Scan Another Code
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;