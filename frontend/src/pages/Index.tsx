import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

export default function Index() {
  const [deviceName, setDeviceName] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (deviceName.trim() && userName.trim()) {
      navigate(`/${deviceName.trim()}?user=${encodeURIComponent(userName.trim())}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">IoT Device Monitor</CardTitle>
          <p className="text-center text-muted-foreground">
            Connect to your IoT device for real-time monitoring
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <input
                id="userName"
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label htmlFor="deviceName" className="block text-sm font-medium mb-2">
                Device Name
              </label>
              <input
                id="deviceName"
                type="text"
                placeholder="Enter device name (e.g., sensor-01)"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Connect to Device
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}