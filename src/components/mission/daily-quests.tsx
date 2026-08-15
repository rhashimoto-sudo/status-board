import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";
import { EXP_PENALTY, HP_PENALTY } from "@/lib/constants";
import { weekdayIndexInTimeZone } from "@/lib/datetime";
import type { DailyQuest } from "@/lib/types";

type DailyQuestsProps = {
  dailies: readonly DailyQuest[];
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// `new Date(iso).getDay()` はランタイムのローカルタイムゾーンに依存し、ローカル（JST）開発と
// Vercel の Node ランタイム（UTC）で曜日がずれるため使わない（レビュー指摘A）。
function weekdayLabel(iso: string): string {
  return `${WEEKDAY_LABELS[weekdayIndexInTimeZone(new Date(iso))]}曜日`;
}

/**
 * 本日のデイリー（09_dashboard_spec.md §3.3）。
 * 読み取り専用（C-21）: チェックボックス・ボタン・フォーム・onClick 等の操作系は一切置かない。
 * 達成/未達は ✓ / ・ のみで区別し、色では区別しない。
 */
export function DailyQuests({ dailies }: DailyQuestsProps) {
  const remaining = dailies.filter((daily) => !daily.done).length;
  const nextSelectableDay = dailies[0] ? weekdayLabel(dailies[0].lockedUntil) : null;

  return (
    <Panel
      heading={
        <>
          🗓 本日のデイリー <span aria-hidden="true">🔒</span>
        </>
      }
    >
      <ul className="space-y-2">
        {dailies.map((daily) => (
          <li key={daily.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span aria-hidden="true">{daily.done ? "✓" : "・"}</span>
            <span className="min-w-0 flex-1 break-words text-[color:var(--color-text-primary)]">
              {daily.title}
            </span>
            <span className="whitespace-nowrap text-[13px] text-[color:var(--color-text-secondary)]">
              {daily.main} +<StatValue>{daily.expectedExp}</StatValue>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-[color:var(--color-border-hairline)] pt-3 text-[13px] text-[color:var(--color-text-secondary)]">
        {remaining === 0 ? (
          <p>✓ 本日達成済み</p>
        ) : (
          <>
            <p>
              ⚠ あと <StatValue>{remaining}</StatValue> つでストリークが途切れます
            </p>
            <p>
              未達なら HP <StatValue>{HP_PENALTY.dailyMiss}</StatValue> / ⚔️EXECUTION{" "}
              <StatValue>{EXP_PENALTY.dailyMissExecution}</StatValue> / 🔥 → <StatValue>0</StatValue>
            </p>
          </>
        )}
      </div>

      {nextSelectableDay && (
        <p className="mt-3 text-[13px] text-[color:var(--color-text-secondary)]">
          🔒 週中はロック中。次に選び直せるのは {nextSelectableDay}
        </p>
      )}
    </Panel>
  );
}
