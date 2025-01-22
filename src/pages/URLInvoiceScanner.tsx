import { useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

const URLInvoiceScanner = () => {
  const [url, setUrl] = useState<string>("");
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

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const html5QrCode = new Html5Qrcode("reader");

      try {
        const qrCodeMessage = await html5QrCode.scanFile(blob, true);
        handleScanSuccess(qrCodeMessage);
      } catch (error) {
        if (error instanceof Error) {
          toast.error("No QR code found in the image. Please ensure the URL points to a clear, readable QR code.", {
            duration: 5000
          });
        }
        handleScanError(error as string);
      } finally {
        await html5QrCode.clear();
      }
    } catch (error) {
      toast.error("Failed to fetch the image. Please check the URL and try again.", {
        duration: 5000
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

            <div id="reader" className="w-full max-w-xl mx-auto"></div>
            
            {isProcessing && (
              <div className="text-center">
                <p>Processing URL...</p>
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