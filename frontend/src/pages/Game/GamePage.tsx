import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useGameSocket } from '../../hooks/useGameSocket';
import { gamesApi } from '../../api/rest';
import { CountdownTimer } from '../../components/Timer/CountdownTimer';
import './GamePage.css';

// Chess piece SVGs (Unicode-based, rendered as text)
const PIECES: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

function parseFen(fen: string): Record<string, string> {
  const pos: Record<string, string> = {};
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, rankIdx) => {
    let fileIdx = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { fileIdx += parseInt(ch); }
      else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        const piece = color + ch.toUpperCase();
        pos[FILES[fileIdx] + RANKS[rankIdx]] = piece;
        fileIdx++;
      }
    }
  });
  return pos;
}

export const GamePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { game, moves, timerState, isGameOver, setGame, setMoves, setGameOver, reset } = useGameStore();
  const { sendMove, offerDraw, resign } = useGameSocket(id);
  const [wsTimeout, setWsTimeout] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  // lastMove: { from, to } — used for highlight + slide animation
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  // animKey bumped each time a new move lands so CSS animation re-triggers
  const [animKey, setAnimKey] = useState(0);
  const chessRef = useRef(new Chess());

  useEffect(() => { reset(); setSelected(null); setLegalTargets([]); setLastMove(null); setAnimKey(0); }, [id]);

  useEffect(() => {
    if (game?.currentFen) {
      try { chessRef.current = new Chess(game.currentFen); } catch {}
    }
  }, [game?.currentFen]);

  // Sync lastMove from moves list — catches bot moves too
  useEffect(() => {
    if (moves.length === 0) return;
    const last = moves[moves.length - 1];
    if (last?.moveUci && last.moveUci.length >= 4) {
      const from = last.moveUci.slice(0, 2);
      const to   = last.moveUci.slice(2, 4);
      setLastMove({ from, to });
      setAnimKey((k) => k + 1);
    }
  }, [moves]);

  useEffect(() => {
    if (game) return;
    const timer = setTimeout(async () => {
      if (game) return;
      setWsTimeout(true);
      try {
        const { game: g, moves: m } = await gamesApi.getGame(id!);
        setGame(g);
        setMoves(m);
      } catch (e) {
        console.error('REST fallback failed', e);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, game]);

  // All hooks must be before any early return
  const isWhite = game?.whiteId === user?.id;
  const isBlack = game?.blackId === user?.id;

  const doMove = useCallback(async (from: string, to: string, promotion = '') => {
    if (moving || !id) return;
    setMoving(true);
    setSelected(null);
    setLegalTargets([]);
    try {
      const result = await gamesApi.makeMove(id, from + to + promotion);
      // Response contains game after bot move (if vs bot)
      const g = result.game;
      setGame(g);
      if (result.isGameOver) setGameOver(true);
      try { chessRef.current = new Chess(g.currentFen); } catch {}
      // Refresh moves list
      const { moves: m } = await gamesApi.getGame(id);
      setMoves(m);
    } catch (e: any) {
      console.error('Move failed:', e?.response?.data ?? e?.message);
    } finally {
      setMoving(false);
    }
  }, [id, moving]);

  const handleResign = useCallback(async () => {
    if (!id) return;
    try {
      const g = await gamesApi.resign(id);
      setGame(g);
    } catch (e) {
      console.error('Resign failed', e);
    }
  }, [id]);

  if (!game) {
    return (
      <div className="game game--loading">
        <div className="game__spinner" />
        {wsTimeout && <div className="game__loading-text">Подключение...</div>}
      </div>
    );
  }

  const fenTurn = game.currentFen.split(' ')[1];
  const isWhiteTurn = fenTurn === 'w';
  const myTurn = !isGameOver && ((isWhite && isWhiteTurn) || (isBlack && !isWhiteTurn));

  const whiteMs = timerState?.whiteMs ?? game.timeSeconds * 1000;
  const blackMs = timerState?.blackMs ?? game.timeSeconds * 1000;

  const opponent = isWhite ? game.black : game.white;
  const self = isWhite ? game.white : game.black;
  const opponentName = opponent?.username ?? (game.isVsBot ? `Бот ${game.botLevel ?? ''}` : '?');
  const selfName = self?.username ?? user?.username ?? 'Вы';

  const position = parseFen(game.currentFen);
  const files = isBlack ? [...FILES].reverse() : FILES;
  const ranks = isBlack ? [...RANKS].reverse() : RANKS;

  // Compute slide offset in board cells for the piece that just landed on `to`
  const getSlideStyle = (sq: string): React.CSSProperties | undefined => {
    if (!lastMove || sq !== lastMove.to) return undefined;
    const fromFile = FILES.indexOf(lastMove.from[0]);
    const fromRank = RANKS.indexOf(lastMove.from[1]);
    const toFile   = FILES.indexOf(sq[0]);
    const toRank   = RANKS.indexOf(sq[1]);
    let dx = fromFile - toFile;
    let dy = fromRank - toRank;
    if (isBlack) { dx = -dx; dy = -dy; }
    return {
      '--slide-x': `${dx * 100}%`,
      '--slide-y': `${dy * 100}%`,
    } as React.CSSProperties;
  };

  const handleSquareClick = (sq: string) => {
    if (!myTurn || moving) return;
    const chess = chessRef.current;

    if (selected) {
      if (legalTargets.includes(sq)) {
        const piece = position[selected];
        const isPromotion = piece === (isWhite ? 'wP' : 'bP') &&
          ((isWhite && sq[1] === '8') || (isBlack && sq[1] === '1'));
        doMove(selected, sq, isPromotion ? 'q' : '');
        return;
      }
      const clickedPiece = position[sq];
      const isOwn = clickedPiece && (isWhite ? clickedPiece[0] === 'w' : clickedPiece[0] === 'b');
      if (isOwn) {
        const legalMoves = chess.moves({ square: sq as any, verbose: true });
        setSelected(sq);
        setLegalTargets(legalMoves.map((m: any) => m.to));
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    const piece = position[sq];
    if (!piece) return;
    const isOwn = isWhite ? piece[0] === 'w' : piece[0] === 'b';
    if (!isOwn) return;

    const legalMoves = chess.moves({ square: sq as any, verbose: true });
    setSelected(sq);
    setLegalTargets(legalMoves.map((m: any) => m.to));
  };

  return (
    <div className="game">
      {/* Opponent */}
      <div className="game__player">
        <div className="game__player-info">
          <div className="game__avatar">
            <div className="game__avatar-ph">{game.isVsBot ? '🤖' : opponentName[0]}</div>
          </div>
          <div>
            <div className="game__player-name">{opponentName}</div>
            {opponent?.elo && <div className="game__player-elo">{opponent.elo} ELO</div>}
          </div>
        </div>
        <CountdownTimer
          initialMs={isWhite ? blackMs : whiteMs}
          active={!isGameOver && (isWhite ? !isWhiteTurn : isWhiteTurn)}
        />
      </div>

      {/* Board */}
      <div className="game__board-wrap">
        <div className="game__board">
          {ranks.map((rank) =>
            files.map((file) => {
              const sq = file + rank;
              const piece = position[sq];
              const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 !== 0;
              const isSelected = selected === sq;
              const isTarget = legalTargets.includes(sq);
              const isLastFrom = lastMove?.from === sq;
              const isLastTo   = lastMove?.to === sq;
              const slideStyle = getSlideStyle(sq);

              return (
                <div
                  key={sq}
                  className={[
                    'game__square',
                    isLight ? 'game__square--light' : 'game__square--dark',
                    isSelected ? 'game__square--selected' : '',
                    isTarget ? 'game__square--target' : '',
                    isLastFrom ? 'game__square--last-from' : '',
                    isLastTo   ? 'game__square--last-to'   : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleSquareClick(sq)}
                >
                  {piece && (
                    <span
                      key={`${sq}-${animKey}`}
                      className={`game__piece game__piece--${piece[0]}${slideStyle ? ' game__piece--slide' : ''}`}
                      style={slideStyle}
                    >
                      {PIECES[piece]}
                    </span>
                  )}
                  {isTarget && !piece && <div className="game__dot" />}
                  {isTarget && piece && <div className="game__capture-ring" />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Self + bottom */}
      <div className="game__bottom">
        <div className="game__player">
          <div className="game__player-info">
            <div className="game__avatar">
              <div className="game__avatar-ph">{selfName[0]?.toUpperCase()}</div>
            </div>
            <div>
              <div className="game__player-name">{selfName}</div>
              <div className="game__player-elo">{self?.elo ?? user?.elo ?? ''} ELO</div>
            </div>
          </div>
          <CountdownTimer
            initialMs={isWhite ? whiteMs : blackMs}
            active={myTurn}
          />
        </div>

        {moves.length > 0 && (
          <div className="game__moves">
            {moves.map((m, i) => (
              <span key={m.id} className="game__move">
                {i % 2 === 0 && <span className="game__move-num">{Math.floor(i / 2) + 1}.</span>}
                {m.moveSan}{' '}
              </span>
            ))}
          </div>
        )}

        {!isGameOver && (
          <div className="game__actions">
            <button className="game__action-btn game__action-btn--draw" onClick={offerDraw}>½ Ничья</button>
            <button className="game__action-btn game__action-btn--resign" onClick={handleResign}>⚑ Сдаться</button>
          </div>
        )}

        {isGameOver && (
          <div className="game__over">
            <div className="game__over-result">
              {game.result === 'draw' ? '½ — ½ Ничья'
                : (game.result === 'white_win') === isWhite ? '🏆 Победа!' : '💀 Поражение'}
            </div>
            {(game.whiteEloChange !== 0 || game.blackEloChange !== 0) && (
              <div className="game__elo-change">
                ELO: {isWhite
                  ? (game.whiteEloChange > 0 ? '+' : '') + game.whiteEloChange
                  : (game.blackEloChange > 0 ? '+' : '') + game.blackEloChange}
              </div>
            )}
            <div className="game__over-actions">
              <button className="game__over-btn" onClick={() => navigate('/play')}>Новая партия</button>
              <button className="game__over-btn game__over-btn--secondary" onClick={() => navigate('/')}>Главная</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
