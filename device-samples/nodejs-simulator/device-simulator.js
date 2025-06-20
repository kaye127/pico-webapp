#!/usr/bin/env node
/**
 * Node.js IoT Device Simulator
 * Simulates multiple IoT devices for testing the monitoring system
 */

import { io } from 'socket.io-client';

class DeviceSimulator {
  constructor(deviceName, serverUrl = 'http://localhost:3000') {
    this.deviceName = deviceName;
    this.serverUrl = serverUrl;
    this.socket = null;
    this.ledState = false;
    this.running = false;
    this.dataInterval = null;
    
    // Simulation parameters
    this.baseTemperature = 20 + Math.random() * 10; // 20-30°C base
    this.baseHumidity = 40 + Math.random() * 20;    // 40-60% base
  }

  connect() {
    console.log(`🚀 [${this.deviceName}] Connecting to ${this.serverUrl}...`);
    
    this.socket = io(this.serverUrl);
    
    this.socket.on('connect', () => {
      console.log(`🔌 [${this.deviceName}] Connected to server`);
      this.registerDevice();
    });

    this.socket.on('disconnect', () => {
      console.log(`❌ [${this.deviceName}] Disconnected from server`);
      this.running = false;
      if (this.dataInterval) {
        clearInterval(this.dataInterval);
      }
    });

    this.socket.on('device_registered', (data) => {
      console.log(`✅ [${this.deviceName}] Device registered:`, data);
      this.startDataTransmission();
    });

    this.socket.on('registration_error', (data) => {
      console.error(`❌ [${this.deviceName}] Registration failed:`, data);
    });

    this.socket.on('led_control', (data) => {
      console.log(`💡 [${this.deviceName}] LED control received:`, data);
      const command = data.command?.toLowerCase();
      
      if (command === 'on') {
        this.setLED(true);
      } else if (command === 'off') {
        this.setLED(false);
      }
    });

    this.socket.on('heartbeat', () => {
      this.socket.emit('heartbeat_ack', { 
        timestamp: new Date().toISOString() 
      });
    });

    this.socket.on('error', (error) => {
      console.error(`❌ [${this.deviceName}] Socket error:`, error);
    });
  }

  registerDevice() {
    this.socket.emit('register_device', {
      deviceName: this.deviceName,
      deviceType: 'simulator'
    });
  }

  startDataTransmission() {
    this.running = true;
    console.log(`🌡️ [${this.deviceName}] Starting data transmission...`);
    
    // Send data every 3-7 seconds (randomized)
    const sendData = () => {
      if (this.running && this.socket?.connected) {
        this.sendSensorData();
        
        // Schedule next transmission with random interval
        const nextInterval = 3000 + Math.random() * 4000; // 3-7 seconds
        this.dataInterval = setTimeout(sendData, nextInterval);
      }
    };
    
    sendData();
  }

  generateSensorData() {
    // Simulate realistic sensor data with some variation
    const tempVariation = (Math.random() - 0.5) * 4; // ±2°C variation
    const humidityVariation = (Math.random() - 0.5) * 10; // ±5% variation
    
    const temperature = Math.round((this.baseTemperature + tempVariation) * 10) / 10;
    const humidity = Math.round((this.baseHumidity + humidityVariation) * 10) / 10;
    
    // Ensure realistic bounds
    return {
      temperature: Math.max(0, Math.min(50, temperature)),
      humidity: Math.max(0, Math.min(100, humidity))
    };
  }

  sendSensorData() {
    const { temperature, humidity } = this.generateSensorData();
    
    const data = {
      temperature,
      humidity,
      timestamp: new Date().toISOString()
    };

    this.socket.emit('temperature_data', data);
    console.log(`📊 [${this.deviceName}] Sent: ${temperature}°C, ${humidity}%`);
  }

  setLED(state) {
    this.ledState = state;
    console.log(`💡 [${this.deviceName}] LED ${state ? 'ON' : 'OFF'}`);
    
    // Send LED state back to server
    this.socket.emit('led_state', {
      state,
      timestamp: new Date().toISOString()
    });
  }

  disconnect() {
    this.running = false;
    if (this.dataInterval) {
      clearTimeout(this.dataInterval);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    console.log(`🛑 [${this.deviceName}] Device disconnected`);
  }
}

// Multi-device simulator
class MultiDeviceSimulator {
  constructor(deviceCount = 3, serverUrl = 'http://localhost:3000') {
    this.devices = [];
    this.serverUrl = serverUrl;
    
    // Create multiple device simulators
    for (let i = 1; i <= deviceCount; i++) {
      const deviceName = `sensor-sim-${i.toString().padStart(3, '0')}`;
      this.devices.push(new DeviceSimulator(deviceName, serverUrl));
    }
  }

  startAll() {
    console.log(`🚀 Starting ${this.devices.length} device simulators...`);
    
    this.devices.forEach((device, index) => {
      // Stagger connections to avoid overwhelming the server
      setTimeout(() => {
        device.connect();
      }, index * 1000);
    });
  }

  stopAll() {
    console.log('🛑 Stopping all device simulators...');
    this.devices.forEach(device => device.disconnect());
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const deviceCount = parseInt(args[0]) || 3;
  const serverUrl = args[1] || 'http://localhost:3000';
  
  console.log(`🎯 IoT Device Simulator`);
  console.log(`📊 Devices: ${deviceCount}`);
  console.log(`🌐 Server: ${serverUrl}`);
  console.log('');
  
  const simulator = new MultiDeviceSimulator(deviceCount, serverUrl);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down simulators...');
    simulator.stopAll();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    simulator.stopAll();
    process.exit(0);
  });
  
  // Start simulation
  simulator.startAll();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DeviceSimulator, MultiDeviceSimulator };