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

      <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.18em] text-[color:var(--color-text-secondary)]">
        {heading}
      </div>
      <div className="mt-2 panel-heading-divider" />
      <div className="mt-4">{children}</div>
    </div>
  );
}

type BracketPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function PanelBracket({ position }: { position: BracketPosition }) {
  const size = "w-4 h-4";
  const base = "pointer-events-none absolute border-[color:var(--color-border-bracket)]";

  const positionClasses: Record<BracketPosition, string> = {
    "top-left": "top-0 left-0 border-t-[1.5px] border-l-[1.5px]",
    "top-right": "top-0 right-0 border-t-[1.5px] border-r-[1.5px]",
    "bottom-left": "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]",
    "bottom-right": "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]",
  };

  return (
    <>
      <span className={`${base} ${size} ${positionClasses[position]}`} />
      {position === "top-left" && (
        <span className="pointer-events-none absolute top-0 left-4 h-px w-6 bg-gradient-to-r from-[color:var(--color-border-bracket)] to-transparent" />
      )}
      {position === "top-right" && (
        <span className="pointer-events-none absolute top-0 right-4 h-px w-6 bg-gradient-to-l from-[color:var(--color-border-bracket)] to-transparent" />
      )}
    </>
  );
}
