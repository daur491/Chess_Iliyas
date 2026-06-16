import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gamesApi } from '../../api/rest';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { TimeControl } from '../../types';
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
  { level: 1, elo: 300, label: 'Уровень 1' },
  { level: 2, elo: 600, label: 'Уровень 2' },
  { level: 3, elo: 1000, label: 'Уровень 3' },
  { level: 4, elo: 1500, label: 'Уровень 4' },
  { level: 5, elo: 2000, label: 'Уровень 5' },
];

type Tab = 'new' | 'active' | 'history';
type Opponent = 'human' | 'bot';
type Color = 'white' | 'black' | 'random';

export const PlayPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('new');
  const [selectedTC, setSelectedTC] = useState<TimeControl>('rapid_10');
  const [opponent, setOpponent] = useState<Opponent>('human');
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
          <h3 className="play__section-title">Контроль времени</h3>
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

          <h3 className="play__section-title">Соперник</h3>
          <div className="play__opponent-row">
            <button
              className={`play__opponent-btn${opponent === 'human' ? ' active' : ''}`}
              onClick={() => setOpponent('human')}
            >
              Человек
            </button>
            <button
              className={`play__opponent-btn${opponent === 'bot' ? ' active' : ''}`}
              onClick={() => setOpponent('bot')}
            >
              Бот
            </button>
          </div>

          {opponent === 'bot' && (
            <div className="play__bot-levels">
              {BOT_LEVELS.map((b) => (
                <button
                  key={b.level}
                  className={`play__bot-btn${botLevel === b.level ? ' active' : ''}`}
                  onClick={() => setBotLevel(b.level)}
                >
                  <span>{b.label}</span>
                  <span className="play__bot-elo">{b.elo} ELO</span>
                </button>
              ))}
            </div>
          )}

          <h3 className="play__section-title">Цвет</h3>
          <div className="play__color-row">
            {(['white', 'black', 'random'] as Color[]).map((c) => (
              <button
                key={c}
                className={`play__color-btn${color === c ? ' active' : ''}`}
                onClick={() => setColor(c)}
              >
                {c === 'white' ? '♔ Белые' : c === 'black' ? '♚ Чёрные' : '⚄ Случайно'}
              </button>
            ))}
          </div>

          {searching ? (
            <div className="play__searching">
              <div className="play__spinner" />
              <span>Поиск соперника...</span>
              <button className="play__cancel-btn" onClick={() => leaveQueue()}>
                Отменить
              </button>
            </div>
          ) : (
            <button className="play__start-btn" onClick={handlePlay}>
              {opponent === 'human' ? 'Найти соперника' : 'Играть с ботом'}
            </button>
          )}
        </div>
      )}

      {tab === 'active' && (
        <div className="play__list">
          {!activeGames || activeGames.length === 0 ? (
            <div className="play__empty">Нет активных партий</div>
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
              </button>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="play__list">
          {!history || history[0]?.length === 0 ? (
            <div className="play__empty">Нет сыгранных партий</div>
          ) : (
            (Array.isArray(history) ? history[0] : []).map((game: any) => (
              <div key={game.id} className="play__game-card play__game-card--history">
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
