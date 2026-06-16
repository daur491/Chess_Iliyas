import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;
let currentToken: string | null = null;

export const getSocket = (): Socket => {
  const token = localStorage.getItem('access_token') ?? '';

  // Recreate socket if token changed
  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentToken = token;
    socket = io(`${WS_URL}/ws`, {
      query: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
    });
  }

  return socket;
};

export const resetSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};

export const disconnectSocket = (): void => resetSocket();
