import { useEffect, useRef, useState, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { useGameSocket } from '../../hooks/useGameSocket';
import { gamesApi } from '../../api/rest';
import { CountdownTimer } from '../../components/Timer/CountdownTimer';
import './GamePage.css';

// SVG chess pieces — Cburnett style (Lichess open source)
// White pieces: white fill + black stroke; Black pieces: black fill + white/grey details
const PieceSvg = ({ code }: { code: string }) => {
  const isW = code[0] === 'w';
  const type = code[1]; // K Q R B N P

  const fill  = isW ? '#fff'   : '#202020';
  const stroke = isW ? '#000'   : '#000';
  const detail = isW ? '#ccc'   : '#777';

  // Paths loosely based on Cburnett piece outlines, simplified to single-path per piece
  const paths: Record<string, string> = {
    K: isW
      ? 'M 22.5,11.63 L 22.5,6 M 20,8 L 25,8 M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25 z M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 11.5,37 z'
      : 'M 22.5,11.63 L 22.5,6 M 20,8 L 25,8 M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25 z M 11.5,37 C 17,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 11.5,37 z',
    Q: 'M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 22.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z',
    R: 'M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 z M 34,14 L 31,17 L 14,17 L 11,14 z M 12,32 L 12,17 L 33,17 L 33,32 L 12,32 z',
    B: 'M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z M 25,8 A 2.5,2.5 0 1 1 20,8 A 2.5,2.5 0 1 1 25,8 z',
    N: 'M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18 z M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10',
    P: isW
      ? 'M 22,9 C 19.79,9 18,10.79 18,13 C 18,14.07 18.43,15.03 19.13,15.72 C 17.83,16.93 17,18.66 17,20.5 C 17,21.73 17.37,22.87 18,23.83 L 11,39 L 34,39 L 27,23.83 C 27.63,22.87 28,21.73 28,20.5 C 28,18.66 27.17,16.93 25.87,15.72 C 26.57,15.03 27,14.07 27,13 C 27,10.79 25.21,9 23,9 z'
      : 'M 22,9 C 19.79,9 18,10.79 18,13 C 18,14.07 18.43,15.03 19.13,15.72 C 17.83,16.93 17,18.66 17,20.5 C 17,21.73 17.37,22.87 18,23.83 L 11,39 L 34,39 L 27,23.83 C 27.63,22.87 28,21.73 28,20.5 C 28,18.66 27.17,16.93 25.87,15.72 C 26.57,15.03 27,14.07 27,13 C 27,10.79 25.21,9 23,9 z',
  };

  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg" className="piece-svg">
      <path
        d={paths[type] ?? paths.P}
        fill={fill}
        stroke={stroke}
        strokeWidth={isW ? 1.5 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Detail line for contrast */}
      {(type === 'R' || type === 'Q') && (
        <path d={type === 'R'
          ? 'M 12,17 L 12,32 M 33,17 L 33,32'
          : 'M 11.5,30 C 15,29 30,29 33.5,30'
        } fill="none" stroke={detail} strokeWidth="1" />
      )}
    </svg>
  );
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

// Flying piece state during animation
interface FlyingPiece {
  piece: string;   // e.g. 'wP'
  fromSq: string;
  toSq: string;
  fromX: number;  // px relative to board wrapper
  fromY: number;
  toX: number;
  toY: number;
  durationMs: number;
}

// Per-move animation duration depends on the time control: faster games get a
// snappier slide, slower games a smoother one.
//   >= 10 min (600s) -> 300ms;  <= 5 min (300s) -> 200ms;  in between -> linear.
function getMoveAnimMs(timeSeconds: number): number {
  if (timeSeconds >= 600) return 300;
  if (timeSeconds <= 300) return 200;
  const t = (timeSeconds - 300) / (600 - 300);
  return Math.round(200 + t * (300 - 200));
}

export const GamePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { game, moves, timerState, isGameOver, setGame, setMoves, setGameOver, reset } = useGameStore();
  const { offerDraw, acceptDraw, sendMove: _sendMove, resign: _resign, drawOfferedBy } = useGameSocket(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [flyingPiece, setFlyingPiece] = useState<FlyingPiece | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ from: string; to: string } | null>(null);
  const [drawDismissed, setDrawDismissed] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const chessRef = useRef(new Chess());
  const animMsRef = useRef(250);
  const filesRef = useRef<string[]>(FILES);
  const ranksRef = useRef<string[]>(RANKS);
  const animatedMovesRef = useRef<number | null>(null);

  // Get center px coords of a square relative to board wrapper
  const getSquareCenter = useCallback((sq: string, filesArr: string[], ranksArr: string[]) => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const sqW = rect.width / 8;
    const sqH = rect.height / 8;
    return {
      x: filesArr.indexOf(sq[0]) * sqW + sqW / 2,
      y: ranksArr.indexOf(sq[1]) * sqH + sqH / 2,
    };
  }, []);

  // Start a flying piece animation from->to. Resolves when the slide finishes.
  const animatePiece = useCallback((piece: string, from: string, to: string, filesArr: string[], ranksArr: string[]) => {
    const fromCenter = getSquareCenter(from, filesArr, ranksArr);
    const toCenter   = getSquareCenter(to,   filesArr, ranksArr);
    if (!fromCenter || !toCenter || !piece) return Promise.resolve();
    const durationMs = animMsRef.current;
    setFlyingPiece({ piece, fromSq: from, toSq: to, fromX: fromCenter.x, fromY: fromCenter.y, toX: toCenter.x, toY: toCenter.y, durationMs });
    return new Promise<void>((resolve) => setTimeout(() => { setFlyingPiece(null); resolve(); }, durationMs));
  }, [getSquareCenter]);

  useEffect(() => {
    reset();
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setFlyingPiece(null);
    setDrawDismissed(false);
    animatedMovesRef.current = null;
  }, [id]);

  useEffect(() => {
    if (game?.currentFen) {
      try { chessRef.current = new Chess(game.currentFen); } catch {}
    }
  }, [game?.currentFen]);

  useEffect(() => {
    if (game?.timeSeconds) {
      animMsRef.current = getMoveAnimMs(game.timeSeconds);
    }
  }, [game?.timeSeconds]);

  // Sync lastMove from moves list and animate opponent/bot moves as they arrive.
  // animatedMovesRef tracks how many moves we've already reflected (our own moves
  // are animated in doMove). Initialized lazily on first sync.
  useEffect(() => {
    if (moves.length === 0) {
      animatedMovesRef.current = 0;
      return;
    }
    const last = moves[moves.length - 1];
    if (!last?.moveUci || last.moveUci.length < 4) return;

    const from = last.moveUci.slice(0, 2);
    const to = last.moveUci.slice(2, 4);

    // First load (page open / reconnect): don't animate history, just highlight.
    if (animatedMovesRef.current === null) {
      animatedMovesRef.current = moves.length;
      setLastMove({ from, to });
      return;
    }

    // No new moves since last time.
    if (moves.length <= animatedMovesRef.current) return;

    animatedMovesRef.current = moves.length;

    // A human opponent's move arrives via socket/poll and must be animated here.
    // Our own moves and bot moves are already animated inline in doMove, so we
    // only slide for a real opponent (not us, not the bot placeholder id).
    const isOwn = !!user?.id && last.playerId === user.id;
    const isBot = last.playerId === '__bot__';
    const madeByOpponent = !isOwn && !isBot;
    const piece = parseFen(last.fenAfter)[to];

    if (madeByOpponent && piece) {
      animatePiece(piece, from, to, filesRef.current, ranksRef.current).then(() => {
        setLastMove({ from, to });
      });
    } else {
      setLastMove({ from, to });
    }
  }, [moves, user?.id, animatePiece]);

  useEffect(() => { setDrawDismissed(false); }, [drawOfferedBy]);

  const movesCountRef = useRef(0);

  // Load game via REST immediately on mount, then poll for opponent moves
  useEffect(() => {
    if (!id) return;

    let active = true;

    const sync = async () => {
      try {
        const { game: g, moves: m } = await gamesApi.getGame(id);
        if (!active) return;
        // Always update game (to get white/black user objects)
        setGame(g);
        // Only update moves if count changed (avoids resetting animation)
        if (m.length !== movesCountRef.current) {
          movesCountRef.current = m.length;
          setMoves(m);
        }
        if (g.status === 'finished') {
          setGameOver(true);
        }
      } catch (e) {
        console.error('Failed to sync game', e);
      }
    };

    sync();
    const interval = setInterval(sync, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  // All hooks must be before any early return
  const isWhite = game?.whiteId === user?.id;
  const isBlack = game?.blackId === user?.id;

  const doMove = useCallback(async (from: string, to: string, promotion = '', positionSnapshot: Record<string, string>, filesArr: string[], ranksArr: string[]) => {
    if (moving || !id) return;

    setMoving(true);
    setSelected(null);
    setLegalTargets([]);

    // Animate player's piece immediately
    const playerPiece = positionSnapshot[from];
    await animatePiece(playerPiece, from, to, filesArr, ranksArr);

    try {
      const result = await gamesApi.makeMove(id, from + to + promotion);

      // If bot responded — show its move on the intermediate FEN (before bot move)
      if (result.botMove?.moveUci && result.botMove.moveUci.length >= 4) {
        const botFrom = result.botMove.moveUci.slice(0, 2);
        const botTo   = result.botMove.moveUci.slice(2, 4);

        // Apply only player's move first so board shows correct intermediate state
        const playerFen = result.playerFen ?? result.game.currentFen;
        const intermediatePos = parseFen(playerFen);
        const botPiece = intermediatePos[botFrom] ?? '';

        // Show board after player move, then animate bot
        setGame({ ...result.game, currentFen: playerFen });
        try { chessRef.current = new Chess(playerFen); } catch {}

        await animatePiece(botPiece, botFrom, botTo, filesArr, ranksArr);
      }

      // Apply final state — polling will sync moves automatically
      setGame(result.game);
      if (result.isGameOver) setGameOver(true);
      try { chessRef.current = new Chess(result.game.currentFen); } catch {}
    } catch (e: any) {
      console.error('Move failed:', e?.response?.data ?? e?.message);
    } finally {
      setMoving(false);
    }
  }, [id, moving, animatePiece]);

  const handleResign = useCallback(async () => {
    if (!id) return;
    try {
      const g = await gamesApi.resign(id);
      setGame(g);
      setGameOver(true);
    } catch (e) {
      console.error('Resign failed', e);
    }
  }, [id]);

  if (!game) {
    return (
      <div className="game game--loading">
        <div className="game__spinner" />
        <div className="game__loading-text">Загрузка...</div>
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

  // Show draw offer banner only when the OPPONENT offered (not self)
  const activeDrawOffer = drawOfferedBy ?? game.drawOfferedBy ?? null;
  const drawPendingFromOpponent =
    !isGameOver &&
    !drawDismissed &&
    activeDrawOffer !== null &&
    activeDrawOffer !== user?.id;

  const position = parseFen(game.currentFen);
  const files = isBlack ? [...FILES].reverse() : FILES;
  const ranks = isBlack ? [...RANKS].reverse() : RANKS;
  filesRef.current = files;
  ranksRef.current = ranks;

  const handleSquareClick = (sq: string) => {
    if (!myTurn || moving) return;
    const chess = chessRef.current;

    if (selected) {
      if (legalTargets.includes(sq)) {
        const piece = position[selected];
        const isPromotion = piece === (isWhite ? 'wP' : 'bP') &&
          ((isWhite && sq[1] === '8') || (isBlack && sq[1] === '1'));
        if (isPromotion) {
          setPromotionPending({ from: selected, to: sq });
          setSelected(null);
          setLegalTargets([]);
          return;
        }
        doMove(selected, sq, '', position, files, ranks);
        return;
      }
      const clickedPiece = position[sq];
      const isOwn = clickedPiece && (isWhite ? clickedPiece[0] === 'w' : clickedPiece[0] === 'b');
      if (isOwn) {
        setSelected(sq);
        setLegalTargets(chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
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

    setSelected(sq);
    setLegalTargets(chess.moves({ square: sq as any, verbose: true }).map((m: any) => m.to));
  };

  // Flying piece absolute style
  const flyingStyle: CSSProperties | undefined = flyingPiece ? {
    position: 'absolute',
    left: flyingPiece.fromX,
    top: flyingPiece.fromY,
    transform: 'translate(-50%, -50%)',
    '--fly-dx': `${flyingPiece.toX - flyingPiece.fromX}px`,
    '--fly-dy': `${flyingPiece.toY - flyingPiece.fromY}px`,
    animationDuration: `${flyingPiece.durationMs}ms`,
    pointerEvents: 'none',
    zIndex: 100,
  } as CSSProperties : undefined;

  return (
    <div className="game">
      {/* Opponent */}
      <div className="game__player">
        <div className="game__player-info">
          <div className="game__avatar">
            {opponent?.avatarUrl ? (
              <img className="game__avatar-img" src={opponent.avatarUrl} alt={opponentName} />
            ) : (
              <div className="game__avatar-ph">{game.isVsBot ? '🤖' : opponentName[0]?.toUpperCase()}</div>
            )}
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
        {promotionPending && (
          <div className="game__promotion-overlay">
            <div className="game__promotion-dialog">
              <div className="game__promotion-title">Выберите фигуру</div>
              <div className="game__promotion-pieces">
                {(['q', 'r', 'b', 'n'] as const).map((piece) => {
                  const code = (isWhite ? 'w' : 'b') + piece.toUpperCase();
                  const labels: Record<string, string> = { q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь' };
                  return (
                    <button
                      key={piece}
                      className="game__promotion-btn"
                      onClick={() => {
                        const { from, to } = promotionPending;
                        setPromotionPending(null);
                        doMove(from, to, piece, position, files, ranks);
                      }}
                    >
                      <PieceSvg code={code} />
                      <span className="game__promotion-label">{labels[piece]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="game__board" ref={boardRef}>
          {ranks.map((rank) =>
            files.map((file) => {
              const sq = file + rank;
              // Hide the piece on the flying origin and destination squares while
              // a slide animation is in progress (the overlay piece is shown instead).
              const piece =
                flyingPiece && (flyingPiece.fromSq === sq || flyingPiece.toSq === sq)
                  ? undefined
                  : position[sq];
              const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 !== 0;
              const isSelected = selected === sq;
              const isTarget = legalTargets.includes(sq);
              const isLastFrom = lastMove?.from === sq;
              const isLastTo   = lastMove?.to === sq;

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
                    <span className="game__piece">
                      <PieceSvg code={piece} />
                    </span>
                  )}
                  {isTarget && !piece && <div className="game__dot" />}
                  {isTarget && piece && <div className="game__capture-ring" />}
                </div>
              );
            })
          )}

          {/* Flying piece overlay */}
          {flyingPiece && (
            <span className="game__piece game__piece--flying" style={flyingStyle}>
              <PieceSvg code={flyingPiece.piece} />
            </span>
          )}
        </div>
      </div>

      {/* Self + bottom */}
      <div className="game__bottom">
        <div className="game__player">
          <div className="game__player-info">
            <div className="game__avatar">
              {(self?.avatarUrl ?? user?.avatarUrl) ? (
                <img className="game__avatar-img" src={self?.avatarUrl ?? user?.avatarUrl} alt={selfName} />
              ) : (
                <div className="game__avatar-ph">{selfName[0]?.toUpperCase()}</div>
              )}
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

        {drawPendingFromOpponent && (
          <div className="game__draw-offer">
            <span className="game__draw-offer-text">½ Противник предлагает ничью</span>
            <div className="game__draw-offer-btns">
              <button
                className="game__draw-accept"
                onClick={() => { acceptDraw(); }}
              >
                Принять
              </button>
              <button
                className="game__draw-decline"
                onClick={() => setDrawDismissed(true)}
              >
                Отклонить
              </button>
            </div>
          </div>
        )}

        {!isGameOver && (
          <div className="game__actions">
            <button
              className="game__action-btn game__action-btn--draw"
              disabled={activeDrawOffer === user?.id}
              title={activeDrawOffer === user?.id ? 'Ожидание ответа...' : ''}
              onClick={() => { offerDraw(); }}
            >
              {activeDrawOffer === user?.id ? '½ Ожидание...' : '½ Ничья'}
            </button>
            <button className="game__action-btn game__action-btn--resign" onClick={() => {
              if (confirm('Сдаться?')) handleResign();
            }}>⚑ Сдаться</button>
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
