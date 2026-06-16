import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { achievementsApi, gamesApi, puzzlesApi } from '../../api/rest';
import './HomePage.css';

const STATUS_LABEL: Record<string, string> = {
  online: 'Онлайн',
  in_game: 'В игре',
  offline: 'Не в сети',
};

const MENU_ITEMS = [
  { to: '/play', icon: '♟', label: 'Играть' },
  { to: '/train', icon: '🎯', label: 'Тренировка' },
  { to: '/rating', icon: '🏆', label: 'Рейтинг' },
  { to: '/tournaments', icon: '⚔️', label: 'Турниры' },
];

export const HomePage = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: activeGames } = useQuery({
    queryKey: ['active-games'],
    queryFn: gamesApi.getActive,
    enabled: !!user,
  });

  const { data: dailyPuzzle } = useQuery({
    queryKey: ['daily-puzzle'],
    queryFn: puzzlesApi.daily,
    enabled: !!user,
  });

  const { data: recentAchievements } = useQuery({
    queryKey: ['recent-achievements'],
    queryFn: achievementsApi.recent,
    enabled: !!user,
  });

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Загрузка...
      </div>
    );
  }

  const winRate = user.gamesPlayed > 0
    ? Math.round((user.wins / user.gamesPlayed) * 100)
    : 0;

  return (
    <div className="home">
      <div className="home__header">
        <div className="home__avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} />
          ) : (
            <div className="home__avatar-placeholder">
              {user.username[0].toUpperCase()}
            </div>
          )}
          <span className={`home__status-dot home__status-dot--${user.status}`} />
        </div>
        <div className="home__user-info">
          <h2 className="home__username">{user.username}</h2>
          <span className="home__status">{STATUS_LABEL[user.status] ?? 'Онлайн'}</span>
        </div>
        <div className="home__elo">
          <span className="home__elo-value">{user.elo}</span>
          <span className="home__elo-label">ELO</span>
        </div>
      </div>

      <div className="home__stats-row">
        <div className="home__stat">
          <span className="home__stat-value">{user.gamesPlayed}</span>
          <span className="home__stat-label">Партий</span>
        </div>
        <div className="home__stat">
          <span className="home__stat-value">{winRate}%</span>
          <span className="home__stat-label">Побед</span>
        </div>
        <div className="home__stat">
          <span className="home__stat-value">{user.puzzlesSolved}</span>
          <span className="home__stat-label">Задач</span>
        </div>
      </div>

      <div className="home__content">
        {activeGames && activeGames.length > 0 && (
          <div>
            <div className="home__section-title">♟ Незавершённые партии</div>
            <button
              className="home__continue-btn"
              onClick={() => navigate(`/game/${activeGames[0].id}`)}
            >
              Продолжить партию →
            </button>
          </div>
        )}

        {dailyPuzzle && (
          <div>
            <div className="home__section-title">🎯 Задача дня</div>
            <div className="home__puzzle-card">
              <div className="home__puzzle-info">
                <span className="home__puzzle-title">{dailyPuzzle.title}</span>
                <span className={`home__puzzle-diff home__puzzle-diff--${dailyPuzzle.difficulty}`}>
                  {dailyPuzzle.difficulty === 'easy' ? 'Лёгкая' : dailyPuzzle.difficulty === 'medium' ? 'Средняя' : 'Сложная'}
                </span>
              </div>
              <Link to={`/train/puzzle/${dailyPuzzle.id}`} className="home__puzzle-btn">
                Решить
              </Link>
            </div>
          </div>
        )}

        <div>
          <div className="home__section-title">Меню</div>
          <div className="home__menu">
            {MENU_ITEMS.map(({ to, icon, label }) => (
              <Link key={to} to={to} className="home__menu-btn">
                <span className="home__menu-icon">{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>

        {recentAchievements && recentAchievements.length > 0 && (
          <div>
            <div className="home__section-title">🏅 Достижения</div>
            <div className="home__achievements">
              {recentAchievements.map((a: any) => (
                <div key={a.id} className="home__achievement">
                  <span className="home__achievement-title">{a.title}</span>
                  <span className="home__achievement-desc">{a.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
