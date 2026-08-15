"use client";

import { StatValue } from "@/components/ui/stat-value";

const LOCKED_LABEL = "覚醒後に解放";
const SKILL_NAME = "《構造化》";
// 背景の紫グロー不透明度の上限。1.0 まで許すと高Lvで背景がほぼ #8b5cf6 単色になり、
// シアン Lv ラベル（約4.4:1）・《構造化》ラベルの WCAG AA（4.5:1）を割り込む。
// 0.5 なら --color-surface とのミックス背景に対してどちらも 4.5:1 を上回る（B-2）。
const MAX_GLOW_OPACITY = 0.5;

type SkillEmblemProps = {
  /**
   * 固有スキル《構造化》の Skill Lv（1〜10）。
   * calibration 中で未覚醒の場合は null を渡す（暗い未解放状態 + 「覚醒後に解放」表示）。
   */
  skillLevel: number | null;
};

/**
 * レーダー中心に重ねる《構造化》の紋章。
 * Skill Lv に応じて輝度を段階的に上げる（シアン×バイオレットの範囲内）。
 */
export function SkillEmblem({ skillLevel }: SkillEmblemProps) {
  const locked = skillLevel === null;
  // 輝度段階: Lv1=最も暗い 〜 Lv10=最も明るい。シアン×バイオレットの2色以外は使わない。
  // MAX_GLOW_OPACITY で頭打ちにし、高Lvでもラベルのコントラストを AA 以上に保つ（B-2）。
  const glowOpacity = locked
    ? 0
    : Math.min(MAX_GLOW_OPACITY, 0.15 + 0.85 * ((skillLevel - 1) / 9));

  return (
    <div
      role="img"
      aria-label={
        locked ? `${SKILL_NAME}: ${LOCKED_LABEL}` : `${SKILL_NAME} Lv ${skillLevel}`
      }
      className="flex h-16 w-16 flex-col items-center justify-center rounded-full border text-center"
      style={{
        borderColor: locked
          ? "var(--color-border-hairline)"
          : "var(--color-accent-cyan)",
        backgroundColor: locked
          ? "var(--color-surface)"
          : `color-mix(in srgb, var(--color-accent-violet) ${Math.round(glowOpacity * 100)}%, var(--color-surface))`,
      }}
    >
      <span
        className="text-[11px] leading-tight"
        style={{
          color: locked
            ? "var(--color-text-muted)"
            : "var(--color-text-primary)",
        }}
      >
        {SKILL_NAME}
      </span>
      {locked ? (
        <span className="text-[9px] leading-tight text-[color:var(--color-text-muted)]">
          {LOCKED_LABEL}
        </span>
      ) : (
        <StatValue className="text-[13px] font-semibold text-[color:var(--color-accent-cyan)]">
          Lv {skillLevel}
        </StatValue>
      )}
    </div>
  );
}
