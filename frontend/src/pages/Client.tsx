import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Badge } from  "../components/ui/badge";
import { Lightbulb, LightbulbOff, Thermometer } from "lucide-react";
import { io, Socket } from "socket.io-client";

export default function Client() {
  const { topic } = useParams();
  const [temperature, setTemperature] = useState("--");
  const [ledState, setLedState] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketIo = io(`ws://${location.hostname}:3000`);
    setSocket(socketIo);

    socketIo.on("connect", () => {
      console.log("Socket.IO connected");
    });

    socketIo.on("message", (data: string) => {
      const [msgTopic, payloadStr] = data.split(":");
      if (msgTopic === topic) {
        const payload = JSON.parse(payloadStr);
        if ("temp" in payload) setTemperature(payload.temp);
        if ("led" in payload) setLedState(payload.led);
      }
    });

    return () => {
      socketIo.disconnect();
    };
  }, [topic]);

  const toggleLED = () => {
    const newState = !ledState;
    setLedState(newState);
    if (socket && socket.connected) {
      socket.emit("message", `${topic}:${JSON.stringify({ led: newState })}`);
    }
  };

  return (
    <div className="p-6 flex justify-center items-center h-[100dvh]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-center">
            <Badge className="text-white">{topic}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Badge variant="outline" className="text-center text-xl p-4 mx-auto">
            <Thermometer className="size-12"/> <strong>{temperature}°C</strong>
          </Badge>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ledState ? (
                <Lightbulb className="w-5 h-5 text-yellow-500 transition-opacity" />
              ) : (
                <LightbulbOff className="w-5 h-5 text-gray-400 transition-opacity" />
              )}
              <span>LED</span>
            </div>
            <Switch
              checked={ledState}
              onCheckedChange={toggleLED}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
