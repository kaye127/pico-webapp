import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketManager } from './managers/websocket.js';
import { SSEManager } from './managers/sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Environment variables with defaults
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || (NODE_ENV === 'production' ? '' : 'http://localhost:5173');

// Enable CORS
const corsOptions = {
  origin: NODE_ENV === 'production' ? true : [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  transports: ['websocket', 'polling'],
  cors: corsOptions
});

// Initialize managers
const webSocketManager = new WebSocketManager(io);
const sseManager = new SSEManager();

// Connect WebSocket manager to SSE for broadcasting
webSocketManager.setSSECallback((event, data) => {
  sseManager.broadcast(event, data);
});

// Serve static files in production
if (NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, 'frontend', 'dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// IoT device data endpoint
app.post("/api/data", (req, res) => {
  const { deviceName, temperature, humidity } = req.body;

  if (!deviceName || temperature === undefined) {
    return res.status(400).json({ error: "Missing deviceName or temperature" });
  }

  // Log the incoming data
  console.log(`📡 Received data from ${deviceName}: ${temperature}°C${humidity ? `, ${humidity}%` : ''}`);

  // Try forwarding to WebSocket clients
  let device = webSocketManager.getDevice(deviceName);
  if (device) {
    const deviceSocket = webSocketManager.deviceSockets.get(device.socketId);
    if (deviceSocket) {
      deviceSocket.emit("temperature_data", { temperature, humidity });
      console.log(`📨 Sent to WebSocket client for ${deviceName}`);
    }
  }

  // Forward to SSE clients subscribed to this device
  sseManager.sendToDevice(deviceName, "temperature_data", { temperature, humidity });
  console.log(`📤 Broadcasted to SSE clients for ${deviceName}`);

  return res.status(200).json({ 
    message: "Data forwarded", 
    device: deviceName,
    timestamp: new Date().toISOString()
  });
});

// Server-Sent Events endpoint for real-time monitoring
app.get('/api/stream', (req, res) => {
  sseManager.addClient(req, res);
});

// Get device stats for admin dashboard
app.get('/api/stats', (req, res) => {
  const stats = webSocketManager.getStats();
  res.json(stats);
});

// Get all devices for admin dashboard
app.get('/api/devices', (req, res) => {
  const devices = webSocketManager.getAllDevices();
  res.json({ devices, timestamp: new Date().toISOString() });
});

// Get specific device data
app.get('/api/device/:deviceName', (req, res) => {
  const { deviceName } = req.params;
  const device = webSocketManager.getDevice(deviceName);
  
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  
  res.json(device);
});

// Catch-all handler for client-side routing in production
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IoT Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 SSE Stream: http://localhost:${PORT}/api/stream`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Admin API: http://localhost:${PORT}/api/stats`);
  
  if (NODE_ENV === 'production') {
    console.log(`🌐 Frontend served from: http://localhost:${PORT}`);
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});