# IoT Device Samples

This directory contains sample code for different types of IoT devices that can connect to the monitoring system.

## Available Samples

### 1. Raspberry Pi (Python)
- **File**: `raspberry-pi-python/device.py`
- **Requirements**: `raspberry-pi-python/requirements.txt`
- **Features**: 
  - DHT22 temperature/humidity sensor
  - LED control via GPIO
  - Automatic fallback to simulation mode
  - Real hardware support

**Setup:**
```bash
cd raspberry-pi-python
pip install -r requirements.txt
python device.py
```

### 2. Arduino (C++)
- **File**: `arduino-cpp/device.ino`
- **Features**:
  - WiFi connectivity
  - DHT22 sensor support
  - Built-in LED control
  - Socket.IO client

**Setup:**
1. Install required Arduino libraries:
   - WiFi
   - SocketIOclient
   - ArduinoJson
   - DHT sensor library
2. Update WiFi credentials and server IP
3. Upload to your Arduino/ESP32

### 3. Node.js Simulator
- **File**: `nodejs-simulator/device-simulator.js`
- **Features**:
  - Multiple device simulation
  - Realistic sensor data generation
  - No hardware required
  - Perfect for testing

**Setup:**
```bash
cd nodejs-simulator
npm install
npm start              # Start 3 devices
npm run simulate       # Start 5 devices
npm run single         # Start single device
```

## Device Communication Protocol

### 1. Device Registration
```javascript
// Send to server
socket.emit('register_device', {
  deviceName: 'sensor-001',
  deviceType: 'raspberry_pi_sensor'
});

// Server response
socket.on('device_registered', (data) => {
  console.log('Device registered:', data);
});
```

### 2. Temperature Data
```javascript
// Send sensor data
socket.emit('temperature_data', {
  temperature: 23.5,
  humidity: 65.2,
  timestamp: new Date().toISOString()
});
```

### 3. LED Control
```javascript
// Receive LED commands
socket.on('led_control', (data) => {
  const command = data.command; // 'on' or 'off'
  // Control your LED here
});

// Send LED state back
socket.emit('led_state', {
  state: true, // or false
  timestamp: new Date().toISOString()
});
```

### 4. Heartbeat
```javascript
// Respond to server heartbeat
socket.on('heartbeat', () => {
  socket.emit('heartbeat_ack', {
    timestamp: new Date().toISOString()
  });
});
```

## Testing Your Setup

1. **Start the backend server** (from project root):
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend** (from project root):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Run a device simulator**:
   ```bash
   cd device-samples/nodejs-simulator
   npm install
   npm start
   ```

4. **Access the web interface**:
   - Home: http://localhost:5173
   - Enter device name: `sensor-sim-001`
   - Admin dashboard: http://localhost:5173/admin

## Customization

### Adding New Sensor Types
1. Modify the `sendSensorData()` function
2. Add new data fields to the payload
3. Update the frontend to display new data types

### Different Communication Patterns
- **Batch Data**: Send multiple readings at once
- **Event-Driven**: Send data only when values change significantly
- **Scheduled**: Send data at specific intervals

### Error Handling
All samples include comprehensive error handling:
- Connection failures
- Sensor read errors
- Network interruptions
- Graceful shutdown

## Hardware Requirements

### Raspberry Pi Setup
- Raspberry Pi (any model with GPIO)
- DHT22 temperature/humidity sensor
- LED and resistor
- Breadboard and jumper wires

### Arduino/ESP32 Setup
- ESP32 or Arduino with WiFi capability
- DHT22 sensor
- Built-in LED (or external LED)
- USB cable for programming

### Wiring Diagrams
```
DHT22 Sensor:
- VCC -> 3.3V
- GND -> Ground
- DATA -> GPIO 2 (Arduino) / GPIO 4 (Raspberry Pi)

LED:
- Anode -> GPIO 18 (Raspberry Pi) / Built-in LED (Arduino)
- Cathode -> Ground (through 220Ω resistor)
```