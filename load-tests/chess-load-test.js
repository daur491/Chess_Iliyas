import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

const errorRate = new Rate('errors');
const moveTrend = new Trend('move_latency_ms');

export const options = {
  scenarios: {
    rest_api: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },
        { duration: '3m', target: 5000 },
        { duration: '5m', target: 10000 },
        { duration: '2m', target: 0 },
      ],
      exec: 'restApiLoad',
    },
    websocket_games: {
      executor: 'constant-vus',
      vus: 500,
      duration: '5m',
      exec: 'wsGameLoad',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    move_latency_ms: ['p(95)<200'],
    errors: ['rate<0.01'],
  },
};

export function restApiLoad() {
  const token = getToken();
  if (!token) {
    errorRate.add(1);
    return;
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const meRes = http.get(`${BASE_URL}/users/me`, { headers });
  check(meRes, { '/users/me 200': (r) => r.status === 200 });
  errorRate.add(meRes.status !== 200);

  const leaderboardRes = http.get(`${BASE_URL}/rating/leaderboard`, { headers });
  check(leaderboardRes, { '/rating/leaderboard 200': (r) => r.status === 200 });

  const puzzlesRes = http.get(`${BASE_URL}/puzzles/daily`, { headers });
  check(puzzlesRes, { '/puzzles/daily 200': (r) => r.status === 200 });

  sleep(1);
}

export function wsGameLoad() {
  const token = getToken();
  if (!token) return;

  const url = `${WS_URL}?token=${token}`;

  ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ event: 'join_game', data: { gameId: 'test-game-id' } }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.event === 'game_state') {
        const start = Date.now();
        socket.send(JSON.stringify({
          event: 'move',
          data: { gameId: 'test-game-id', move: 'e2e4' },
        }));
        moveTrend.add(Date.now() - start);
      }
    });

    socket.setTimeout(function () {
      socket.close();
    }, 30000);
  });
}

function getToken() {
  const res = http.post(
    `${BASE_URL}/auth/telegram`,
    JSON.stringify({ initData: 'test_init_data' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 201 && res.status !== 200) return null;
  return JSON.parse(res.body).accessToken;
}
