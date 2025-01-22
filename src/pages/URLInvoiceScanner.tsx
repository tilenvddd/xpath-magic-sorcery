import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const URLInvoiceScanner = () => {
  const [url, setUrl] = useState<string>("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScanSuccess = (decodedText: string) => {
    console.log("Successfully decoded QR code:", decodedText);
    setScanResult(decodedText);
    toast.success("QR code scanned successfully!");
    setIsProcessing(false);
  };

  const handleScanError = (err: string) => {
    console.warn("Scan error:", err);
    setIsProcessing(false);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsProcessing(true);
    setScanResult(null); // Reset previous scan result
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
      
      const html5QrCode = new Html5Qrcode("reader");

      try {
        const file = new File([blob], 'image.jpg', {
          type: blob.type || 'image/jpeg',
          lastModified: Date.now()
        });
        console.log("Created file object:", file.name, file.type, file.size);

        const qrCodeMessage = await html5QrCode.scanFile(file, true);
        console.log("QR code scanning result:", qrCodeMessage);
        handleScanSuccess(qrCodeMessage);
      } catch (error) {
        if (error instanceof Error) {
          console.error("QR code scanning error:", error);
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
          <CardTitle>URL Invoice QR Scanner</CardTitle>
          <CardDescription>
            Enter a URL to scan its QR code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <Input
                type="url"
                placeholder="Enter image URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
              />
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Scan QR Code"}
              </Button>
            </form>

            <div id="reader" className="hidden"></div>
            
            {isProcessing && (
              <div className="text-center">
                <p>Processing URL...</p>
              </div>
            )}

            {scanResult && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Scan Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg break-all">{scanResult}</p>
                  <div className="flex gap-4 mt-4">
                    <Button onClick={() => setScanResult(null)}>
                      Scan Another URL
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

            <div className="text-center mt-4">
              <Link to="/pdf-invoice-scanner">
                <Button variant="outline">
                  Switch to PDF Scanner
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default URLInvoiceScanner;