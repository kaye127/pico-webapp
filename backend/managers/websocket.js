class WebSocketManager {
  io;
  devices = new Map();
  clients = new Map();
  deviceSockets = new Map();
  clientSockets = new Map();

  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle client registration (web frontend)
      socket.on('register_client', (data) => {
        this.handleClientRegistration(socket, data.deviceName);
      });

      // Handle device registration (Raspberry Pi)
      socket.on('register_device', (data) => {
        this.handleDeviceRegistration(socket, data.deviceName);
      });

      // Handle temperature data from device
      socket.on('temperature_data', (data) => {
        this.handleTemperatureData(socket, data);
      });

      // Handle LED control from client
      socket.on('led_control', (data) => {
        this.handleLEDControl(socket, data);
      });

      // Handle LED state update from device
      socket.on('led_state', (data) => {
        this.handleLEDState(socket, data);
      });

      // Handle heartbeat
      socket.on('heartbeat', () => {
        socket.emit('heartbeat_ack', { timestamp: new Date() });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  handleClientRegistration(socket, deviceName) {
    try {
      socket.join(`device:${deviceName}`);

      const clientData = {
        deviceName,
        socketId: socket.id,
        connectedAt: new Date()
      };

      this.clients.set(socket.id, clientData);
      this.clientSockets.set(socket.id, socket);

      socket.emit('client_registered', { 
        deviceName, 
        topic: `device:${deviceName}`,
        timestamp: new Date()
      });

      const deviceData = this.devices.get(deviceName);
      if (deviceData) {
        socket.emit('device_status', {
          deviceName,
          isOnline: true,
          temperature: deviceData.temperature,
          humidity: deviceData.humidity,
          ledState: deviceData.ledState,
          lastSeen: deviceData.lastSeen
        });
      }

      console.log(`👤 Client registered for device: ${deviceName}`);
    } catch (error) {
      socket.emit('registration_error', { 
        error: error instanceof Error ? error.message : 'Registration failed' 
      });
      console.error(`❌ Client registration failed: ${error}`);
    }
  }

  handleDeviceRegistration(socket, deviceName) {
    try {
      socket.join(`device:${deviceName}`);

      const deviceData = {
        deviceName,
        lastSeen: new Date(),
        socketId: socket.id
      };

      this.devices.set(deviceName, deviceData);
      this.deviceSockets.set(socket.id, socket);

      socket.emit('device_registered', { 
        deviceName,
        timestamp: new Date()
      });

      this.io.to(`device:${deviceName}`).emit('device_connected', {
        deviceName,
        timestamp: new Date()
      });

      console.log(`📱 Device registered: ${deviceName}`);
    } catch (error) {
      socket.emit('registration_error', { 
        error: error instanceof Error ? error.message : 'Device registration failed' 
      });
      console.error(`❌ Device registration failed: ${error}`);
    }
  }

  handleTemperatureData(socket, data) {
    try {
      const deviceData = Array.from(this.devices.values()).find(d => d.socketId === socket.id);
      if (!deviceData) return;

      deviceData.temperature = data.temperature;
      deviceData.humidity = data.humidity;
      deviceData.lastSeen = new Date();
      this.devices.set(deviceData.deviceName, deviceData);

      const temperatureData = {
        deviceName: deviceData.deviceName,
        temperature: data.temperature,
        timestamp: new Date()
      };

      this.io.to(`device:${deviceData.deviceName}`).emit('temperature_update', temperatureData);

      this.broadcastToSSE('temperature', temperatureData);

      console.log(`🌡️ Temperature data from ${deviceData.deviceName}: ${data.temperature}°C`);
    } catch (error) {
      console.error(`❌ Failed to handle temperature data: ${error}`);
    }
  }

  handleLEDControl(socket, data) {
    try {
      const clientData = this.clients.get(socket.id);
      if (!clientData) return;

      const deviceData = this.devices.get(clientData.deviceName);
      if (!deviceData) {
        socket.emit('error', { message: 'Device not connected' });
        return;
      }

      const deviceSocket = this.deviceSockets.get(deviceData.socketId);
      if (!deviceSocket) {
        socket.emit('error', { message: 'Device socket not found' });
        return;
      }

      deviceSocket.emit('led_control', {
        command: data.command,
        timestamp: new Date()
      });

      console.log(`💡 LED control sent to ${clientData.deviceName}: ${data.command}`);
    } catch (error) {
      socket.emit('error', { 
        error: error instanceof Error ? error.message : 'LED control failed' 
      });
      console.error(`❌ LED control failed: ${error}`);
    }
  }

  handleLEDState(socket, data) {
    try {
      const deviceData = Array.from(this.devices.values()).find(d => d.socketId === socket.id);
      if (!deviceData) return;

      deviceData.ledState = data.state;
      deviceData.lastSeen = new Date();
      this.devices.set(deviceData.deviceName, deviceData);

      const ledStateData = {
        deviceName: deviceData.deviceName,
        ledState: data.state,
        timestamp: new Date()
      };

      this.io.to(`device:${deviceData.deviceName}`).emit('led_state_update', ledStateData);

      this.broadcastToSSE('led_state', ledStateData);

      console.log(`💡 LED state updated for ${deviceData.deviceName}: ${data.state ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error(`❌ Failed to handle LED state: ${error}`);
    }
  }

  handleDisconnection(socket) {
    const clientData = this.clients.get(socket.id);
    if (clientData) {
      this.clients.delete(socket.id);
      this.clientSockets.delete(socket.id);
      console.log(`👤 Client disconnected: ${clientData.deviceName}`);
    }

    const deviceData = Array.from(this.devices.values()).find(d => d.socketId === socket.id);
    if (deviceData) {
      this.devices.delete(deviceData.deviceName);
      this.deviceSockets.delete(socket.id);

      this.io.to(`device:${deviceData.deviceName}`).emit('device_disconnected', {
        deviceName: deviceData.deviceName,
        timestamp: new Date()
      });

      console.log(`📱 Device disconnected: ${deviceData.deviceName}`);
    }
  }

  broadcastToSSE(event, data) {
    if (this.sseCallback) {
      this.sseCallback(event, data);
    }
  }

  setSSECallback(callback) {
    this.sseCallback = callback;
  }

  getStats() {
    return {
      totalDevices: this.devices.size,
      connectedClients: this.clients.size,
      devices: Array.from(this.devices.values()).map(device => ({
        deviceName: device.deviceName,
        temperature: device.temperature,
        humidity: device.humidity,
        ledState: device.ledState,
        lastSeen: device.lastSeen
      }))
    };
  }
}

export { WebSocketManager };
