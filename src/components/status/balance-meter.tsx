import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";
import { BALANCE_GAP_THRESHOLD, BALANCE_MESSAGES } from "@/lib/constants";

type BalanceMeterProps = {
  learningLv: number;
  executionLv: number;
};

/** LEARNING と EXECUTION の Lv 差から診断文を選ぶ（09_dashboard_spec.md §2.5）。 */
function diagnose(learningLv: number, executionLv: number): string {
  const gap = learningLv - executionLv;
  if (gap >= BALANCE_GAP_THRESHOLD) return BALANCE_MESSAGES.learningHeavy;
  if (-gap >= BALANCE_GAP_THRESHOLD) return BALANCE_MESSAGES.executionHeavy;
  return BALANCE_MESSAGES.balanced;
}

/**
 * 歪みメーター（09_dashboard_spec.md §2.5）。
 * 🔥LEARNING と ⚔️EXECUTION の対比バー + 診断文を表示する。診断文は BALANCE_MESSAGES 経由でのみ出す。
 */
export function BalanceMeter({ learningLv, executionLv }: BalanceMeterProps) {
  const message = diagnose(learningLv, executionLv);
  const total = learningLv + executionLv;
  const learningRatio = total > 0 ? learningLv / total : 0.5;

  return (
    <Panel heading={<span>⚖️ 歪みメーター</span>}>
      <div className="flex items-center justify-between text-[14px] text-[color:var(--color-text-primary)]">
        <span>
          🔥 LEARNING Lv <StatValue>{learningLv}</StatValue>
        </span>
        <span>
          Lv <StatValue>{executionLv}</StatValue> ⚔️ EXECUTION
        </span>
      </div>

      <div
        role="img"
        aria-label={`LEARNING Lv${learningLv} と EXECUTION Lv${executionLv} の対比`}
        className="mt-2 flex h-2 w-full overflow-hidden rounded-[4px] bg-[color:var(--color-surface-raised)]"
      >
        <div
          className="h-full"
          style={{ width: `${learningRatio * 100}%`, backgroundColor: "var(--color-accent-violet)" }}
        />
        <div
          className="h-full"
          style={{ width: `${(1 - learningRatio) * 100}%`, backgroundColor: "var(--color-accent-cyan)" }}
        />
      </div>

      <p className="mt-3 text-[14px] text-[color:var(--color-text-secondary)]">{message}</p>
    </Panel>
  );
}
