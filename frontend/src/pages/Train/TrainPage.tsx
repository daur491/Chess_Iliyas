import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { puzzlesApi } from '../../api/rest';
import type { PuzzleCategory, PuzzleDifficulty } from '../../types';
import './TrainPage.css';

const CATEGORIES: { value: PuzzleCategory | ''; label: string }[] = [
  { value: '', label: 'Все' },
  { value: 'mate_in_1', label: 'Мат в 1' },
  { value: 'mate_in_2', label: 'Мат в 2' },
  { value: 'fork', label: 'Вилка' },
  { value: 'pin', label: 'Связка' },
  { value: 'double_attack', label: 'Двойной удар' },
  { value: 'deflection', label: 'Отвлечение' },
  { value: 'endgame', label: 'Эндшпиль' },
  { value: 'tactics', label: 'Тактика' },
];

const LESSONS = [
  'Как ходят фигуры',
  'Шах',
  'Мат',
  'Пат',
  'Рокировка',
  'Взятие на проходе',
  'Тактика',
  'Дебют',
  'Миттельшпиль',
  'Эндшпиль',
];

type Tab = 'puzzles' | 'learn';

export const TrainPage = () => {
  const [tab, setTab] = useState<Tab>('puzzles');
  const [category, setCategory] = useState<PuzzleCategory | ''>('');
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty | ''>('');

  const { data } = useQuery({
    queryKey: ['puzzles', category, difficulty],
    queryFn: () =>
      puzzlesApi.list({
        category: category || undefined,
        difficulty: difficulty || undefined,
      }),
    enabled: tab === 'puzzles',
  });

  const puzzles = Array.isArray(data) ? data : data?.[0] ?? [];

  return (
    <div className="train">
      <div className="train__tabs">
        <button
          className={`train__tab${tab === 'puzzles' ? ' active' : ''}`}
          onClick={() => setTab('puzzles')}
        >
          Задачи
        </button>
        <button
          className={`train__tab${tab === 'learn' ? ' active' : ''}`}
          onClick={() => setTab('learn')}
        >
          Обучение
        </button>
      </div>

      {tab === 'puzzles' && (
        <>
          <div className="train__filters">
            <div className="train__filter-scroll">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  className={`train__filter-btn${category === c.value ? ' active' : ''}`}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="train__diff-row">
              {(['', 'easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  className={`train__diff-btn${difficulty === d ? ' active' : ''} ${d ? `train__diff-btn--${d}` : ''}`}
                  onClick={() => setDifficulty(d as any)}
                >
                  {d === '' ? 'Все' : d === 'easy' ? 'Лёгкий' : d === 'medium' ? 'Средний' : 'Сложный'}
                </button>
              ))}
            </div>
          </div>

          <div className="train__puzzle-list">
            {puzzles.map((puzzle: any) => (
              <Link
                key={puzzle.id}
                to={`/train/puzzle/${puzzle.id}`}
                className="train__puzzle-card"
              >
                <div className="train__puzzle-left">
                  <span className="train__puzzle-title">{puzzle.title}</span>
                  <span className="train__puzzle-cat">{puzzle.category}</span>
                </div>
                <span className={`train__puzzle-diff train__puzzle-diff--${puzzle.difficulty}`}>
                  {puzzle.difficulty}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {tab === 'learn' && (
        <div className="train__lessons">
          {LESSONS.map((lesson, i) => (
            <div key={i} className="train__lesson-card">
              <span className="train__lesson-num">{i + 1}</span>
              <span className="train__lesson-title">{lesson}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
