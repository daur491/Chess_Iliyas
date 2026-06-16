import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tournamentsApi } from '../../api/rest';
import { Tournament } from '../../types';
import './TournamentsPage.css';

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Скоро',
  registration: 'Регистрация',
  active: 'Идёт',
  finished: 'Завершён',
};

const TC_LABEL: Record<string, string> = {
  blitz_3: 'Блиц 3 мин',
  blitz_5: 'Блиц 5 мин',
  rapid_10: 'Рапид 10 мин',
  rapid_15: 'Рапид 15 мин',
};

export const TournamentsPage = () => {
  const [selected, setSelected] = useState<Tournament | null>(null);
  const queryClient = useQueryClient();

  const { data: tournaments } = useQuery<Tournament[]>({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.list,
  });

  const { data: standings } = useQuery({
    queryKey: ['standings', selected?.id],
    queryFn: () => tournamentsApi.standings(selected!.id),
    enabled: !!selected,
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => tournamentsApi.join(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
  });

  if (selected) {
    return (
      <div className="tournaments">
        <button className="tournaments__back" onClick={() => setSelected(null)}>← Назад</button>
        <h2 className="tournaments__detail-title">{selected.name}</h2>
        <div className="tournaments__detail-meta">
          <span>{TC_LABEL[selected.timeControl] ?? selected.timeControl}</span>
          <span className={`tournaments__status tournaments__status--${selected.status}`}>
            {STATUS_LABEL[selected.status]}
          </span>
          <span>{selected.participants.length} / {selected.maxPlayers} игроков</span>
        </div>

        {selected.status === 'registration' && (
          <button
            className="tournaments__join-btn"
            onClick={() => joinMutation.mutate(selected.id)}
            disabled={joinMutation.isPending}
          >
            Зарегистрироваться
          </button>
        )}

        {standings && standings.length > 0 && (
          <div className="tournaments__standings">
            <h3 className="tournaments__standings-title">Турнирная таблица</h3>
            {standings.map((p: any, i: number) => (
              <div key={p.id} className="tournaments__standing-row">
                <span className="tournaments__standing-rank">#{i + 1}</span>
                <span className="tournaments__standing-name">{p.user?.username ?? '?'}</span>
                <span className="tournaments__standing-score">{p.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tournaments">
      <h1 className="tournaments__title">Турниры</h1>
      <div className="tournaments__list">
        {!tournaments || tournaments.length === 0 ? (
          <div className="tournaments__empty">Нет доступных турниров</div>
        ) : (
          tournaments.map((t) => (
            <button
              key={t.id}
              className="tournaments__card"
              onClick={() => setSelected(t)}
            >
              <div className="tournaments__card-top">
                <span className="tournaments__card-name">{t.name}</span>
                <span className={`tournaments__status tournaments__status--${t.status}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <div className="tournaments__card-meta">
                <span>{TC_LABEL[t.timeControl] ?? t.timeControl}</span>
                <span>{t.participants.length} / {t.maxPlayers}</span>
                {t.startedAt && (
                  <span>{new Date(t.startedAt).toLocaleDateString('ru')}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
