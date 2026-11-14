import { useMemo } from 'react';
import { mulberry32 } from '../utils/random';

interface Star {
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: string;
  delay: string;
}

function makeStars(seed: number, count: number): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: `${(rand() * 100).toFixed(2)}%`,
    top: `${(rand() * 100).toFixed(2)}%`,
    size: rand() > 0.85 ? 2 : 1,
    opacity: 0.25 + rand() * 0.55,
    duration: `${(3 + rand() * 3).toFixed(2)}s`,
    delay: `${(rand() * 4).toFixed(2)}s`,
  }));
}

export default function Starfield() {
  const dim = useMemo(() => makeStars(42, 110), []);
  const bright = useMemo(() => makeStars(7, 26), []);
  return (
    <div
      aria-hidden="true"
      data-testid="starfield"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {dim.map((s, i) => (
        <span
          key={`d${i}`}
          className="absolute rounded-full bg-cloud"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
          }}
        />
      ))}
      {bright.map((s, i) => (
        <span
          key={`b${i}`}
          className="ts-star-twinkle absolute rounded-full bg-cloud"
          style={{
            left: s.left,
            top: s.top,
            width: s.size + 1,
            height: s.size + 1,
            opacity: s.opacity,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
