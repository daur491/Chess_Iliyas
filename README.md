# Chess Telegram MiniApp

Telegram MiniApp для игры в шахматы.

## Стек

- **Frontend**: React + TypeScript (Vite), Telegram Web App SDK
- **Backend**: NestJS, PostgreSQL, Redis, Socket.io
- **Движок**: Stockfish
- **Инфраструктура**: Docker, Nginx

## Запуск (разработка)

### 1. Скопируйте переменные окружения

```bash
cp .env.example .env
# Заполните BOT_TOKEN и другие переменные
```

### 2. Запустите инфраструктуру

```bash
docker-compose up -d postgres redis
```

### 3. Запустите backend

```bash
cd backend
npm install
npm run start:dev
```

### 4. Запустите frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## Продакшн

```bash
cp .env.example .env
# Заполните все переменные
docker-compose -f docker-compose.prod.yml up -d
```

## Структура проекта

```
Chess_Iliyas/
├── backend/         # NestJS API + WebSocket
│   └── src/
│       ├── auth/
│       ├── users/
│       ├── games/
│       ├── matchmaking/
│       ├── timers/
│       ├── bot/        # Stockfish
│       ├── puzzles/
│       ├── tournaments/
│       ├── achievements/
│       ├── rating/
│       ├── admin/
│       └── shared/
├── frontend/        # React TypeScript MiniApp
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── store/
│       ├── api/
│       ├── hooks/
│       └── types/
├── nginx/           # Nginx конфиг
├── load-tests/      # k6 нагрузочные тесты
└── docker-compose.yml
```

## API

- `POST /api/auth/telegram` — авторизация через Telegram initData
- `GET /api/users/me` — профиль текущего пользователя
- `POST /api/games/vs-bot` — создать партию с ботом
- `POST /api/matchmaking/join` — встать в очередь поиска
- `GET /api/games/active` — активные партии
- `GET /api/puzzles/daily` — ежедневная задача
- `GET /api/rating/leaderboard` — рейтинговая таблица
- `GET /api/tournaments` — список турниров

## WebSocket (Socket.io, /ws)

События клиент → сервер:
- `join_game` — подключиться к партии
- `move` — сделать ход
- `draw_offer` — предложить ничью
- `draw_accept` — принять ничью
- `resign` — сдаться

События сервер → клиент:
- `game_state` — полное состояние партии
- `move_made` — ход сделан
- `timer_update` — обновление таймеров
- `game_over` — партия завершена
- `match_found` — найден соперник
