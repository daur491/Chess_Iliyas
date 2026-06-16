import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useGameSocket } from '../../hooks/useGameSocket';
import { CountdownTimer } from '../../components/Timer/CountdownTimer';
import './GamePage.css';

export const GamePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { game, moves, timerState, isGameOver } = useGameStore();
  const { sendMove, offerDraw, resign } = useGameSocket(id);

  const isWhite = game?.whiteId === user?.id;
  const orientation = isWhite ? 'white' : 'black';

  const whiteMs = timerState?.whiteMs ?? (game?.timeSeconds ?? 600) * 1000;
  const blackMs = timerState?.blackMs ?? (game?.timeSeconds ?? 600) * 1000;
  const isWhiteTurn = timerState?.currentTurn === 'white';

  const onDrop = (source: string, target: string, piece: string) => {
    const promotion = piece[1]?.toLowerCase() === 'p' &&
      ((isWhite && target[1] === '8') || (!isWhite && target[1] === '1'))
      ? 'q'
      : undefined;
    const move = source + target + (promotion ?? '');
    sendMove(move);
    return false;
  };

  if (!game) {
    return (
      <div className="game game--loading">
        <div className="game__spinner" />
      </div>
    );
  }

  const opponent = isWhite ? game.black : game.white;
  const self = isWhite ? game.white : game.black;

  return (
    <div className="game">
      <div className="game__player game__player--top">
        <div className="game__player-info">
          <div className="game__avatar">
            {opponent?.avatarUrl ? (
              <img src={opponent.avatarUrl} alt={opponent.username} />
            ) : (
              <div className="game__avatar-ph">{opponent?.username?.[0] ?? '?'}</div>
            )}
          </div>
          <div>
            <div className="game__player-name">{opponent?.username ?? (game.isVsBot ? `Бот ${game.botLevel}` : '?')}</div>
            <div className="game__player-elo">{opponent?.elo ?? ''}</div>
          </div>
        </div>
        <CountdownTimer
          initialMs={isWhite ? blackMs : whiteMs}
          active={!isWhite ? isWhiteTurn : !isWhiteTurn}
        />
      </div>

      <div className="game__board">
        <Chessboard
          position={game.currentFen}
          onPieceDrop={onDrop}
          boardOrientation={orientation}
          areArrowsAllowed
          customBoardStyle={{ borderRadius: '4px' }}
        />
      </div>

      <div className="game__player game__player--bottom">
        <div className="game__player-info">
          <div className="game__avatar">
            {self?.avatarUrl ? (
              <img src={self.avatarUrl} alt={self.username} />
            ) : (
              <div className="game__avatar-ph">{self?.username?.[0] ?? 'Я'}</div>
            )}
          </div>
          <div>
            <div className="game__player-name">{self?.username ?? 'Вы'}</div>
            <div className="game__player-elo">{self?.elo ?? ''}</div>
          </div>
        </div>
        <CountdownTimer
          initialMs={isWhite ? whiteMs : blackMs}
          active={isWhite ? isWhiteTurn : !isWhiteTurn}
        />
      </div>

      <div className="game__moves">
        {moves.map((m, i) => (
          <span key={m.id} className="game__move">
            {i % 2 === 0 && <span className="game__move-num">{Math.floor(i / 2) + 1}.</span>}
            {m.moveSan}
          </span>
        ))}
      </div>

      {!isGameOver && (
        <div className="game__actions">
          <button className="game__action-btn game__action-btn--draw" onClick={offerDraw}>
            Ничья
          </button>
          <button className="game__action-btn game__action-btn--resign" onClick={resign}>
            Сдаться
          </button>
        </div>
      )}

      {isGameOver && (
        <div className="game__over">
          <div className="game__over-result">
            {game.result === 'draw' ? 'Ничья' :
              (game.result === 'white_win') === isWhite ? 'Победа!' : 'Поражение'}
          </div>
          {game.whiteEloChange !== 0 && (
            <div className="game__elo-change">
              ELO: {isWhite ? (game.whiteEloChange > 0 ? '+' : '') + game.whiteEloChange
                : (game.blackEloChange > 0 ? '+' : '') + game.blackEloChange}
            </div>
          )}
          <div className="game__over-actions">
            <button className="game__over-btn" onClick={() => navigate('/play')}>
              Главное меню
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
