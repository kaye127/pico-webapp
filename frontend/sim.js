import { io } from "socket.io-client";

// Update to your server address and port
const socket = io("http://localhost:3000", {
  transports: ["websocket"]
});

const deviceName = "es";

socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server");

  // Step 1: Register the device
  socket.emit("register_device", {
    deviceName,
    deviceType: "sensor"
  });

  // Step 2: Send temperature data every 5 seconds
  setInterval(() => {
    const temperature = (20 + Math.random() * 10).toFixed(1);

    socket.emit("temperature_data", {
      temperature,
    });

    console.log(`🌡️ Sent data => Temp: ${temperature}°C`);
  }, 5000);
});

// Step 3: Listen for LED control commands
socket.on("led_control", (data) => {
  console.log("💡 Received LED command from client:", data);

  const { command } = data;

  // Simulate changing the LED state
  const ledState = command === "on";

  // Step 4: Send updated LED state
  socket.emit("led_state", {
    state: ledState
  });

  console.log(`🟢 LED is now: ${ledState ? "ON" : "OFF"}`);
});

// Handle successful registration
socket.on("device_registered", (data) => {
  console.log("📲 Device registered:", data);
});

// Handle disconnect
socket.on("disconnect", () => {
  console.log("🔌 Disconnected from server");
});
