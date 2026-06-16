import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.reload();
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  telegram: (initData: string) =>
    api.post('/auth/telegram', { initData }).then((r) => r.data),
  devLogin: () =>
    api.get('/auth/dev-login').then((r) => r.data),
};

export const usersApi = {
  me: () => api.get('/users/me').then((r) => r.data),
};

export const gamesApi = {
  createBotGame: (timeControl: string, botLevel: number, color?: string) =>
    api.post('/games/vs-bot', { timeControl, botLevel, color }).then((r) => r.data),
  getActive: () => api.get('/games/active').then((r) => r.data),
  getHistory: (page = 1, limit = 20) =>
    api.get('/games/history', { params: { page, limit } }).then((r) => r.data),
  getGame: (id: string) => api.get(`/games/${id}`).then((r) => r.data),
  makeMove: (id: string, move: string) =>
    api.post(`/games/${id}/move`, { move }).then((r) => r.data),
  resign: (id: string) =>
    api.post(`/games/${id}/resign`).then((r) => r.data),
};

export const matchmakingApi = {
  join: (timeControl: string) =>
    api.post('/matchmaking/join', { timeControl }).then((r) => r.data),
  leave: () => api.delete('/matchmaking/leave').then((r) => r.data),
  status: () =>
    api.get('/matchmaking/status').then((r) => r.data) as Promise<{
      inQueue: boolean;
      gameId?: string;
      color?: 'white' | 'black';
    }>,
};

export const puzzlesApi = {
  list: (params?: { category?: string; difficulty?: string; page?: number }) =>
    api.get('/puzzles', { params }).then((r) => r.data),
  daily: () => api.get('/puzzles/daily').then((r) => r.data),
  attempt: (id: string, moves: string[]) =>
    api.post(`/puzzles/${id}/attempt`, { moves }).then((r) => r.data),
  solution: (id: string) => api.get(`/puzzles/${id}/solution`).then((r) => r.data),
};

export const ratingApi = {
  leaderboard: () => api.get('/rating/leaderboard').then((r) => r.data),
  puzzleLeaderboard: () => api.get('/rating/leaderboard/puzzles').then((r) => r.data),
};

export const tournamentsApi = {
  list: () => api.get('/tournaments').then((r) => r.data),
  get: (id: string) => api.get(`/tournaments/${id}`).then((r) => r.data),
  join: (id: string) => api.post(`/tournaments/${id}/join`).then((r) => r.data),
  standings: (id: string) =>
    api.get(`/tournaments/${id}/standings`).then((r) => r.data),
};

export const achievementsApi = {
  list: () => api.get('/achievements').then((r) => r.data),
  recent: () => api.get('/achievements/recent').then((r) => r.data),
};
