import type { ReactNode } from "react";

type StatValueProps = {
  children: ReactNode;
  className?: string;
};

/**
 * 等幅フォント + tabular-nums の数値表示（意匠の Atom）。
 * Lv・EXP・HP・カウントダウン・発動回数・日数などの数値はすべてこれを通す。
 */
export function StatValue({ children, className }: StatValueProps) {
  return (
    <span className={`font-mono tabular-nums ${className ?? ""}`}>{children}</span>
  );
}
