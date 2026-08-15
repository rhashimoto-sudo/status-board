import type { Boss, GuerrillaQuest } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { Countdown } from "./countdown";

type UrgentBoardProps = {
  bosses: readonly Boss[];
  guerrillas: readonly GuerrillaQuest[];
};

type UrgentEntry =
  | { kind: "boss"; quest: Boss }
  | { kind: "guerrilla"; quest: GuerrillaQuest };

/**
 * 🚨緊急ボード（09_dashboard_spec.md §3.1 / 05_quest_design.md）。
 * ボス・ゲリラを deadline 昇順に並べ、`Countdown` へは ISO 文字列の deadline のみを渡す。
 * データを整形するだけなのでサーバーコンポーネントのままで良い（"use client" 不要）。
 */
export function UrgentBoard({ bosses, guerrillas }: UrgentBoardProps) {
  const entries: UrgentEntry[] = [
    ...bosses.map((quest): UrgentEntry => ({ kind: "boss", quest })),
    ...guerrillas.map((quest): UrgentEntry => ({ kind: "guerrilla", quest })),
  ].sort(
    (a, b) => new Date(a.quest.deadline).getTime() - new Date(b.quest.deadline).getTime()
  );

  return (
    <Panel heading="🚨 緊急ボード">
      {entries.length === 0 ? (
        <p className="text-[color:var(--color-text-secondary)]">
          現在、期限付きのボス・ゲリラはありません
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li
              key={entry.quest.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true">{entry.kind === "boss" ? "👹" : "⚡"}</span>
                <span className="truncate">{entry.quest.title}</span>
                <span className="text-[color:var(--color-text-secondary)]">
                  {entry.kind === "boss" ? "ボス" : `ゲリラ（${entry.quest.difficulty}）`}
                </span>
              </div>
              <Countdown deadline={entry.quest.deadline} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
