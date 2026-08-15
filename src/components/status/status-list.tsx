import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { FOUNDATION_ORDER, STATUS_ORDER } from "@/lib/constants";
import { expToNextLevel, levelFromExp, levelProgress } from "@/lib/level";
import { titleFor } from "@/lib/titles";
import type { Status, StatusKey, StatusMap } from "@/lib/types";

type StatusListProps = {
  items: StatusMap;
};

// 絵文字はレーダー・一覧共通の意匠（03_status_system.md §1）。key はテキストで併記するため aria-hidden にする。
const STATUS_ICONS: Readonly<Record<StatusKey, string>> = {
  INT: "🧠",
  TECH: "💻",
  DATA: "📊",
  MARKETING: "📣",
  PM: "👑",
  BRIDGE: "🤝",
  ENGLISH: "🌎",
  LEARNING: "🔥",
  EXECUTION: "⚔️",
};

const FOUNDATION_START_KEY = FOUNDATION_ORDER[0];

/**
 * ステータス一覧（03_status_system.md §5）。
 * STATUS_ORDER 順に9件を並べ、土台2つの前に区切り線を入れる。
 */
export function StatusList({ items }: StatusListProps) {
  return (
    <ul className="space-y-4">
      {STATUS_ORDER.map((key) => (
        <li key={key}>
          {key === FOUNDATION_START_KEY && (
            <div
              role="separator"
              aria-label="専門ステータスと土台ステータスの区切り"
              className="mb-4 border-t border-[color:var(--color-border-hairline)]"
            />
          )}
          <StatusRow statusKey={key} status={items[key]} />
        </li>
      ))}
    </ul>
  );
}

function StatusRow({ statusKey, status }: { statusKey: StatusKey; status: Status }) {
  const measured = status.measured;
  const level = measured ? levelFromExp(status.exp) : null;
  const title = level !== null ? titleFor(statusKey, level) : null;
  const remaining = level !== null ? expToNextLevel(status.exp) : null;
  const progress = level !== null ? levelProgress(status.exp) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span aria-hidden="true">{STATUS_ICONS[statusKey]}</span>
        <span className="font-semibold text-[color:var(--color-text-primary)]">{statusKey}</span>
        <span className="text-[13px] text-[color:var(--color-text-secondary)]">
          Lv <StatValue>{level ?? "???"}</StatValue>
        </span>
        <span className="text-[14px] text-[color:var(--color-text-secondary)]">{title ?? "???"}</span>
      </div>

      {measured && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <ProgressBar
              value={progress}
              max={1}
              colorToken="cyan"
              label={`${statusKey} Lv${level} の次のLvまでの進捗`}
            />
          </div>
          <span className="whitespace-nowrap text-[13px] text-[color:var(--color-text-secondary)]">
            {remaining === null ? (
              <StatValue>MAX</StatValue>
            ) : (
              <>
                次まで <StatValue>{remaining}</StatValue> EXP
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
