import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";
import { BALANCE_GAP_THRESHOLD, BALANCE_MESSAGES, BALANCE_TREND_MESSAGES } from "@/lib/constants";

type BalanceMeterProps = {
  learningLv: number;
  executionLv: number;
  /** 3ヶ月前の乖離（LEARNING Lv − EXECUTION Lv）。無いときは趨勢を出さない。 */
  gapThreeMonthsAgo?: number | null;
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
export function BalanceMeter({ learningLv, executionLv, gapThreeMonthsAgo = null }: BalanceMeterProps) {
  const message = diagnose(learningLv, executionLv);
  const total = learningLv + executionLv;
  const learningRatio = total > 0 ? learningLv / total : 0.5;
  const gap = learningLv - executionLv;
  // 「今 +1」だけでは縮まっているのか広がっているのか判断できない。3ヶ月前と比べて趨勢を出す。
  const trend =
    gapThreeMonthsAgo === null
      ? null
      : Math.abs(gap) === Math.abs(gapThreeMonthsAgo)
        ? BALANCE_TREND_MESSAGES.flat
        : Math.abs(gap) < Math.abs(gapThreeMonthsAgo)
          ? BALANCE_TREND_MESSAGES.narrowing
          : BALANCE_TREND_MESSAGES.widening;

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

      {/*
        均衡点（50%）の基準線を重ねる。線が無いと 57:43 のような偏りが「ほぼ半々」に見え、
        歪んでいること自体が伝わらない（09_dashboard_spec.md §2.5 の主旨）。
      */}
      <div className="relative mt-2">
        <div
          role="img"
          aria-label={`LEARNING Lv${learningLv} と EXECUTION Lv${executionLv} の対比。乖離 ${gap === 0 ? "なし" : `${Math.abs(gap)}`}`}
          className="flex h-3 w-full overflow-hidden rounded-[4px] bg-[color:var(--color-surface-raised)]"
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
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[color:var(--color-text-primary)] opacity-40"
        />
      </div>

      <div className="mt-2 flex items-baseline gap-2 text-[12px] text-[color:var(--color-text-secondary)]">
        <span>乖離</span>
        <StatValue className="text-[color:var(--color-text-primary)]">
          {gap === 0 ? "0" : `${gap > 0 ? "+" : "-"}${Math.abs(gap)}`}
        </StatValue>
        {/*
          方向ラベルは BALANCE_GAP_THRESHOLD を超えたときだけ出す。
          閾値未満で「学習過多」と書くと、直下の診断文（BALANCE_MESSAGES.balanced =
          「バランスが取れています」）と矛盾する。
        */}
        <span>
          {Math.abs(gap) < BALANCE_GAP_THRESHOLD
            ? "（均衡圏内）"
            : gap > 0
              ? "（学習過多）"
              : "（実行過多）"}
        </span>
        {trend !== null && (
          <span className="text-[color:var(--color-text-muted)]">
            3ヶ月前 {gapThreeMonthsAgo === 0 ? "0" : `${gapThreeMonthsAgo! > 0 ? "+" : "-"}${Math.abs(gapThreeMonthsAgo!)}`} → {trend}
          </span>
        )}
      </div>

      <p className="mt-3 text-[14px] text-[color:var(--color-text-secondary)]">{message}</p>
    </Panel>
  );
}
