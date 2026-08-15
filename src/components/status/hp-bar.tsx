import { HP_MAX } from "@/lib/constants";
import type { HpZone, Phase } from "@/lib/types";
import { ProgressBar, type ProgressBarColorToken } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";

type HpBarProps = {
  hp: number;
  zone: HpZone;
  phase: Phase;
};

// ── ゾーンごとの色トークン・テキストラベル（数値の閾値そのものは持たない。
//    閾値判定は呼び出し側が hpZone()/hpState() 経由で行い、結果の zone だけを受け取る）
const ZONE_COLOR: Record<HpZone, ProgressBarColorToken> = {
  safe: "hp-safe",
  warn: "hp-warn",
  danger: "hp-danger",
};

const ZONE_LABEL: Record<HpZone, string> = {
  safe: "安全",
  warn: "警告",
  danger: "危険",
};

// 状態ラベルの配色。文字と枠を状態色に乗せる（HP の緑/黄/赤は規約上の例外色）。
const ZONE_LABEL_CLASS: Record<HpZone, string> = {
  safe: "text-[color:var(--color-hp-safe)] border-[color:var(--color-hp-safe)]/40",
  warn: "text-[color:var(--color-hp-warn)] border-[color:var(--color-hp-warn)]/40",
  danger: "text-[color:var(--color-hp-danger)] border-[color:var(--color-hp-danger)]/40",
};

/**
 * ♥HPバー（06_penalty.md §7 / AC-14 / C-15）。
 * safe/warn/danger を緑/黄/赤に色分けし、danger のときのみ発光する（+ テキストラベル併記）。
 * 測定期間中（calibration）は数値ではなく "—" を表示し「ペナルティ免除中」を併記する。
 */
export function HpBar({ hp, zone, phase }: HpBarProps) {
  if (phase === "calibration") {
    return (
      <div className="flex items-center gap-2">
        <span aria-hidden="true">♥</span>
        <StatValue className="text-[color:var(--color-text-secondary)]">—</StatValue>
        <span className="text-[color:var(--color-text-secondary)]">ペナルティ免除中</span>
      </div>
    );
  }

  const isDanger = zone === "danger";

  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true">♥</span>
      <div className={`flex-1 ${isDanger ? "danger-glow rounded-[4px]" : ""}`}>
        <ProgressBar
          value={hp}
          max={HP_MAX}
          colorToken={ZONE_COLOR[zone]}
          label={`HP ${hp} / ${HP_MAX}（${ZONE_LABEL[zone]}）`}
        />
      </div>
      <StatValue>
        {hp} / {HP_MAX}
      </StatValue>
      {/* 状態ラベルは状態色に乗せる（色だけに頼らずテキストも併記＝NFR-4）。発光は付けない。 */}
      <span
        className={`rounded-[3px] border px-1.5 py-0.5 text-[11px] tracking-[0.08em] ${ZONE_LABEL_CLASS[zone]}`}
      >
        {ZONE_LABEL[zone]}
      </span>
    </div>
  );
}
