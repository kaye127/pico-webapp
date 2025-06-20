/*
 * Arduino IoT Device Sample
 * Connects to WiFi and sends temperature data to monitoring system
 * Controls built-in LED based on server commands
 */

#include <WiFi.h>
#include <SocketIOclient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration
const char* server_host = "192.168.1.100";  // Change to your server IP
const int server_port = 3000;

// Hardware configuration
#define DHT_PIN 2
#define DHT_TYPE DHT22
#define LED_PIN LED_BUILTIN

// Device configuration
const String DEVICE_NAME = "sensor-arduino-001";
const String DEVICE_TYPE = "arduino_sensor";

// Objects
DHT dht(DHT_PIN, DHT_TYPE);
SocketIOclient socketIO;

// State variables
bool ledState = false;
bool deviceRegistered = false;
unsigned long lastDataSend = 0;
const unsigned long DATA_INTERVAL = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  dht.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup Socket.IO
  setupSocketIO();
  
  Serial.println("🚀 Arduino IoT Device started");
}

void loop() {
  socketIO.loop();
  
  // Send sensor data periodically
  if (deviceRegistered && millis() - lastDataSend > DATA_INTERVAL) {
    sendSensorData();
    lastDataSend = millis();
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.print("🌐 Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("✅ WiFi connected! IP: ");
  Serial.println(WiFi.localIP());
}

void setupSocketIO() {
  // Setup Socket.IO event handlers
  socketIO.onEvent(socketIOEvent);
  
  // Connect to server
  Serial.println("🔌 Connecting to Socket.IO server...");
  socketIO.begin(server_host, server_port, "/socket.io/?EIO=4");
}

void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case sIOtype_DISCONNECT:
      Serial.println("❌ Socket.IO Disconnected");
      deviceRegistered = false;
      break;
      
    case sIOtype_CONNECT:
      Serial.println("✅ Socket.IO Connected");
      registerDevice();
      break;
      
    case sIOtype_EVENT:
      handleSocketEvent((char*)payload);
      break;
      
    case sIOtype_ACK:
    case sIOtype_ERROR:
    case sIOtype_BINARY_EVENT:
    case sIOtype_BINARY_ACK:
      // Handle other event types if needed
      break;
  }
}

void registerDevice() {
  DynamicJsonDocument doc(1024);
  doc["deviceName"] = DEVICE_NAME;
  doc["deviceType"] = DEVICE_TYPE;
  
  String payload;
  serializeJson(doc, payload);
  
  socketIO.emit("register_device", payload.c_str());
  Serial.println("📱 Device registration sent");
}

void handleSocketEvent(const char* payload) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, payload);
  
  String eventName = doc[0];
  JsonObject eventData = doc[1];
  
  if (eventName == "device_registered") {
    Serial.println("✅ Device registered successfully");
    deviceRegistered = true;
    
  } else if (eventName == "registration_error") {
    Serial.print("❌ Registration error: ");
    Serial.println(eventData["error"].as<String>());
    
  } else if (eventName == "led_control") {
    String command = eventData["command"];
    handleLEDControl(command);
    
  } else if (eventName == "heartbeat") {
    // Respond to heartbeat
    socketIO.emit("heartbeat_ack", "{\"timestamp\":\"" + String(millis()) + "\"}");
  }
}

void handleLEDControl(String command) {
  Serial.print("💡 LED control received: ");
  Serial.println(command);
  
  if (command == "on") {
    setLED(true);
  } else if (command == "off") {
    setLED(false);
  }
}

void setLED(bool state) {
  ledState = state;
  digitalWrite(LED_PIN, state ? HIGH : LOW);
  
  Serial.print("💡 LED ");
  Serial.println(state ? "ON" : "OFF");
  
  // Send LED state back to server
  DynamicJsonDocument doc(512);
  doc["state"] = state;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  socketIO.emit("led_state", payload.c_str());
}

void sendSensorData() {
  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("⚠️ Failed to read from DHT sensor");
    return;
  }
  
  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["temperature"] = round(temperature * 10) / 10.0; // Round to 1 decimal
  doc["humidity"] = round(humidity * 10) / 10.0;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  // Send to server
  socketIO.emit("temperature_data", payload.c_str());
  
  Serial.print("📊 Sent: ");
  Serial.print(temperature);
  Serial.print("°C, ");
  Serial.print(humidity);
  Serial.println("%");
}