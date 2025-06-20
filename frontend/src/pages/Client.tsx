import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { 
  Lightbulb, 
  LightbulbOff, 
  Thermometer, 
  Droplets, 
  Wifi, 
  WifiOff,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface DeviceStatus {
  deviceName: string;
  isOnline: boolean;
  temperature?: number;
  humidity?: number;
  ledState?: boolean;
  lastSeen?: string;
  message?: string;
}

export default function Client() {
  const { topic: deviceName } = useParams();
  const [searchParams] = useSearchParams();
  const userName = searchParams.get('user') || 'Anonymous';
  
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    deviceName: deviceName || '',
    isOnline: false
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deviceName) return;

    const socketIo = io(`http://localhost:3000`);
    setSocket(socketIo);

    socketIo.on("connect", () => {
      console.log("Socket.IO connected");
      setConnectionStatus('connected');
      setError(null);
      
      // Register as client
      socketIo.emit("register_client", { 
        deviceName, 
        userName 
      });
    });

    socketIo.on("disconnect", () => {
      console.log("Socket.IO disconnected");
      setConnectionStatus('disconnected');
    });

    socketIo.on("client_registered", (data) => {
      console.log("Client registered:", data);
    });

    socketIo.on("device_status", (status: DeviceStatus) => {
      console.log("Device status:", status);
      setDeviceStatus(status);
    });

    socketIo.on("device_connected", (data) => {
      console.log("Device connected:", data);
      setDeviceStatus(prev => ({
        ...prev,
        isOnline: true
      }));
    });

    socketIo.on("device_disconnected", (data) => {
      console.log("Device disconnected:", data);
      setDeviceStatus(prev => ({
        ...prev,
        isOnline: false,
        lastSeen: data.timestamp
      }));
    });

    socketIo.on("temperature_update", (data) => {
      console.log("Temperature update:", data);
      setDeviceStatus(prev => ({
        ...prev,
        temperature: data.temperature,
        humidity: data.humidity,
        isOnline: true
      }));
    });

    socketIo.on("led_state_update", (data) => {
      console.log("LED state update:", data);
      setDeviceStatus(prev => ({
        ...prev,
        ledState: data.ledState,
        isOnline: true
      }));
    });

    socketIo.on("registration_error", (data) => {
      console.error("Registration error:", data);
      setError(data.error);
    });

    socketIo.on("error", (data) => {
      console.error("Socket error:", data);
      setError(data.message || data.error);
    });

    return () => {
      socketIo.disconnect();
    };
  }, [deviceName, userName]);

  const toggleLED = () => {
    if (!socket || !socket.connected) {
      setError("Not connected to server");
      return;
    }

    const newState = !deviceStatus.ledState;
    socket.emit("led_control", { 
      command: newState ? 'on' : 'off'
    });
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Device Monitor</h1>
            <p className="text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">Server Connection</span>
              </div>
              <span className={getConnectionStatusColor()}>
                {getConnectionStatusText()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{deviceName}</Badge>
                {deviceStatus.isOnline ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
              </div>
              <Badge variant={deviceStatus.isOnline ? "default" : "destructive"}>
                {deviceStatus.isOnline ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Temperature and Humidity */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg mx-auto">
                <div className="text-center">
                  <Thermometer className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">
                    {deviceStatus.temperature !== undefined ? `${deviceStatus.temperature}°C` : '--'}
                  </div>
                  <div className="text-sm text-muted-foreground">Temperature</div>
                </div>
              </div>
              
             
            {/* </div> */}

            {/* LED Control */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                {deviceStatus.ledState ? (
                  <Lightbulb className="w-6 h-6 text-yellow-500" />
                ) : (
                  <LightbulbOff className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">LED Control</div>
                  <div className="text-sm text-muted-foreground">
                    Status: {deviceStatus.ledState ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
              <Switch
                checked={deviceStatus.ledState || false}
                onCheckedChange={toggleLED}
                disabled={!deviceStatus.isOnline || connectionStatus !== 'connected'}
              />
            </div>

            {/* Last Seen */}
            {deviceStatus.lastSeen && (
              <div className="text-sm text-muted-foreground text-center">
                Last seen: {new Date(deviceStatus.lastSeen).toLocaleString()}
              </div>
            )}

            {/* Offline Message */}
            {!deviceStatus.isOnline && deviceStatus.message && (
              <div className="text-center text-muted-foreground">
                {deviceStatus.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}