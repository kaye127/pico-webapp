// simulate-device.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const DEVICE_NAME = "sensor-pi-001";

socket.on("connect", () => {
  console.log("✅ Connected to server");

  // Step 1: Register device
  socket.emit("register_device", {
    deviceName: DEVICE_NAME,
    deviceType: "raspberry_pi_sensor"
  });

  // Step 2: Listen for registration success and send temperature
  socket.on("device_registered", () => {
    console.log("🎉 Device registered");

    // Simulate sensor reading
    const data = {
      temperature: 27.1,
      humidity: 59.2,
      timestamp: new Date().toISOString()
    };

    // Step 3: Emit temperature data
    socket.emit("temperature_data", data);
    console.log("📤 Sent temperature_data:", data);
  });
});
