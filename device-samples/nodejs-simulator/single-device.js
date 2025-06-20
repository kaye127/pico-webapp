#!/usr/bin/env node
/**
 * Single Device Simulator
 * Simulates a single IoT device for testing
 */

import { DeviceSimulator } from './device-simulator.js';

const deviceName = process.argv[2] || 'sensor-test-001';
const serverUrl = process.argv[3] || 'http://localhost:3000';

console.log(`🎯 Single Device Simulator`);
console.log(`📱 Device: ${deviceName}`);
console.log(`🌐 Server: ${serverUrl}`);
console.log('');

const device = new DeviceSimulator(deviceName, serverUrl);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down device...');
  device.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  device.disconnect();
  process.exit(0);
});

// Start device
device.connect();