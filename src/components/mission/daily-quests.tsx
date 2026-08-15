import { Panel } from "@/components/ui/panel";
import { DailyChecklist } from "@/components/mission/daily-checklist";
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

// `lockedUntil` を過ぎていれば表示しない（レビュー指摘E）。5件が同じ値を持つ前提を置かず、
// 複数の `lockedUntil` が異なりうる場合は最大値（＝最も遅く解除される日時）を使う。
function nextSelectableLabel(dailies: readonly DailyQuest[], nowMs: number): string | null {
  if (dailies.length === 0) return null;
  const latestLockedUntil = dailies.reduce(
    (latest, daily) => (daily.lockedUntil > latest ? daily.lockedUntil : latest),
    dailies[0].lockedUntil,
  );
  if (new Date(latestLockedUntil).getTime() <= nowMs) return null;
  return weekdayLabel(latestLockedUntil);
}

/**
 * 本日のデイリー（09_dashboard_spec.md §3.3）。
 *
 * このコンポーネントは**サーバー側で外枠と固定の注記だけ**を描く。チェック状態を持つ
 * 一覧は `DailyChecklist`（クライアント）に委ねる。ページ本体（レーダー・90日履歴）の
 * 静的生成を維持したまま、**変わる5件だけ**をクライアントで扱うための分割。
 *
 * 書き込みはデイリーのチェックに限る（C-21'）。押しても HP・ストリーク・EXP は変わらない
 * （未達判定は日次ジョブ 03:00 JST の責務）。
 */
export function DailyQuests({ dailies }: DailyQuestsProps) {
  const nextSelectableDay = nextSelectableLabel(dailies, Date.now());

  return (
    <Panel
      heading={
        <>
          🗓 本日のデイリー <span aria-hidden="true">🔒</span>
        </>
      }
    >
      <DailyChecklist initial={dailies} />

      {/* 探索枠の完了条件が他の4個と違うことを明記する（成果を出せなかった、と誤認させない）。 */}
      {dailies.some((daily) => daily.exploration) && (
        <p className="mt-3 text-[13px] text-[color:var(--color-accent-violet)]">
          探索枠は「触れたこと」で完了。成果は問いません
        </p>
      )}

      {nextSelectableDay && (
        <p className="mt-3 text-[13px] text-[color:var(--color-text-secondary)]">
          🔒 週中はロック中。次に選び直せるのは {nextSelectableDay}
        </p>
      )}
    </Panel>
  );
}
