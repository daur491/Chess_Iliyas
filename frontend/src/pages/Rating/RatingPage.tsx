import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { ratingApi } from '../../api/rest';
import type { LeaderboardEntry } from '../../types';
import './RatingPage.css';

type Tab = 'elo' | 'puzzles';

const MEDALS = ['🥇', '🥈', '🥉'];

export const RatingPage = () => {
  const [tab, setTab] = useState<Tab>('elo');
  const user = useAuthStore((s) => s.user);

  const { data: eloData, isLoading: eloLoading } = useQuery({
    queryKey: ['leaderboard-elo'],
    queryFn: ratingApi.leaderboard,
  });

  const { data: puzzleData } = useQuery({
    queryKey: ['leaderboard-puzzles'],
    queryFn: ratingApi.puzzleLeaderboard,
    enabled: tab === 'puzzles',
  });

  const top10: LeaderboardEntry[] = tab === 'elo' ? eloData?.top10 ?? [] : puzzleData?.top10 ?? [];
  const myPos = tab === 'elo' ? eloData?.myPosition : puzzleData?.myPosition;
  const context: LeaderboardEntry[] = eloData?.context ?? [];

  return (
    <div className="rating">
      <h1 className="rating__title">Рейтинг</h1>

      <div className="rating__tabs">
        <button className={`rating__tab${tab === 'elo' ? ' active' : ''}`} onClick={() => setTab('elo')}>
          ⚡ ELO
        </button>
        <button className={`rating__tab${tab === 'puzzles' ? ' active' : ''}`} onClick={() => setTab('puzzles')}>
          🧩 Задачи
        </button>
      </div>

      {eloLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Загрузка...
        </div>
      ) : (
        <div className="rating__list">
          {top10.map((entry) => (
            <div
              key={entry.userId}
              className={[
                'rating__row',
                entry.userId === user?.id ? 'rating__row--me' : '',
                entry.rank <= 3 ? `rating__row--top${entry.rank}` : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="rating__rank">
                {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
              </span>
              <div className="rating__avatar">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={entry.username} />
                ) : (
                  <div className="rating__avatar-ph">{entry.username[0]}</div>
                )}
              </div>
              <span className="rating__username">{entry.username}</span>
              <span className="rating__score">
                {tab === 'elo' ? entry.elo : entry.puzzlesSolved}
              </span>
            </div>
          ))}
        </div>
      )}

      {myPos && myPos > 10 && context.length > 0 && (
        <>
          <div className="rating__separator">···</div>
          <div className="rating__list">
            {context.map((entry) => (
              <div
                key={entry.userId}
                className={`rating__row${entry.userId === user?.id ? ' rating__row--me' : ''}`}
              >
                <span className="rating__rank">#{entry.rank}</span>
                <div className="rating__avatar">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt={entry.username} />
                  ) : (
                    <div className="rating__avatar-ph">{entry.username[0]}</div>
                  )}
                </div>
                <span className="rating__username">{entry.username}</span>
                <span className="rating__score">{entry.elo}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {top10.length === 0 && !eloLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          Рейтинговая таблица пуста
        </div>
      )}
    </div>
  );
};
