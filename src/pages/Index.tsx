import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your App</h1>
        <p className="text-xl text-gray-600 mb-8">Start building your amazing project here!</p>
        <Button asChild>
          <Link to="/qr-scanner">Try QR Code Scanner</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;