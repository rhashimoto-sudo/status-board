"use client";

import { StatValue } from "@/components/ui/stat-value";

const LOCKED_LABEL = "覚醒後に解放";
const SKILL_NAME = "《構造化》";
// 未解放時の簡潔な視覚表現（48px に収まる記号のみ。詳細は aria-label に残す）。
const LOCKED_GLYPH = "?";
// 背景の紫グロー不透明度の上限。塗りベースを透明（--color-surface 混合ではなく
// 透明混合）に変えたため、レーダーのシアンポリゴンが下から透けた最悪条件でも
// Lv ラベル（シアン）が WCAG AA（4.5:1）を割り込まないよう抑える（A-2）。
// 0.22 なら「紋章の塗り(0.22) の上にレーダーのシアン塗り(fillOpacity 0.22)が
// 重なった最悪の背景」でも 4.5:1 を上回る（下記コメント参照）。
const MAX_GLOW_OPACITY = 0.22;

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
      className="flex h-12 w-12 flex-col items-center justify-center rounded-full border text-center"
      style={{
        borderColor: locked
          ? "var(--color-border-hairline)"
          : "var(--color-accent-cyan)",
        // 塗りは透明ベースに変更（下地のレーダーが常に透けるようにする。A-1/A-2）。
        // --color-surface との不透明混合ではなく transparent との混合にすることで、
        // 紋章が下地レイヤーに来ても上のポリゴン・グリッドの視認性を妨げない。
        backgroundColor: locked
          ? "transparent"
          : `color-mix(in srgb, var(--color-accent-violet) ${Math.round(glowOpacity * 100)}%, transparent)`,
      }}
    >
      {locked ? (
        <span
          aria-hidden
          className="text-[13px] leading-none text-[color:var(--color-text-muted)]"
        >
          {LOCKED_GLYPH}
        </span>
      ) : (
        <StatValue className="text-[11px] font-semibold text-[color:var(--color-accent-cyan)]">
          Lv {skillLevel}
        </StatValue>
      )}
    </div>
  );
}
