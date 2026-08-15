import { DEBUFF_LABELS, DEBUFF_MULTIPLIERS } from "@/lib/constants";
import { totalLevelProgress } from "@/lib/level";
import { strongestDebuff } from "@/lib/penalty";
import type { Debuff, HpState, Phase } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { HpBar } from "@/components/status/hp-bar";

export type WeakAxis = { key: string; level: number; icon: string };

type HeroHeaderProps = {
  /** 全軸の測定が完了するまで null（未測定）。docs/03_status_system.md:189,193-194。 */
  totalLevel: number | null;
  totalTitle: string | null;
  hpState: HpState;
  debuffs: readonly Debuff[];
  streak: number;
  phase: Phase;
  /** 最も Lv が低い軸（弱点の可視化）。未測定などで判定できないときは空配列。 */
  weakAxes?: readonly WeakAxis[];
};

/**
 * ヒーローヘッダー（09_dashboard_spec.md §2.1）。
 * TOTAL Lv / 総合称号 / 次Lvまでの EXPバー / 🔥ストリーク / ♥HPバー / 🔻デバフ を描画する。
 */
export function HeroHeader({
  totalLevel,
  totalTitle,
  hpState,
  debuffs,
  streak,
  phase,
  weakAxes = [],
}: HeroHeaderProps) {
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
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <ProgressBar
                value={totalLevelProgress(totalLevel) * 100}
                max={100}
                colorToken="cyan"
                label="次のLvまでの進捗"
              />
            </div>
            {/*
              バーが何を表しているかを明示する（09_dashboard_spec.md §2.1 の「次のLvまで」）。
              TOTAL Lv は9軸の加重平均であって単一の累積EXPを持たないため、
              仕様の ASCII 例にある "461 EXP" のような EXP 残量は表示できない。
              小数部の残り（次の整数 Lv までの距離）を等幅で出す。
            */}
            <span className="whitespace-nowrap text-[12px] text-[color:var(--color-text-secondary)]">
              次の Lv まで{" "}
              <StatValue>{(1 - totalLevelProgress(totalLevel)).toFixed(1)}</StatValue>
            </span>
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

        {/*
          最も薄い軸を1行で出す（CLAUDE.md「弱い領域が得意領域の陰に隠れて放置される」への対処）。
          一覧の該当行にも同じ violet の縦罫が立つので、ここで名前を見てから一覧で場所が分かる。
        */}
        {weakAxes.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
            <span className="text-[color:var(--color-text-secondary)]">最も薄い軸</span>
            {weakAxes.map((axis) => (
              <span key={axis.key} className="text-[color:var(--color-accent-violet)]">
                <span aria-hidden="true" className="[filter:saturate(0.35)]">
                  {axis.icon}
                </span>{" "}
                {axis.key} Lv <StatValue>{axis.level}</StatValue>
              </span>
            ))}
          </div>
        )}

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
