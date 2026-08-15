import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { missionRecoveryAmount } from "@/lib/penalty";
import type { Mission } from "@/lib/types";

type MissionListProps = {
  missions: readonly Mission[];
};

/**
 * 進行中ミッション一覧（09_dashboard_spec.md §3.2）。
 * 進捗の分母は「完了した子クエスト数 / 全子クエスト数」（05_quest_design.md §4）。
 * バーとテキストで必ず同じ分母（completed / total）を使う。
 */
export function MissionList({ missions }: MissionListProps) {
  return (
    <Panel heading="📜 進行中ミッション">
      <ul className="space-y-6">
        {missions.map((mission) => (
          <MissionRow key={mission.id} mission={mission} />
        ))}
      </ul>
    </Panel>
  );
}

function MissionRow({ mission }: { mission: Mission }) {
  const total = mission.children.length;
  const completed = mission.children.filter((child) => child.done).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <li className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span aria-hidden="true">📜</span>
        <span className="min-w-0 break-words font-semibold text-[color:var(--color-text-primary)]">
          {mission.title}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <ProgressBar
            value={completed}
            max={total}
            colorToken="cyan"
            label={`${mission.title} の子クエスト進捗`}
          />
        </div>
        <span className="whitespace-nowrap text-[13px] text-[color:var(--color-text-secondary)]">
          <StatValue>{completed}</StatValue>/<StatValue>{total}</StatValue> (
          <StatValue>{percent}</StatValue>%)
        </span>
      </div>

      <ul className="mt-2 space-y-1 text-[13px] text-[color:var(--color-text-secondary)]">
        {mission.children.map((child) => (
          <li key={child.id} className="flex min-w-0 items-baseline gap-2">
            <span aria-hidden="true">{child.done ? "✓" : "・"}</span>
            <span className="min-w-0 break-words">{child.title}</span>
          </li>
        ))}
      </ul>

      {/*
        完遂報酬を明示する（00_profile.md §6.1）。報酬が見えなければ「取り返す手」として機能しない。
        難易度で回復量が変わるため、難易度もここで出す（なぜこの量なのかが分からないと納得できない）。
        減点は併記しない。減点だけを単独で出さないのと同様、報酬の隣に脅しを置かない。
      */}
      <p className="mt-3 text-[13px] text-[color:var(--color-text-secondary)]">
        完遂報酬{" "}
        <span className="text-[color:var(--color-hp-safe)]">
          ♥HP +<StatValue>{missionRecoveryAmount(mission.difficulty)}</StatValue>
        </span>{" "}
        <span className="text-[color:var(--color-text-muted)]">（{mission.difficulty}）</span>
      </p>
    </li>
  );
}
