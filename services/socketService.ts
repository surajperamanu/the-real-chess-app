import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private readonly serverUrl = 'http://localhost:4000';

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(): Socket {
    if (!this.socket) {
      try {
        this.socket = io(this.serverUrl, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('Connected to Socket.IO server');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from Socket.IO server:', reason);
        });
      } catch (error) {
        console.error('Failed to initialize Socket.IO:', error);
        throw error;
      }
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default SocketService; 