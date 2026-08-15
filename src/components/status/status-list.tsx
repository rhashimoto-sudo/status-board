import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { FOUNDATION_ORDER, STATUS_ORDER } from "@/lib/constants";
import { expToNextLevel, levelFromExp, levelProgress } from "@/lib/level";
import { titleFor } from "@/lib/titles";
import type { Status, StatusKey, StatusMap } from "@/lib/types";

type StatusListProps = {
  items: StatusMap;
  /** 「最も薄い軸」として強調するキー（lib/level.ts の weakestStatuses が算出）。 */
  weakKeys?: readonly StatusKey[];
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
export function StatusList({ items, weakKeys = [] }: StatusListProps) {
  return (
    <ul className="space-y-3.5">
      {STATUS_ORDER.map((key) => (
        <li key={key}>
          {key === FOUNDATION_START_KEY && (
            // 区切り線にラベルを付ける。線だけでは「なぜここで切れているか」が読み取れない。
            <div className="mb-3.5 mt-6 flex items-center gap-3">
              <span className="text-[11px] tracking-[0.18em] text-[color:var(--color-text-secondary)]">
                土台
              </span>
              <div
                role="separator"
                aria-label="専門ステータスと土台ステータスの区切り"
                className="flex-1 border-t border-[color:var(--color-border-hairline)]"
              />
            </div>
          )}
          <StatusRow statusKey={key} status={items[key]} weak={weakKeys.includes(key)} />
        </li>
      ))}
    </ul>
  );
}

function StatusRow({
  statusKey,
  status,
  weak,
}: {
  statusKey: StatusKey;
  status: Status;
  weak: boolean;
}) {
  const measured = status.measured;
  const level = measured ? levelFromExp(status.exp) : null;
  const title = level !== null ? titleFor(statusKey, level) : null;
  const remaining = level !== null ? expToNextLevel(status.exp) : null;
  const progress = level !== null ? levelProgress(status.exp) : 0;

  return (
    // 最も薄い軸には violet の縦罫を立てる（色を増やさずに弱点を拾えるようにする）。
    <div
      className={
        weak
          ? "border-l-2 border-[color:var(--color-accent-violet)] pl-2"
          : "border-l-2 border-transparent pl-2"
      }
    >
      <div className="grid grid-cols-[44px_1fr] items-center gap-x-3">
        {/* Lv を固定幅バッジに出して縦の整列軸を作る（44px はタッチターゲット最小値と一致）。 */}
        <div className="flex h-11 w-11 flex-col items-center justify-center rounded-[3px] border border-[color:var(--color-border-hairline)] bg-[color:var(--color-surface-raised)]">
          <span className="text-[9px] leading-none text-[color:var(--color-text-secondary)]">Lv</span>
          <StatValue className="text-[17px] leading-none text-[color:var(--color-text-primary)]">
            {level ?? "?"}
          </StatValue>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {/* 絵文字は OS 由来の多色。彩度を落として状態色（HP の緑/黄/赤）と競合させない。 */}
            <span aria-hidden="true" className="[filter:saturate(0.35)]">
              {STATUS_ICONS[statusKey]}
            </span>
            <span className="font-semibold text-[color:var(--color-text-primary)]">{statusKey}</span>
            <span className="text-[13px] text-[color:var(--color-text-secondary)]">
              {title ?? "???"}
            </span>
            {weak && (
              <span className="text-[11px] tracking-[0.08em] text-[color:var(--color-accent-violet)]">
                最も薄い
              </span>
            )}
          </div>

          {measured && (
            <div className="mt-1 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProgressBar
                  value={progress}
                  max={1}
                  colorToken="cyan"
                  label={`${statusKey} Lv${level} の次のLvまでの進捗`}
                />
              </div>
              <span className="whitespace-nowrap text-[12px] text-[color:var(--color-text-secondary)]">
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
      </div>
    </div>
  );
}
