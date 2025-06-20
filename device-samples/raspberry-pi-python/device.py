#!/usr/bin/env python3
"""
Raspberry Pi IoT Device Sample
Connects to the monitoring system and sends temperature/humidity data
Controls LED based on commands from the server
"""

import socketio
import time
import random
import json
import threading
from datetime import datetime

# Try to import actual sensor libraries, fall back to simulation
try:
    import Adafruit_DHT
    import RPi.GPIO as GPIO
    SIMULATION_MODE = False
except ImportError:
    print("Hardware libraries not found, running in simulation mode")
    SIMULATION_MODE = True

class IoTDevice:
    def __init__(self, device_name, server_url="http://localhost:3000"):
        self.device_name = device_name
        self.server_url = server_url
        self.sio = socketio.Client()
        self.led_pin = 18  # GPIO pin for LED
        self.dht_pin = 4   # GPIO pin for DHT sensor
        self.led_state = False
        self.running = False
        
        # Setup GPIO if not in simulation mode
        if not SIMULATION_MODE:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(self.led_pin, GPIO.OUT)
            GPIO.output(self.led_pin, GPIO.LOW)
        
        self.setup_socket_handlers()
    
    def setup_socket_handlers(self):
        @self.sio.event
        def connect():
            print(f"🔌 Connected to server: {self.server_url}")
            # Register this device
            self.sio.emit('register_device', {
                'deviceName': self.device_name,
                'deviceType': 'raspberry_pi_sensor'
            })
        
        @self.sio.event
        def disconnect():
            print("❌ Disconnected from server")
        
        @self.sio.event
        def device_registered(data):
            print(f"✅ Device registered: {data}")
            self.running = True
            # Start sending data
            threading.Thread(target=self.data_sender_loop, daemon=True).start()
        
        @self.sio.event
        def registration_error(data):
            print(f"❌ Registration failed: {data}")
        
        @self.sio.event
        def led_control(data):
            print(f"💡 LED control received: {data}")
            command = data.get('command', '').lower()
            
            if command == 'on':
                self.set_led(True)
            elif command == 'off':
                self.set_led(False)
            else:
                print(f"Unknown LED command: {command}")
        
        @self.sio.event
        def heartbeat():
            # Respond to server heartbeat
            self.sio.emit('heartbeat_ack', {'timestamp': datetime.now().isoformat()})
    
    def read_sensor_data(self):
        """Read temperature and humidity from DHT sensor or simulate data"""
        if SIMULATION_MODE:
            # Simulate realistic sensor data
            base_temp = 22.0
            base_humidity = 45.0
            temperature = base_temp + random.uniform(-3, 3)
            humidity = base_humidity + random.uniform(-10, 10)
            return round(temperature, 1), round(humidity, 1)
        else:
            # Read from actual DHT sensor
            humidity, temperature = Adafruit_DHT.read_retry(Adafruit_DHT.DHT22, self.dht_pin)
            if humidity is not None and temperature is not None:
                return round(temperature, 1), round(humidity, 1)
            else:
                print("Failed to read from DHT sensor")
                return None, None
    
    def set_led(self, state):
        """Control LED state"""
        self.led_state = state
        
        if not SIMULATION_MODE:
            GPIO.output(self.led_pin, GPIO.HIGH if state else GPIO.LOW)
        
        print(f"💡 LED {'ON' if state else 'OFF'}")
        
        # Send LED state back to server
        self.sio.emit('led_state', {
            'state': state,
            'timestamp': datetime.now().isoformat()
        })
    
    def data_sender_loop(self):
        """Main loop to send sensor data"""
        print("🌡️ Starting data transmission...")
        
        while self.running and self.sio.connected:
            try:
                temperature, humidity = self.read_sensor_data()
                
                if temperature is not None and humidity is not None:
                    data = {
                        'temperature': temperature,
                        'humidity': humidity,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    self.sio.emit('temperature_data', data)
                    print(f"📊 Sent: {temperature}°C, {humidity}%")
                else:
                    print("⚠️ Failed to read sensor data")
                
                # Send data every 5 seconds
                time.sleep(5)
                
            except Exception as e:
                print(f"❌ Error in data loop: {e}")
                time.sleep(5)
    
    def connect(self):
        """Connect to the server"""
        try:
            print(f"🚀 Connecting to {self.server_url}...")
            self.sio.connect(self.server_url)
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from server and cleanup"""
        self.running = False
        if self.sio.connected:
            self.sio.disconnect()
        
        if not SIMULATION_MODE:
            GPIO.cleanup()
        
        print("🛑 Device disconnected and cleaned up")

def main():
    # Configuration
    DEVICE_NAME = "sensor-pi-001"  # Change this for each device
    SERVER_URL = "http://localhost:3000"  # Change to your server URL
    
    device = IoTDevice(DEVICE_NAME, SERVER_URL)
    
    try:
        if device.connect():
            print("✅ Device connected successfully")
            # Keep the program running
            while True:
                time.sleep(1)
        else:
            print("❌ Failed to connect to server")
    
    except KeyboardInterrupt:
        print("\n🛑 Shutting down device...")
        device.disconnect()
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        device.disconnect()

if __name__ == "__main__":
    main()