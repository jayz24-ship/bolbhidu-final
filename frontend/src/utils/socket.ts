import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

// Create singleton instance
let socketInstance: Socket | null = null;

export const createSocket = (): Socket => {
  if (!socketInstance) {
    const token = localStorage.getItem('jwt_token');
    
    socketInstance = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server, ID:', socketInstance?.id);
      const userId = localStorage.getItem('user_id');
      const userData = localStorage.getItem('user_data');
      console.log('[Socket] user_id from localStorage:', userId);
      console.log('[Socket] user_data from localStorage:', userData ? 'exists' : 'missing');
      
      if (userId) {
        console.log(`[Socket] Emitting join event for room: user:${userId}`);
        socketInstance?.emit('join', `user:${userId}`);
        
        // Listen for join confirmation
        socketInstance?.once('joined', (data: any) => {
          console.log('[Socket] ✅ Successfully joined room:', data.room);
        });
      } else {
        console.warn('[Socket] ⚠️ No user_id found in localStorage - notifications will not work!');
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    // Listen for backend events
    socketInstance.on('feed.post.created', (data) => {
      console.log('[Socket] New post created:', data);
    });

    socketInstance.on('post.ai.result', (data) => {
      console.log('[Socket] AI validation result:', data);
      // Event is also handled in PostContext for notifications
    });

    socketInstance.on('post.like.updated', (data) => {
      console.log('[Socket] Post likes updated:', data);
    });

    socketInstance.on('post.comment.created', (data) => {
      console.log('[Socket] New comment:', data);
    });

    socketInstance.on('post.escalated', (data) => {
      console.log('[Socket] Post escalated to issue:', data);
    });

    socketInstance.on('issue.created', (data) => {
      console.log('[Socket] Issue created:', data);
    });

    socketInstance.on('issue.updated', (data) => {
      console.log('[Socket] Issue updated:', data);
    });

    socketInstance.on('issue.completed', (data) => {
      console.log('[Socket] Issue completed:', data);
    });

    socketInstance.on('user.enforcement.updated', (data) => {
      console.log('[Socket] User enforcement updated:', data);
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const joinRoom = (room: string) => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.emit('join', room);
  }
};

export const getSocket = () => socketInstance;

// Socket event types
export interface SocketNotification {
  message: string;
  timestamp: Date;
  type?: 'like' | 'comment' | 'issue_update' | 'admin_action';
  data?: any;
}

export default { createSocket, disconnectSocket };