import type { ReactNode } from "react";

type PanelProps = {
  heading: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * システムウィンドウ枠（意匠の Atom）。
 * データを一切 import しない。見出し・中身は props でのみ受け取る。
 */
export function Panel({ heading, children, className }: PanelProps) {
  return (
    <div
      className={`panel-surface relative rounded p-4 md:p-6 ${className ?? ""}`}
    >
      <PanelBracket position="top-left" />
      <PanelBracket position="top-right" />
      <PanelBracket position="bottom-left" />
      <PanelBracket position="bottom-right" />

      <div className="text-[18px] font-semibold leading-[1.3] text-[color:var(--color-text-primary)]">
        {heading}
      </div>
      <div className="mt-2 border-t border-[color:var(--color-border-hairline)]" />
      <div className="mt-4">{children}</div>
    </div>
  );
}

type BracketPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function PanelBracket({ position }: { position: BracketPosition }) {
  const size = "w-3 h-3";
  const base = "pointer-events-none absolute border-[color:var(--color-border-bracket)]";

  const positionClasses: Record<BracketPosition, string> = {
    "top-left": "top-0 left-0 border-t-2 border-l-2",
    "top-right": "top-0 right-0 border-t-2 border-r-2",
    "bottom-left": "bottom-0 left-0 border-b-2 border-l-2",
    "bottom-right": "bottom-0 right-0 border-b-2 border-r-2",
  };

  return <span className={`${base} ${size} ${positionClasses[position]}`} />;
}
