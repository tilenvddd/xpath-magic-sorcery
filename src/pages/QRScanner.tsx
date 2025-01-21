import { useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useEffect } from "react";
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

  useEffect(() => {
    const newScanner = new Html5QrcodeScanner(
      "reader",
      {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 15,
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
      
      const imageUrl = URL.createObjectURL(file);
      
      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        handleScanSuccess(decodedText);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("No MultiFormat Readers")) {
            toast.error("Unable to detect QR code. Please ensure:", {
              description: [
                "• The image is clear and well-lit",
                "• The QR code is not damaged or blurry",
                "• The file format is PNG, JPG, or JPEG",
                "• The image resolution is sufficient"
              ].join('\n')
            });
          } else {
            toast.error("Failed to process image", {
              description: "Please try uploading a different image with a clearer QR code"
            });
          }
          console.log("Scanning error:", error.message);
        }
        handleScanError(error as string);
      } finally {
        URL.revokeObjectURL(imageUrl);
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Error processing file", {
        description: "Please ensure the file is a valid image (PNG, JPG, or JPEG) and try again"
      });
      setIsProcessing(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      handleScanSuccess(url.trim());
      setUrl("");
    } else {
      toast.error("Please enter a valid URL");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6">
          <Tabs defaultValue="camera" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="camera" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="mt-4">
              {!scanResult && !isProcessing && (
                <Button 
                  onClick={startScanning}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b]"
                >
                  Start Camera Scanning
                </Button>
              )}
              <div id="reader" className="w-full max-w-xl mx-auto mt-4"></div>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="flex items-center justify-center w-full">
                <label htmlFor="file-upload" className="w-full">
                  <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">High-quality PNG, JPG or JPEG recommended</p>
                    </div>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-4">
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <Input
                  type="url"
                  placeholder="Enter URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b]">
                  Process URL
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {isProcessing && (
            <div className="text-center mt-4">
              <p>Processing...</p>
            </div>
          )}

          {scanResult && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <p className="text-lg break-all mb-4">{scanResult}</p>
                <Button 
                  onClick={() => {
                    setScanResult(null);
                    setUrl("");
                  }}
                  className="w-full bg-[#0f172a] hover:bg-[#1e293b]"
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