import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { achievementsApi } from '../../api/rest';
import type { Achievement } from '../../types';
import './ProfilePage.css';

export const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: achievementsApi.list,
    enabled: !!user,
  });

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        Загрузка профиля...
      </div>
    );
  }

  const winRate = user.gamesPlayed > 0 ? Math.round((user.wins / user.gamesPlayed) * 100) : 0;
  const drawRate = user.gamesPlayed > 0 ? Math.round((user.draws / user.gamesPlayed) * 100) : 0;
  const lossRate = 100 - winRate - drawRate;

  const puzzleSuccessRate = user.puzzlesAttempted > 0
    ? Math.round((user.puzzlesSolved / user.puzzlesAttempted) * 100)
    : 0;

  const unlockedAchievements = achievements?.filter((a) => a.unlocked) ?? [];
  const lockedAchievements = achievements?.filter((a) => !a.unlocked) ?? [];

  return (
    <div className="profile">
      <div className="profile__hero">
        <div className="profile__avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} />
          ) : (
            <div className="profile__avatar-ph">{user.username[0].toUpperCase()}</div>
          )}
        </div>
        <h2 className="profile__username">{user.username}</h2>
        <div className="profile__elo-badge">
          <span className="profile__elo">{user.elo} ELO</span>
          <span className="profile__best-elo">Макс: {user.bestElo}</span>
        </div>
        <div className="profile__date">
          Играет с {new Date(user.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="profile__content">
        <div>
          <div className="profile__section-title">Статистика</div>
          <div className="profile__stats-grid">
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--neutral">{user.gamesPlayed}</span>
              <span className="profile__stat-label">Партий</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--win">{user.wins}</span>
              <span className="profile__stat-label">Победы</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--loss">{user.losses}</span>
              <span className="profile__stat-label">Поражения</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--neutral">{user.draws}</span>
              <span className="profile__stat-label">Ничьи</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--win">{winRate}%</span>
              <span className="profile__stat-label">Побед %</span>
            </div>
            <div className="profile__stat">
              <span className="profile__stat-value profile__stat-value--neutral">{user.puzzlesSolved}</span>
              <span className="profile__stat-label">Задач</span>
            </div>
          </div>
        </div>

        {user.gamesPlayed > 0 && (
          <div className="profile__winrate-card">
            <div className="profile__winrate-header">
              <span className="profile__winrate-label">Результаты</span>
              <span className="profile__winrate-pct">{winRate}% побед</span>
            </div>
            <div className="profile__winrate-bar">
              <div className="profile__winrate-fill-win" style={{ width: `${winRate}%` }} />
              <div className="profile__winrate-fill-draw" style={{ width: `${drawRate}%` }} />
              <div className="profile__winrate-fill-loss" style={{ width: `${lossRate}%` }} />
            </div>
            <div className="profile__winrate-legend">
              <div className="profile__legend-item">
                <div className="profile__legend-dot" style={{ background: 'var(--green)' }} />
                {user.wins} П
              </div>
              <div className="profile__legend-item">
                <div className="profile__legend-dot" style={{ background: 'var(--gold)' }} />
                {user.draws} Н
              </div>
              <div className="profile__legend-item">
                <div className="profile__legend-dot" style={{ background: 'var(--red)' }} />
                {user.losses} П
              </div>
            </div>
          </div>
        )}

        <div className="profile__puzzle-card">
          <div className="profile__puzzle-info">
            <span className="profile__puzzle-solved">{user.puzzlesSolved}</span>
            <span className="profile__puzzle-sub">задач решено из {user.puzzlesAttempted}</span>
          </div>
          <span className="profile__puzzle-rate">{puzzleSuccessRate}% 🧩</span>
        </div>

        {achievements && achievements.length > 0 && (
          <div>
            <div className="profile__section-title">
              Достижения · {unlockedAchievements.length}/{achievements.length}
            </div>
            <div className="profile__achievements">
              {unlockedAchievements.map((a) => (
                <div key={a.id} className="profile__achievement profile__achievement--unlocked">
                  <span className="profile__achievement-icon">🏅</span>
                  <div className="profile__achievement-info">
                    <span className="profile__achievement-title">{a.title}</span>
                    <span className="profile__achievement-desc">{a.description}</span>
                    {a.unlockedAt && (
                      <span className="profile__achievement-date">
                        {new Date(a.unlockedAt).toLocaleDateString('ru')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {lockedAchievements.map((a) => (
                <div key={a.id} className="profile__achievement profile__achievement--locked">
                  <span className="profile__achievement-icon">🔒</span>
                  <div className="profile__achievement-info">
                    <span className="profile__achievement-title">{a.title}</span>
                    <span className="profile__achievement-desc">{a.description}</span>
                    {a.target > 1 && (
                      <>
                        <div className="profile__achievement-progress">
                          <div
                            className="profile__achievement-bar"
                            style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                          />
                        </div>
                        <span className="profile__achievement-prog-text">{a.progress} / {a.target}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
