import { useEffect, useRef } from 'react';

export default function AudioVisualizer({
  getAnalyser,
}: {
  getAnalyser: () => AnalyserNode | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    const W = canvas.width;
    const H = canvas.height;
    const draw = () => {
      g.clearRect(0, 0, W, H);
      g.strokeStyle = '#56C7F5';
      g.lineWidth = 2;
      g.beginPath();
      const analyser = getAnalyser();
      if (!analyser) {
        g.moveTo(0, H / 2);
        g.lineTo(W, H / 2);
      } else {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        const step = W / (data.length - 1);
        for (let i = 0; i < data.length; i++) {
          const x = i * step;
          const y = H - (data[i] / 255) * H;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
      }
      g.stroke();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw();
      return;
    }
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [getAnalyser]);

  return (
    <figure className="mt-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={72}
        className="h-[72px] w-full rounded border border-slate-800 bg-slate-900/40"
        role="img"
        aria-label="Live audio waveform. Decorative: it moves with the sound; all values appear as text."
      />
      <figcaption className="mt-1 font-mono text-sm text-slate-300">
        Live waveform — moves with the sound (decorative; values are in the
        text readouts)
      </figcaption>
    </figure>
  );
}
