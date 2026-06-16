import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { puzzlesApi } from '../../api/rest';
import './PuzzlePage.css';

export const PuzzlePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [solution, setSolution] = useState<string[] | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [moveIndex, setMoveIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState<string | null>(null);

  const { data: puzzle } = useQuery({
    queryKey: ['puzzle', id],
    queryFn: () => puzzlesApi.list().then((r: any) => {
      const list = Array.isArray(r) ? r : r[0] ?? [];
      return list.find((p: any) => p.id === id);
    }),
    enabled: !!id,
  });

  const fen = currentFen ?? puzzle?.fen ?? 'start';

  const onDrop = async (source: string, target: string) => {
    if (!puzzle || solution) return false;
    const uci = source + target;

    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    const legal = legalMoves.find((m) => m.from === source && m.to === target);
    if (!legal) return false;

    const expectedMove = puzzle.solutionMoves[moveIndex];
    const isMatch = uci === expectedMove || legal.san === expectedMove;

    if (isMatch) {
      chess.move(legal.san);
      setCurrentFen(chess.fen());
      setMoveIndex((i) => i + 1);

      if (moveIndex + 1 === puzzle.solutionMoves.length) {
        const result = await puzzlesApi.attempt(puzzle.id, puzzle.solutionMoves);
        setFeedback('correct');
        if (result.solution) setSolution(result.solution);
      }
    } else {
      const result = await puzzlesApi.attempt(puzzle.id, [uci]);
      setFeedback('wrong');
      if (result.solution) {
        setSolution(result.solution);
        setExplanation(result.explanation ?? null);
      }
      setAttemptsLeft(result.attemptsLeft ?? 0);
    }
    return false;
  };

  const handleShowSolution = async () => {
    if (!puzzle) return;
    const result = await puzzlesApi.solution(puzzle.id);
    setSolution(result.solution);
    setExplanation(result.explanation ?? null);
  };

  if (!puzzle) return <div className="puzzle-page puzzle-page--loading"><div className="puzzle-page__spinner" /></div>;

  return (
    <div className="puzzle-page">
      <div className="puzzle-page__header">
        <button className="puzzle-page__back" onClick={() => navigate('/train')}>← Назад</button>
        <div className="puzzle-page__title">{puzzle.title}</div>
        <span className={`puzzle-page__diff puzzle-page__diff--${puzzle.difficulty}`}>
          {puzzle.difficulty}
        </span>
      </div>

      <div className="puzzle-page__board">
        <Chessboard
          position={fen}
          onPieceDrop={onDrop}
          arePiecesDraggable={!solution && !feedback}
        />
      </div>

      <div className="puzzle-page__attempts">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className={`puzzle-page__attempt-dot ${i < (3 - attemptsLeft) ? 'used' : ''}`}
          />
        ))}
      </div>

      {feedback === 'correct' && (
        <div className="puzzle-page__feedback puzzle-page__feedback--correct">
          Отлично! Правильно!
          <button className="puzzle-page__next-btn" onClick={() => navigate('/train')}>
            Следующая задача
          </button>
        </div>
      )}

      {feedback === 'wrong' && attemptsLeft > 0 && (
        <div className="puzzle-page__feedback puzzle-page__feedback--wrong">
          Подумай ещё. Попыток: {attemptsLeft}
          <button
            className="puzzle-page__retry-btn"
            onClick={() => {
              setFeedback(null);
              setCurrentFen(puzzle.fen);
              setMoveIndex(0);
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}

      {solution && (
        <div className="puzzle-page__solution">
          <div className="puzzle-page__solution-title">Решение:</div>
          <div className="puzzle-page__solution-moves">
            {solution.join(', ')}
          </div>
          {explanation && (
            <div className="puzzle-page__explanation">{explanation}</div>
          )}
        </div>
      )}

      {!solution && (
        <button className="puzzle-page__hint-btn" onClick={handleShowSolution}>
          Показать решение
        </button>
      )}
    </div>
  );
};
