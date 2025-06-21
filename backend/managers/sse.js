// export class SSEManager {
//     constructor() {
//         this.clients = new Set();
//         this.startHeartbeat();
//     }

//     addClient(req, res) {
//         // Set SSE headers
//         res.writeHead(200, {
//             'Content-Type': 'text/event-stream',
//             'Cache-Control': 'no-cache',
//             'Connection': 'keep-alive',
//             'Access-Control-Allow-Origin': '*',
//             'Access-Control-Allow-Headers': 'Cache-Control'
//         });

//         const write = (payload) => {
//             try {
//                 res.write(payload);
//             } catch (error) {
//                 console.error('Failed to write SSE data:', error);
//                 this.unregisterClient(write);
//             }
//         };

//         this.registerClient(write);

//         // Send initial connection message
//         write(`event: connected\ndata: ${JSON.stringify({ 
//             message: 'Connected to IoT stream',
//             timestamp: new Date()
//         })}\n\n`);

//         // Handle client disconnect
//         req.on('close', () => {
//             this.unregisterClient(write);
//             console.log('📊 SSE client disconnected');
//         });

//         req.on('error', () => {
//             this.unregisterClient(write);
//         });

//         console.log('📊 SSE client connected');
//     }

//     registerClient(write) {
//         this.clients.add(write);
//     }

//     unregisterClient(write) {
//         this.clients.delete(write);
//     }

//     broadcast(event, data) {
//         const payload = `event: ${event}\ndata: ${JSON.stringify({
//             ...data,
//             timestamp: new Date()
//         })}\n\n`;

//         const clientsToRemove = [];

//         this.clients.forEach(write => {
//             try {
//                 write(payload);
//             } catch (error) {
//                 console.error('Failed to broadcast to SSE client:', error);
//                 clientsToRemove.push(write);
//             }
//         });

//         // Remove failed clients
//         clientsToRemove.forEach(client => {
//             this.unregisterClient(client);
//         });
//     }

//     startHeartbeat() {
//         // Send heartbeat every 15 seconds to keep connections alive
//         setInterval(() => {
//             if (this.clients.size > 0) {
//                 const heartbeat = `:\n\n`;
//                 this.clients.forEach(write => {
//                     try {
//                         write(heartbeat);
//                     } catch (error) {
//                         this.unregisterClient(write);
//                     }
//                 });
//             }
//         }, 15000);
//     }

//     getClientCount() {
//         return this.clients.size;
//     }
// }


export class SSEManager {
    constructor() {
        this.clients = new Map(); // Map of deviceName → Set of write functions
        this.startHeartbeat();
    }

    addClient(req, res) {
        const { deviceName } = req.query;

        if (!deviceName) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing deviceName query parameter');
            return;
        }

        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        const write = (payload) => {
            try {
                res.write(payload);
            } catch (error) {
                console.error(`❌ Failed to write SSE data for ${deviceName}`, error);
                this.unregisterClient(deviceName, write);
            }
        };

        this.registerClient(deviceName, write);

        // Send initial connection message
        write(`event: connected\ndata: ${JSON.stringify({ 
            message: `Connected to device stream: ${deviceName}`,
            timestamp: new Date()
        })}\n\n`);

        req.on('close', () => {
            this.unregisterClient(deviceName, write);
            console.log(`📊 SSE client disconnected from ${deviceName}`);
        });

        req.on('error', () => {
            this.unregisterClient(deviceName, write);
        });

        console.log(`📊 SSE client connected for ${deviceName}`);
    }

    registerClient(deviceName, write) {
        if (!this.clients.has(deviceName)) {
            this.clients.set(deviceName, new Set());
        }
        this.clients.get(deviceName).add(write);
    }

    unregisterClient(deviceName, write) {
        if (this.clients.has(deviceName)) {
            const deviceClients = this.clients.get(deviceName);
            deviceClients.delete(write);
            if (deviceClients.size === 0) {
                this.clients.delete(deviceName);
            }
        }
    }

    sendToDevice(deviceName, event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify({
            ...data,
            timestamp: new Date()
        })}\n\n`;

        const clients = this.clients.get(deviceName);
        if (!clients || clients.size === 0) {
            console.warn(`⚠️ No SSE clients connected for device: ${deviceName}`);
            return;
        }

        const clientsToRemove = [];

        clients.forEach(write => {
            try {
                write(payload);
            } catch (error) {
                console.error(`❌ Failed to send to ${deviceName}`, error);
                clientsToRemove.push(write);
            }
        });

        clientsToRemove.forEach(write => {
            this.unregisterClient(deviceName, write);
        });
    }

    startHeartbeat() {
        setInterval(() => {
            this.clients.forEach((writes, deviceName) => {
                writes.forEach(write => {
                    try {
                        write(`:\n\n`); // SSE comment ping
                    } catch (error) {
                        this.unregisterClient(deviceName, write);
                    }
                });
            });
        }, 15000);
    }

    getClientCount(deviceName = null) {
        if (deviceName) {
            return this.clients.get(deviceName)?.size || 0;
        }
        let total = 0;
        for (const set of this.clients.values()) {
            total += set.size;
        }
        return total;
    }
}
