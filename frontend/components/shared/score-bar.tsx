"use client";

interface ScoreBarProps {
  score: number;         // 0.0–1.0
  barClassName?: string; // overrides bar width, default "w-20"
}

export function ScoreBar({ score, barClassName = "w-20" }: ScoreBarProps) {
  const color = score >= 0.8 ? "#00FF88" : score >= 0.5 ? "#FFB800" : "#FF4455";
  return (
    <div className="flex items-center gap-2">
      <div className={`${barClassName} h-1.5 rounded-full bg-white/8 overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums" style={{ color }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}
