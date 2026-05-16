import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { setIO } from '../services/socket.js';

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: env.CLIENT_ORIGIN },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
    
    socket.on('join', (room: string) => {
      console.log(`[Socket.io] Client ${socket.id} joining room: ${room}`);
      socket.join(room);
      console.log(`[Socket.io] Client ${socket.id} successfully joined room: ${room}`);
      
      // Send confirmation back to client
      socket.emit('joined', { room });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  setIO(io);
  console.log('[Socket.io] Socket.io initialized');
  return io;
}
