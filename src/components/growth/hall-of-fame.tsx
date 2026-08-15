import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";
import { STATUS_ORDER } from "@/lib/constants";
import type { HallOfFame, HallOfFameEntry } from "@/lib/types";

type HallOfFamePanelProps = {
  hallOfFame: HallOfFame;
};

/**
 * 殿堂パネル（09_dashboard_spec.md §4.4 / 06_penalty.md §5）。
 * 0件（1周目・生存中）は「記録なし」+ 現在の generation を表示する。
 * 1件以上は HallOfFameEntry を追記順（generation 昇順）に一覧表示する。
 *
 * 注意（司令塔確定・Step 3 送り）: `gameOver()` は現状 `titles` / `defeatedBosses` /
 * `survivedDays` の元データを `GameState` に持たないため、実データでは空配列・0のまま
 * になる。この制約は直さず、空・0でも破綻しない表示のみを行う。
 */
export function HallOfFamePanel({ hallOfFame }: HallOfFamePanelProps) {
  return (
    <Panel heading={<span>🏛 殿堂</span>}>
      {hallOfFame.entries.length === 0 ? (
        <div>
          <p className="text-[14px] text-[color:var(--color-text-secondary)]">記録なし</p>
          <p className="mt-1 text-[13px] text-[color:var(--color-text-secondary)]">
            <StatValue>generation {hallOfFame.generation}</StatValue> — 生存中
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {hallOfFame.entries.map((entry) => (
            <HallOfFameRow key={entry.generation} entry={entry} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function HallOfFameRow({ entry }: { entry: HallOfFameEntry }) {
  return (
    <li className="min-w-0 border-l-2 border-[color:var(--color-accent-violet)] pl-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2">
        <span className="font-semibold text-[color:var(--color-text-primary)]">
          <StatValue>generation {entry.generation}</StatValue>
        </span>
        <span className="whitespace-nowrap text-[13px] text-[color:var(--color-text-secondary)]">
          終焉日 {entry.endedAt}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-3 gap-y-1 text-[13px] sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <Stat label="最高到達 TOTAL Lv" value={<StatValue>{entry.maxTotalLevel.toFixed(1)}</StatValue>} />
        <Stat label="最長ストリーク" value={<><StatValue>{entry.longestStreak}</StatValue>日</>} />
        <Stat label="生存日数" value={<><StatValue>{entry.survivedDays}</StatValue>日</>} />
      </div>

      <div className="mt-2 text-[13px]">
        <div className="text-[color:var(--color-text-secondary)]">称号</div>
        <div className="break-words text-[color:var(--color-text-primary)]">
          {entry.titles.length > 0 ? entry.titles.join(" / ") : "記録なし"}
        </div>
      </div>

      <div className="mt-2 text-[13px]">
        <div className="text-[color:var(--color-text-secondary)]">討伐ボス</div>
        {entry.defeatedBosses.length > 0 ? (
          <ul className="space-y-0.5">
            {entry.defeatedBosses.map((boss) => (
              <li key={`${boss.name}-${boss.date}`} className="break-words text-[color:var(--color-text-primary)]">
                {boss.name}（{boss.date}）
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-[color:var(--color-text-primary)]">記録なし</div>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 gap-y-1 text-[13px]">
        {STATUS_ORDER.map((key) => (
          <span key={key} className="min-w-0 text-[color:var(--color-text-secondary)]">
            {key} Lv <StatValue>{entry.maxLevels[key]}</StatValue>
          </span>
        ))}
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[color:var(--color-text-secondary)]">{label}</div>
      <div className="text-[color:var(--color-text-primary)]">{value}</div>
    </div>
  );
}
