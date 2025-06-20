class WebSocketManager {
  io;
  devices = new Map(); // deviceName -> device data
  clients = new Map(); // socketId -> client data
  deviceSockets = new Map(); // socketId -> socket (for devices)
  clientSockets = new Map(); // socketId -> socket (for clients)
  sseCallback = null;

  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
    this.startHeartbeat();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Handle client registration (web frontend)
      socket.on('register_client', (data) => {
        this.handleClientRegistration(socket, data);
      });

      // Handle device registration (Raspberry Pi/IoT device)
      socket.on('register_device', (data) => {
        this.handleDeviceRegistration(socket, data);
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

  handleClientRegistration(socket, data) {
    try {
      const { deviceName, userName } = data;
      
      if (!deviceName || !userName) {
        socket.emit('registration_error', { 
          error: 'Device name and user name are required' 
        });
        return;
      }

      socket.join(`device:${deviceName}`);

      const clientData = {
        deviceName,
        userName,
        socketId: socket.id,
        connectedAt: new Date(),
        type: 'client'
      };

      this.clients.set(socket.id, clientData);
      this.clientSockets.set(socket.id, socket);

      socket.emit('client_registered', { 
        deviceName,
        userName,
        topic: `device:${deviceName}`,
        timestamp: new Date()
      });

      // Send current device status if device is connected
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
      } else {
        socket.emit('device_status', {
          deviceName,
          isOnline: false,
          message: 'Device not connected'
        });
      }

      console.log(`👤 Client registered: ${userName} for device ${deviceName}`);
    } catch (error) {
      socket.emit('registration_error', { 
        error: error instanceof Error ? error.message : 'Registration failed' 
      });
      console.error(`❌ Client registration failed: ${error}`);
    }
  }

  handleDeviceRegistration(socket, data) {
    try {
      const { deviceName, deviceType = 'sensor' } = data;
      
      if (!deviceName) {
        socket.emit('registration_error', { 
          error: 'Device name is required' 
        });
        return;
      }

      socket.join(`device:${deviceName}`);

      const deviceData = {
        deviceName,
        deviceType,
        socketId: socket.id,
        isOnline: true,
        connectedAt: new Date(),
        lastSeen: new Date(),
        temperature: null,
        humidity: null,
        ledState: false,
        type: 'device'
      };

      this.devices.set(deviceName, deviceData);
      this.deviceSockets.set(socket.id, socket);

      socket.emit('device_registered', { 
        deviceName,
        deviceType,
        timestamp: new Date()
      });

      // Notify all clients listening to this device
      this.io.to(`device:${deviceName}`).emit('device_connected', {
        deviceName,
        timestamp: new Date()
      });

      // Broadcast to SSE for admin monitoring
      this.broadcastToSSE('device_connected', {
        deviceName,
        deviceType,
        timestamp: new Date()
      });

      console.log(`📱 Device registered: ${deviceName} (${deviceType})`);
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
      if (!deviceData) {
        console.warn('Temperature data received from unregistered device');
        return;
      }

      const { temperature, humidity } = data;
      
      // Update device data
      deviceData.temperature = temperature;
      deviceData.humidity = humidity;
      deviceData.lastSeen = new Date();
      this.devices.set(deviceData.deviceName, deviceData);

      const temperatureData = {
        deviceName: deviceData.deviceName,
        temperature,
        humidity,
        timestamp: new Date()
      };

      // Broadcast to all clients listening to this device
      this.io.to(`device:${deviceData.deviceName}`).emit('temperature_update', temperatureData);

      // Broadcast to SSE for admin monitoring
      this.broadcastToSSE('temperature', temperatureData);

      console.log(`🌡️ Temperature data from ${deviceData.deviceName}: ${temperature}°C, ${humidity}%`);
    } catch (error) {
      console.error(`❌ Failed to handle temperature data: ${error}`);
    }
  }

  handleLEDControl(socket, data) {
    try {
      const clientData = this.clients.get(socket.id);
      if (!clientData) {
        socket.emit('error', { message: 'Client not registered' });
        return;
      }

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

      const { command } = data;
      
      // Send command to device
      deviceSocket.emit('led_control', {
        command,
        timestamp: new Date()
      });

      // Broadcast to SSE for admin monitoring
      this.broadcastToSSE('led_command', {
        deviceName: clientData.deviceName,
        command,
        sentBy: clientData.userName,
        timestamp: new Date()
      });

      console.log(`💡 LED control sent to ${clientData.deviceName}: ${command} (by ${clientData.userName})`);
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
      if (!deviceData) {
        console.warn('LED state received from unregistered device');
        return;
      }

      const { state } = data;
      
      // Update device data
      deviceData.ledState = state;
      deviceData.lastSeen = new Date();
      this.devices.set(deviceData.deviceName, deviceData);

      const ledStateData = {
        deviceName: deviceData.deviceName,
        ledState: state,
        timestamp: new Date()
      };

      // Broadcast to all clients listening to this device
      this.io.to(`device:${deviceData.deviceName}`).emit('led_state_update', ledStateData);

      // Broadcast to SSE for admin monitoring
      this.broadcastToSSE('led_state', ledStateData);

      console.log(`💡 LED state updated for ${deviceData.deviceName}: ${state ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error(`❌ Failed to handle LED state: ${error}`);
    }
  }

  handleDisconnection(socket) {
    // Handle client disconnection
    const clientData = this.clients.get(socket.id);
    if (clientData) {
      this.clients.delete(socket.id);
      this.clientSockets.delete(socket.id);
      console.log(`👤 Client disconnected: ${clientData.userName} (${clientData.deviceName})`);
    }

    // Handle device disconnection
    const deviceData = Array.from(this.devices.values()).find(d => d.socketId === socket.id);
    if (deviceData) {
      deviceData.isOnline = false;
      deviceData.lastSeen = new Date();
      this.devices.set(deviceData.deviceName, deviceData);
      this.deviceSockets.delete(socket.id);

      // Notify all clients listening to this device
      this.io.to(`device:${deviceData.deviceName}`).emit('device_disconnected', {
        deviceName: deviceData.deviceName,
        timestamp: new Date()
      });

      // Broadcast to SSE for admin monitoring
      this.broadcastToSSE('device_disconnected', {
        deviceName: deviceData.deviceName,
        timestamp: new Date()
      });

      console.log(`📱 Device disconnected: ${deviceData.deviceName}`);
    }
  }

  startHeartbeat() {
    // Send heartbeat to all connected devices every 30 seconds
    setInterval(() => {
      this.deviceSockets.forEach((socket, socketId) => {
        if (socket.connected) {
          socket.emit('heartbeat');
        }
      });
    }, 30000);
  }

  broadcastToSSE(event, data) {
    if (this.sseCallback) {
      this.sseCallback(event, data);
    }
  }

  setSSECallback(callback) {
    this.sseCallback = callback;
  }

  getDevice(deviceName) {
    return this.devices.get(deviceName);
  }

  getAllDevices() {
    return Array.from(this.devices.values()).map(device => ({
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      isOnline: device.isOnline,
      temperature: device.temperature,
      humidity: device.humidity,
      ledState: device.ledState,
      lastSeen: device.lastSeen,
      connectedAt: device.connectedAt
    }));
  }

  getStats() {
    const totalDevices = this.devices.size;
    const onlineDevices = Array.from(this.devices.values()).filter(d => d.isOnline).length;
    const connectedClients = this.clients.size;

    return {
      totalDevices,
      onlineDevices,
      connectedClients,
      devices: this.getAllDevices(),
      timestamp: new Date()
    };
  }
}

export { WebSocketManager };