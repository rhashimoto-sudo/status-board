export type ProgressBarColorToken =
  | "cyan"
  | "violet"
  | "hp-safe"
  | "hp-warn"
  | "hp-danger";

type ProgressBarProps = {
  value: number;
  max: number;
  colorToken: ProgressBarColorToken;
  label: string;
};

const COLOR_VAR: Record<ProgressBarColorToken, string> = {
  cyan: "var(--color-accent-cyan)",
  violet: "var(--color-accent-violet)",
  "hp-safe": "var(--color-hp-safe)",
  "hp-warn": "var(--color-hp-warn)",
  "hp-danger": "var(--color-hp-danger)",
};

/**
 * 汎用バー（意匠の Atom）。データを一切 import しない。
 * 色判定ロジック（HP色域など）は呼び出し側が算出し colorToken として渡す。
 */
export function ProgressBar({ value, max, colorToken, label }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-[4px] bg-[color:var(--color-surface-raised)]"
    >
      <div
        className="h-full rounded-[4px] transition-[width] duration-200 ease-out"
        style={{ width: `${ratio * 100}%`, backgroundColor: COLOR_VAR[colorToken] }}
      />
    </div>
  );
}
