import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  Thermometer, 
  Droplets, 
  Lightbulb, 
  LightbulbOff,
  RefreshCw,
  Users,
  Monitor,
  Activity
} from "lucide-react";

interface Device {
  deviceName: string;
  deviceType: string;
  isOnline: boolean;
  temperature?: number;
  humidity?: number;
  ledState?: boolean;
  lastSeen: string;
  connectedAt: string;
}

interface Stats {
  totalDevices: number;
  onlineDevices: number;
  connectedClients: number;
  devices: Device[];
  timestamp: string;
}

interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/stats");
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up SSE connection for real-time updates
    const eventSource = new EventSource("http://localhost:3000/api/stream");

    eventSource.onopen = () => {
      console.log("SSE connection opened");
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(prev => [
          { type: 'message', data, timestamp: new Date().toISOString() },
          ...prev.slice(0, 49) // Keep last 50 events
        ]);
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'connected', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
    });

    eventSource.addEventListener('temperature', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'temperature', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
      // Refresh stats to get updated temperature
      fetchStats();
    });

    eventSource.addEventListener('led_state', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'led_state', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
      // Refresh stats to get updated LED state
      fetchStats();
    });

    eventSource.addEventListener('led_command', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'led_command', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
    });

    eventSource.addEventListener('device_connected', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'device_connected', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
      fetchStats();
    });

    eventSource.addEventListener('device_disconnected', (event) => {
      const data = JSON.parse(event.data);
      setEvents(prev => [
        { type: 'device_disconnected', data, timestamp: data.timestamp },
        ...prev.slice(0, 49)
      ]);
      fetchStats();
    });

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setError("Connection to real-time stream failed");
    };

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const formatEventType = (type: string) => {
    switch (type) {
      case 'temperature': return 'Temperature Update';
      case 'led_state': return 'LED State Change';
      case 'led_command': return 'LED Command';
      case 'device_connected': return 'Device Connected';
      case 'device_disconnected': return 'Device Disconnected';
      case 'connected': return 'Admin Connected';
      default: return type;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer className="w-4 h-4" />;
      case 'led_state': return <Lightbulb className="w-4 h-4" />;
      case 'led_command': return <Activity className="w-4 h-4" />;
      case 'device_connected': return <Wifi className="w-4 h-4 text-green-500" />;
      case 'device_disconnected': return <WifiOff className="w-4 h-4 text-red-500" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time IoT device monitoring and management</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <Activity className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDevices}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.onlineDevices} online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online Devices</CardTitle>
                <Wifi className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.onlineDevices}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalDevices - stats.onlineDevices} offline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.connectedClients}</div>
                <p className="text-xs text-muted-foreground">
                  Active monitoring sessions
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Device Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Connected Devices</h2>
              <Button variant="outline" size="sm" onClick={fetchStats}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <div className="space-y-4">
              {stats?.devices.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No devices connected</p>
                  </CardContent>
                </Card>
              ) : (
                stats?.devices.map((device) => (
                  <Card key={device.deviceName}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{device.deviceName}</Badge>
                          <Badge variant="secondary">{device.deviceType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {device.isOnline ? (
                            <Wifi className="w-5 h-5 text-green-500" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-red-500" />
                          )}
                          <Badge variant={device.isOnline ? "default" : "destructive"}>
                            {device.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            {device.temperature !== undefined ? `${device.temperature}°C` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            {device.humidity !== undefined ? `${device.humidity}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {device.ledState ? (
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <LightbulbOff className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm">LED: {device.ledState ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Connected: {new Date(device.connectedAt).toLocaleString()}</div>
                        <div>Last seen: {new Date(device.lastSeen).toLocaleString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Real-time Events */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Real-time Events</h2>
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="text-sm">Live Activity Feed</CardTitle>
              </CardHeader>
              <CardContent className="h-full overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground">No events yet</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <div className="mt-0.5">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {formatEventType(event.type)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <pre className="whitespace-pre-wrap font-mono">
                              {JSON.stringify(event.data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}