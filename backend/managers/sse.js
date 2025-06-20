export class SSEManager {
    constructor() {
        this.clients = new Set();
        this.startHeartbeat();
    }

    addClient(req, res) {
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
                console.error('Failed to write SSE data:', error);
                this.unregisterClient(write);
            }
        };

        this.registerClient(write);

        // Send initial connection message
        write(`event: connected\ndata: ${JSON.stringify({ 
            message: 'Connected to IoT stream',
            timestamp: new Date()
        })}\n\n`);

        // Handle client disconnect
        req.on('close', () => {
            this.unregisterClient(write);
            console.log('📊 SSE client disconnected');
        });

        req.on('error', () => {
            this.unregisterClient(write);
        });

        console.log('📊 SSE client connected');
    }

    registerClient(write) {
        this.clients.add(write);
    }

    unregisterClient(write) {
        this.clients.delete(write);
    }

    broadcast(event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify({
            ...data,
            timestamp: new Date()
        })}\n\n`;

        const clientsToRemove = [];

        this.clients.forEach(write => {
            try {
                write(payload);
            } catch (error) {
                console.error('Failed to broadcast to SSE client:', error);
                clientsToRemove.push(write);
            }
        });

        // Remove failed clients
        clientsToRemove.forEach(client => {
            this.unregisterClient(client);
        });
    }

    startHeartbeat() {
        // Send heartbeat every 15 seconds to keep connections alive
        setInterval(() => {
            if (this.clients.size > 0) {
                const heartbeat = `:\n\n`;
                this.clients.forEach(write => {
                    try {
                        write(heartbeat);
                    } catch (error) {
                        this.unregisterClient(write);
                    }
                });
            }
        }, 15000);
    }

    getClientCount() {
        return this.clients.size;
    }
}
