import { DEBUFF_LABELS, DEBUFF_MULTIPLIERS } from "@/lib/constants";
import { totalLevelProgress } from "@/lib/level";
import { strongestDebuff } from "@/lib/penalty";
import type { Debuff, HpState, Phase } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { HpBar } from "@/components/status/hp-bar";

type HeroHeaderProps = {
  /** 全軸の測定が完了するまで null（未測定）。docs/03_status_system.md:189,193-194。 */
  totalLevel: number | null;
  totalTitle: string | null;
  hpState: HpState;
  debuffs: readonly Debuff[];
  streak: number;
  phase: Phase;
};

/**
 * ヒーローヘッダー（09_dashboard_spec.md §2.1）。
 * TOTAL Lv / 総合称号 / 次Lvまでの EXPバー / 🔥ストリーク / ♥HPバー / 🔻デバフ を描画する。
 */
export function HeroHeader({ totalLevel, totalTitle, hpState, debuffs, streak, phase }: HeroHeaderProps) {
  const strongest = strongestDebuff(debuffs);
  const showDebuffs = phase !== "calibration" && debuffs.length > 0;

  return (
    <Panel heading="TOTAL STATUS">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[color:var(--color-text-secondary)]">TOTAL Lv</span>
          <StatValue className="text-[48px] leading-none text-[color:var(--color-text-primary)]">
            {totalLevel === null ? "???" : totalLevel.toFixed(1)}
          </StatValue>
          <span className="text-[color:var(--color-text-primary)]">{totalTitle ?? "???"}</span>
        </div>

        {totalLevel !== null && (
          <div className="flex items-center gap-2">
            <ProgressBar
              value={totalLevelProgress(totalLevel) * 100}
              max={100}
              colorToken="cyan"
              label="次のLvまでの進捗"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span aria-hidden="true">🔥</span>
          <StatValue
            className={streak === 0 ? "text-[color:var(--color-text-muted)]" : undefined}
          >
            {streak}日
          </StatValue>
          {streak === 0 && phase !== "calibration" && (
            <span className="text-[color:var(--color-text-muted)]">途切れています</span>
          )}
        </div>

        <HpBar hp={hpState.current} zone={hpState.zone} phase={phase} />

        {showDebuffs && (
          <div className="flex flex-col gap-1">
            {debuffs.map((debuff, index) => {
              // GameState.debuffs に kind の一意性は保証されないため、表示上は
              // 配列内の同一オブジェクト（=== 比較）でハイライト対象を特定する（C-2）。
              const isStrongest = strongest === debuff;
              return (
                <div
                  key={`${debuff.kind}-${index}`}
                  className="flex items-center gap-2 text-[color:var(--color-debuff)]"
                >
                  <span aria-hidden="true">🔻</span>
                  <span>{DEBUFF_LABELS[debuff.kind]}</span>
                  <span className="text-[color:var(--color-text-secondary)]">
                    (残り<StatValue>{debuff.remainingDays}</StatValue>日)
                  </span>
                  <StatValue>×{DEBUFF_MULTIPLIERS[debuff.kind]}</StatValue>
                  {isStrongest && (
                    <span className="text-[color:var(--color-text-secondary)]">
                      （計算に適用中）
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
