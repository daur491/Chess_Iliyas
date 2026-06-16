import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { ratingApi } from '../../api/rest';
import { LeaderboardEntry } from '../../types';
import './RatingPage.css';

type Tab = 'elo' | 'puzzles';

export const RatingPage = () => {
  const [tab, setTab] = useState<Tab>('elo');
  const user = useAuthStore((s) => s.user);

  const { data: eloData } = useQuery({
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
          ELO
        </button>
        <button className={`rating__tab${tab === 'puzzles' ? ' active' : ''}`} onClick={() => setTab('puzzles')}>
          Задачи
        </button>
      </div>

      <div className="rating__list">
        {top10.map((entry) => (
          <div
            key={entry.userId}
            className={`rating__row${entry.userId === user?.id ? ' rating__row--me' : ''}${entry.rank <= 3 ? ` rating__row--top${entry.rank}` : ''}`}
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
            <span className="rating__score">
              {tab === 'elo' ? entry.elo : entry.puzzlesSolved}
            </span>
          </div>
        ))}
      </div>

      {myPos && myPos > 10 && context.length > 0 && (
        <>
          <div className="rating__separator">...</div>
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
    </div>
  );
};
