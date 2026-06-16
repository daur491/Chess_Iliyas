import { useEffect, useState } from 'react';
import './CountdownTimer.css';

interface Props {
  initialMs: number;
  active: boolean;
  onTimeout?: () => void;
}

const formatMs = (ms: number): string => {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const CountdownTimer = ({ initialMs, active, onTimeout }: Props) => {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    setMs(initialMs);
  }, [initialMs]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setMs((prev) => {
        if (prev <= 100) {
          clearInterval(interval);
          onTimeout?.();
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [active, onTimeout]);

  const isLow = ms < 10000;

  return (
    <div className={`timer${active ? ' timer--active' : ''}${isLow ? ' timer--low' : ''}`}>
      {formatMs(ms)}
    </div>
  );
};
