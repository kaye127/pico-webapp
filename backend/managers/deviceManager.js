export class DeviceManager {
    constructor() {
        this.users = new Map();
        this.devices = new Map();
        this.temperatureHistory = new Map();
        this.ledStates = new Map();
        this.deviceSocketMap = new Map(); // socketId -> deviceId
    }

    registerUser(username, socketId) {
        const existingUser = Array.from(this.users.values()).find(u => u.username === username);
        if (existingUser) {
            throw new Error('Username already taken');
        }

        const user = {
            id: this.generateId(),
            username,
            connectedAt: new Date(),
            isActive: true
        };

        this.users.set(user.id, user);
        return user;
    }

    connectDevice(deviceId, userId, deviceType) {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const device = {
            id: deviceId,
            userId,
            name: `${deviceType}_${deviceId.slice(-4)}`,
            status: 'connected',
            lastSeen: new Date()
        };

        this.devices.set(deviceId, device);

        // Initialize temperature history for device
        if (!this.temperatureHistory.has(deviceId)) {
            this.temperatureHistory.set(deviceId, []);
        }

        return device;
    }

    addTemperatureReading(reading) {
        const history = this.temperatureHistory.get(reading.deviceId) || [];
        history.push(reading);

        // Keep only last 1000 readings per device
        if (history.length > 1000) {
            history.shift();
        }

        this.temperatureHistory.set(reading.deviceId, history);
    }

    updateDeviceLastSeen(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.lastSeen = new Date();
            device.status = 'connected';
            this.devices.set(deviceId, device);
        }
    }

    updateLEDState(deviceId, state) {
        state.deviceId = deviceId;
        this.ledStates.set(deviceId, state);
    }

    disconnectUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            user.isActive = false;
            this.users.set(userId, user);
        }
    }

    disconnectDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.status = 'disconnected';
            device.lastSeen = new Date();
            this.devices.set(deviceId, device);
        }
    }

    getDeviceBySocketId(socketId) {
        const deviceId = this.deviceSocketMap.get(socketId);
        return deviceId ? this.devices.get(deviceId) : undefined;
    }

    getAllDevices() {
        return Array.from(this.devices.values());
    }

    getDeviceHistory(deviceId, limit = 100) {
        const history = this.temperatureHistory.get(deviceId) || [];
        return history.slice(-limit);
    }

    getStats() {
        const totalUsers = this.users.size;
        const activeDevices = Array.from(this.devices.values()).filter(d => d.status === 'connected').length;

        let totalReadings = 0;
        let temperatureSum = 0;

        for (const readings of this.temperatureHistory.values()) {
            totalReadings += readings.length;
            temperatureSum += readings.reduce((sum, r) => sum + r.temperature, 0);
        }

        const averageTemperature = totalReadings > 0 ? temperatureSum / totalReadings : 0;

        return {
            totalUsers,
            activeDevices,
            totalTemperatureReadings: totalReadings,
            averageTemperature: Math.round(averageTemperature * 100) / 100,
            lastUpdated: new Date()
        };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
}