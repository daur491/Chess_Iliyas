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
    // Connect to the "/ws" Socket.io namespace. The server uses the default
    // Socket.io path ("/socket.io/"), so we must pass the namespace as part of
    // the connection URL while keeping the default path — do NOT treat "/ws"
    // as an HTTP path. `io(host + "/ws")` correctly targets the namespace.
    socket = io(`${WS_URL}/ws`, {
      path: '/socket.io',
      query: { token },
      // Allow polling fallback first, then upgrade — more robust on hosts
      // (e.g. Render) where a direct websocket upgrade may fail.
      transports: ['websocket', 'polling'],
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
