import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { achievementsApi } from '../../api/rest';
import { Achievement } from '../../types';
import './ProfilePage.css';

const TC_GROUPS = [
  { key: 'blitz', label: 'Блиц' },
  { key: 'rapid', label: 'Рапид' },
  { key: 'bullet', label: 'Пуля' },
  { key: 'correspondence', label: 'Заочные' },
];

export const ProfilePage = () => {
  const user = useAuthStore((s) => s.user);

  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: ['achievements'],
    queryFn: achievementsApi.list,
    enabled: !!user,
  });

  if (!user) return null;

  const winRate =
    user.gamesPlayed > 0
      ? Math.round((user.wins / user.gamesPlayed) * 100)
      : 0;

  const puzzleSuccessRate =
    user.puzzlesAttempted > 0
      ? Math.round((user.puzzlesSolved / user.puzzlesAttempted) * 100)
      : 0;

  const unlockedAchievements = achievements?.filter((a) => a.unlocked) ?? [];
  const lockedAchievements = achievements?.filter((a) => !a.unlocked) ?? [];

  return (
    <div className="profile">
      <div className="profile__header">
        <div className="profile__avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username} />
          ) : (
            <div className="profile__avatar-ph">{user.username[0].toUpperCase()}</div>
          )}
        </div>
        <div className="profile__user">
          <h2 className="profile__username">{user.username}</h2>
          <div className="profile__elo-row">
            <span className="profile__elo">{user.elo} ELO</span>
            <span className="profile__best-elo">Лучший: {user.bestElo}</span>
          </div>
          <div className="profile__date">
            С {new Date(user.createdAt).toLocaleDateString('ru', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="profile__section">
        <h3 className="profile__section-title">Статистика</h3>
        <div className="profile__stats-grid">
          <div className="profile__stat">
            <span className="profile__stat-value">{user.gamesPlayed}</span>
            <span className="profile__stat-label">Партий</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-value profile__stat-value--win">{user.wins}</span>
            <span className="profile__stat-label">Побед</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-value profile__stat-value--loss">{user.losses}</span>
            <span className="profile__stat-label">Поражений</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-value">{user.draws}</span>
            <span className="profile__stat-label">Ничьих</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-value">{winRate}%</span>
            <span className="profile__stat-label">Побед %</span>
          </div>
          <div className="profile__stat">
            <span className="profile__stat-value">{user.puzzlesSolved}</span>
            <span className="profile__stat-label">Задач</span>
          </div>
        </div>
      </div>

      <div className="profile__section">
        <h3 className="profile__section-title">Задачи</h3>
        <div className="profile__puzzle-stats">
          <span>Решено: {user.puzzlesSolved} / {user.puzzlesAttempted}</span>
          <span>Успех: {puzzleSuccessRate}%</span>
        </div>
      </div>

      {achievements && achievements.length > 0 && (
        <div className="profile__section">
          <h3 className="profile__section-title">
            Достижения ({unlockedAchievements.length} / {achievements.length})
          </h3>

          {unlockedAchievements.length > 0 && (
            <div className="profile__achievements">
              {unlockedAchievements.map((a) => (
                <div key={a.id} className="profile__achievement profile__achievement--unlocked">
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
            </div>
          )}

          {lockedAchievements.length > 0 && (
            <div className="profile__achievements">
              {lockedAchievements.map((a) => (
                <div key={a.id} className="profile__achievement profile__achievement--locked">
                  <div className="profile__achievement-info">
                    <span className="profile__achievement-title">{a.title}</span>
                    <span className="profile__achievement-desc">{a.description}</span>
                    {a.target > 1 && (
                      <div className="profile__achievement-progress">
                        <div
                          className="profile__achievement-bar"
                          style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                        />
                      </div>
                    )}
                    <span className="profile__achievement-prog-text">
                      {a.progress} / {a.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
