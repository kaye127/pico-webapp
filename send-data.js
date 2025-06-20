// send-data.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("✅ Connected");

  socket.emit("temperature_data", {
    temperature: 26.3,
    humidity: 61.2,
    timestamp: new Date().toISOString()
  });

  console.log("📤 Sent temperature_data");

  setTimeout(() => {
    socket.disconnect();
  }, 1000);
});
