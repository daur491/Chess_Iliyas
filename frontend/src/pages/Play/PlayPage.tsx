import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '../../api/rest';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import type { TimeControl } from '../../types';
import './PlayPage.css';

const TIME_CONTROLS: { label: string; group: string; value: TimeControl; seconds: number }[] = [
  { group: 'Заочные', label: '1 день', value: 'correspondence_1d', seconds: 86400 },
  { group: 'Заочные', label: '3 дня', value: 'correspondence_3d', seconds: 259200 },
  { group: 'Заочные', label: '7 дней', value: 'correspondence_7d', seconds: 604800 },
  { group: 'Рапид', label: '10 мин', value: 'rapid_10', seconds: 600 },
  { group: 'Рапид', label: '15 мин', value: 'rapid_15', seconds: 900 },
  { group: 'Рапид', label: '30 мин', value: 'rapid_30', seconds: 1800 },
  { group: 'Блиц', label: '3 мин', value: 'blitz_3', seconds: 180 },
  { group: 'Блиц', label: '5 мин', value: 'blitz_5', seconds: 300 },
  { group: 'Пуля', label: '1 мин', value: 'bullet_1', seconds: 60 },
];

const BOT_LEVELS = [
  { level: 1, elo: 300, label: 'Новичок', icon: '🐣' },
  { level: 2, elo: 600, label: 'Любитель', icon: '🙂' },
  { level: 3, elo: 1000, label: 'Клубный', icon: '🧠' },
  { level: 4, elo: 1500, label: 'Продвинутый', icon: '🔥' },
  { level: 5, elo: 2000, label: 'Мастер', icon: '👑' },
];

type Tab = 'new' | 'active' | 'history';
type Opponent = 'human' | 'bot';
type Color = 'white' | 'black' | 'random';

export const PlayPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('new');
  const [selectedTC, setSelectedTC] = useState<TimeControl>('rapid_10');
  const [opponent, setOpponent] = useState<Opponent>('bot');
  const [botLevel, setBotLevel] = useState(3);
  const [color, setColor] = useState<Color>('random');

  const { searching, joinQueue, leaveQueue } = useMatchmaking();

  const { data: activeGames } = useQuery({
    queryKey: ['active-games'],
    queryFn: gamesApi.getActive,
    enabled: tab === 'active',
  });

  const { data: history } = useQuery({
    queryKey: ['game-history'],
    queryFn: () => gamesApi.getHistory(),
    enabled: tab === 'history',
  });

  const handlePlay = async () => {
    if (opponent === 'human') {
      await joinQueue(selectedTC);
    } else {
      const game = await gamesApi.createBotGame(selectedTC, botLevel, color);
      navigate(`/game/${game.id}`);
    }
  };

  const groups = [...new Set(TIME_CONTROLS.map((t) => t.group))];

  return (
    <div className="play">
      <div className="play__tabs">
        {(['new', 'active', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`play__tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'new' ? 'Новая' : t === 'active' ? 'Активные' : 'История'}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="play__new">
          <div className="play__section">
            <div className="play__section-title">Контроль времени</div>
            {groups.map((group) => (
              <div key={group} className="play__tc-group">
                <span className="play__tc-group-label">{group}</span>
                <div className="play__tc-row">
                  {TIME_CONTROLS.filter((t) => t.group === group).map((tc) => (
                    <button
                      key={tc.value}
                      className={`play__tc-btn${selectedTC === tc.value ? ' active' : ''}`}
                      onClick={() => setSelectedTC(tc.value)}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="play__section">
            <div className="play__section-title">Соперник</div>
            <div className="play__opponent-row">
              <button
                className={`play__opponent-btn${opponent === 'human' ? ' active' : ''}`}
                onClick={() => setOpponent('human')}
              >
                👤 Человек
              </button>
              <button
                className={`play__opponent-btn${opponent === 'bot' ? ' active' : ''}`}
                onClick={() => setOpponent('bot')}
              >
                🤖 Бот
              </button>
            </div>
          </div>

          {opponent === 'bot' && (
            <div className="play__section">
              <div className="play__section-title">Сложность</div>
              <div className="play__bot-levels">
                {BOT_LEVELS.map((b) => (
                  <button
                    key={b.level}
                    className={`play__bot-btn${botLevel === b.level ? ' active' : ''}`}
                    onClick={() => setBotLevel(b.level)}
                  >
                    <div className="play__bot-badge">
                      <span className="play__bot-icon">{b.icon}</span>
                      <span className="play__bot-name">{b.label}</span>
                    </div>
                    <span className="play__bot-elo">{b.elo} ELO</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="play__section">
            <div className="play__section-title">Цвет</div>
            <div className="play__color-row">
              {([
                { value: 'white', icon: '♔', label: 'Белые' },
                { value: 'random', icon: '⚄', label: 'Случайно' },
                { value: 'black', icon: '♚', label: 'Чёрные' },
              ] as { value: Color; icon: string; label: string }[]).map((c) => (
                <button
                  key={c.value}
                  className={`play__color-btn${color === c.value ? ' active' : ''}`}
                  onClick={() => setColor(c.value)}
                >
                  <span className="play__color-icon">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {searching ? (
            <div className="play__searching">
              <div className="play__spinner" />
              <span className="play__searching-text">Поиск соперника...</span>
              <span className="play__searching-sub">Ожидайте, подбираем игрока</span>
              <button className="play__cancel-btn" onClick={() => leaveQueue()}>
                Отменить
              </button>
            </div>
          ) : (
            <button className="play__start-btn" onClick={handlePlay}>
              {opponent === 'human' ? '♟ Найти соперника' : '🤖 Играть с ботом'}
            </button>
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className="play__list">
          {!activeGames || activeGames.length === 0 ? (
            <div className="play__empty">
              <span className="play__empty-icon">♟</span>
              Нет активных партий
            </div>
          ) : (
            activeGames.map((game: any) => (
              <button
                key={game.id}
                className="play__game-card"
                onClick={() => navigate(`/game/${game.id}`)}
              >
                <span className="play__game-tc">{game.timeControl}</span>
                <span className="play__game-vs">
                  {game.white?.username ?? '?'} — {game.black?.username ?? '?'}
                </span>
                <span>›</span>
              </button>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="play__list">
          {!history || (Array.isArray(history) ? history[0] : history)?.length === 0 ? (
            <div className="play__empty">
              <span className="play__empty-icon">📋</span>
              История пуста
            </div>
          ) : (
            (Array.isArray(history) ? history[0] : history ?? []).map((game: any) => (
              <div key={game.id} className="play__game-card">
                <span className="play__game-tc">{game.timeControl}</span>
                <span className="play__game-vs">
                  {game.white?.username ?? '?'} — {game.black?.username ?? '?'}
                </span>
                <span className={`play__game-result play__game-result--${game.result}`}>
                  {game.result === 'white_win' ? 'Белые' : game.result === 'black_win' ? 'Чёрные' : 'Ничья'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
