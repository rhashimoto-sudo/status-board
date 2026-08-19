"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FOUNDATION_ORDER, MAX_LEVEL, SPECIALTY_ORDER } from "@/lib/constants";
import type { Snapshot, SpecialtyStatusKey, StatusKey } from "@/lib/types";

// SPECIALTY_ORDER は `STATUS_ORDER.slice(0, 7)` で型上 StatusKey[] のままのため、
// 無検査アサーションで SpecialtyStatusKey[] とみなさない。FOUNDATION_ORDER
// （LEARNING/EXECUTION）を実行時に除外する型ガードで絞り込むことで、
// STATUS_ORDER の並びが将来変わって先頭7つに土台2つが混入しても
// LEARNING/EXECUTION が専門系列として二重に描画されない（constants.ts は変更しない）。
function isSpecialtyKey(key: StatusKey): key is SpecialtyStatusKey {
  return !(FOUNDATION_ORDER as readonly StatusKey[]).includes(key);
}
const SPECIALTIES: readonly SpecialtyStatusKey[] = SPECIALTY_ORDER.filter(isSpecialtyKey);

// ── 表示専用の絵文字（このコンポーネントに閉じる。status-radar.tsx と同じ方針）
const SPECIALTY_EMOJI: Readonly<Record<SpecialtyStatusKey, string>> = {
  INT: "🧠",
  TECH: "💻",
  DATA: "📊",
  MARKETING: "📣",
  PM: "👑",
  BRIDGE: "🤝",
  ENGLISH: "🌎",
};

type BaseSeriesKey = "totalLevel" | "LEARNING" | "EXECUTION";

type BaseSeriesDef = {
  key: BaseSeriesKey;
  label: string;
  stroke: string;
};

// 既定3系列（09_dashboard_spec.md §4.1 / 11_design_system.md §3.1）。
// TOTAL=Cyan、LEARNING=Violet、EXECUTIONはCyan低彩度を color-mix で合成する
// （新しい色相を追加せず、既存の2アクセント変数のみから導出するため）。
const BASE_SERIES: readonly BaseSeriesDef[] = [
  { key: "totalLevel", label: "TOTAL", stroke: "var(--color-accent-cyan)" },
  { key: "LEARNING", label: "🔥 LEARNING", stroke: "var(--color-accent-violet)" },
  {
    key: "EXECUTION",
    label: "⚔️ EXECUTION",
    // 11_design_system.md §3.1: EXECUTION は「Cyan 低彩度」指定（globals.css の @theme 参照）。
    // white を混ぜると明度が上がり TOTAL より明るく主役級に見えてしまうため、
    // globals.css の @theme に定義した専用トークンを使う（新しい色相は追加しない）。
    stroke: "var(--color-accent-cyan-soft)",
  },
];

// 専門7つはシアン〜バイオレット間の同一色相帯の明度違いで生成する（赤・緑・黄は使わない）。
// 8分割の内側7点（12.5%〜87.5%）では両端（TOTAL=Cyan 0%・LEARNING=Violet 100%）との
// 差がわずか12.5ポイントしかなく、隣接する専門系列(INT/ENGLISH)が既定系列と実測でほぼ
// 同色になっていた。25%〜75%の帯に7点を均等配置することで、両端との距離を25ポイント
// まで広げ、隣接専門系列どうしの間隔も (75-25)/6 ≈ 8.33ポイントを確保する。
function specialtyColor(index: number): string {
  const bandMin = 25;
  const bandMax = 75;
  const ratio =
    SPECIALTIES.length <= 1
      ? (bandMin + bandMax) / 2
      : bandMin + (index / (SPECIALTIES.length - 1)) * (bandMax - bandMin);
  return `color-mix(in srgb, var(--color-accent-violet) ${ratio}%, var(--color-accent-cyan) ${100 - ratio}%)`;
}

type ChartRow = {
  date: string;
  dateLabel: string;
  totalLevel: number;
  /** 乖離の帯の下端（透明）。 */
  gapBase: number;
  /** 乖離の帯の高さ = |LEARNING − EXECUTION|。 */
  gapBand: number;
} & Record<SpecialtyStatusKey | "LEARNING" | "EXECUTION", number>;

function buildChartRows(history: readonly Snapshot[]): readonly ChartRow[] {
  return history.map((snapshot) => ({
    date: snapshot.date,
    // snapshot.date は既に DISPLAY_TIME_ZONE 基準で確定した "YYYY-MM-DD" 文字列のため、
    // Date化・ランタイムTZ依存API（new Date(iso).getDay() 等）を使わず文字列操作のみで
    // "MM/DD" ラベルを作る（datetime.ts の対象は Date→文字列変換であり、
    // 既に文字列の日付を再解釈する必要はない）。
    dateLabel: snapshot.date.slice(5).replace("-", "/"),
    totalLevel: snapshot.totalLevel,
    // LEARNING と EXECUTION の差を「面」で描くための2値（stack して下段を透明にする）。
    // 2本の線の隙間を目測させるのではなく、面積として乖離の大きさと趨勢を読めるようにする。
    gapBase: Math.min(snapshot.levels.LEARNING, snapshot.levels.EXECUTION),
    gapBand: Math.abs(snapshot.levels.LEARNING - snapshot.levels.EXECUTION),
    ...snapshot.levels,
  })) as ChartRow[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded border border-[color:var(--color-border-hairline)] bg-[color:var(--color-surface)] px-3 py-2 text-[13px]">
      <div className="text-[color:var(--color-text-secondary)]">{label}</div>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[color:var(--color-text-secondary)]">{entry.name}</span>
            <span className="font-mono tabular-nums text-[color:var(--color-text-primary)]">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type GrowthChartProps = {
  history: readonly Snapshot[];
  /**
   * 現在の levelCap（決定9）。Y軸の domain には反映しない（0〜MAX_LEVEL固定のまま）。
   * cap の位置に基準線を1本引き、「ロックされた伸びしろ」として読ませるためだけに使う。
   */
  levelCap: number;
};

/**
 * 90日分の成長推移の折れ線グラフ。既定は TOTAL / LEARNING / EXECUTION の3本のみ表示し、
 * 専門7つは凡例クリックで個別にオン/オフする（09_dashboard_spec.md §4.1）。
 *
 * Y軸は levelCap に連動させない（0〜MAX_LEVEL固定）。cap 連動にすると、cap が動いた日に
 * 過去90日ぶんが遡って再スケールされ、同じ過去データが日によって違う形に見えるため
 * （レーダーの軸最大値を levelCap 連動にする決定9は、このTab3の時系列には適用しない）。
 */
export function GrowthChart({ history, levelCap }: GrowthChartProps) {
  const [visibleSpecialties, setVisibleSpecialties] = useState<
    ReadonlySet<SpecialtyStatusKey>
  >(new Set());
  const rows = buildChartRows(history);
  // X軸ラベルの間引き（09_dashboard_spec.md §4.1「X軸は日付（間引いて表示）」）。
  // 履歴日数に応じて可変にし、90日固定を前提にハードコードしない。
  const tickInterval = Math.max(0, Math.ceil(rows.length / 8) - 1);

  function toggleSpecialty(key: SpecialtyStatusKey) {
    setVisibleSpecialties((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="w-full min-w-0">
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border-hairline)" vertical={false} />
          <XAxis
            dataKey="dateLabel"
            interval={tickInterval}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, MAX_LEVEL]}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-hairline)" }}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border-hairline)" }} />
          {/* levelCap の基準線。「ロックされた伸びしろ」を示すためだけの補助線で、
              系列としては扱わない（このコンポーネントは <Legend> を使っておらず、
              独自実装の凡例<ul>は BASE_SERIES/SPECIALTIES のみを描画するため、
              ReferenceLine は自動的に凡例・ツールチップの系列に混ざらない）。
              発光禁止（CLAUDE.md）のため violet の低透明度のみで、グロー系のstyleは付けない。 */}
          <ReferenceLine
            y={levelCap}
            stroke="var(--color-accent-violet)"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            ifOverflow="visible"
            label={{
              value: `Lv上限 ${levelCap}`,
              position: "insideTopRight",
              fill: "var(--color-text-secondary)",
              fontSize: 11,
            }}
          />
          {/* 乖離の帯。下段(gapBase)は透明で位置合わせのみ、上段(gapBand)が差の大きさを表す。 */}
          <Area
            dataKey="gapBase"
            stackId="gap"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          <Area
            dataKey="gapBand"
            stackId="gap"
            stroke="none"
            fill="var(--color-accent-violet)"
            fillOpacity={0.1}
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          {BASE_SERIES.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.stroke}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {SPECIALTIES.filter((key) => visibleSpecialties.has(key)).map((key) => {
            const index = SPECIALTIES.indexOf(key);
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={`${SPECIALTY_EMOJI[key]} ${key}`}
                stroke={specialtyColor(index)}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 凡例: 既定3系列（クリック不可・常時表示）+ 専門7系列（クリックで表示切替）。
          最大10項目でも375pxで溢れないよう flex-wrap で複数行に折り返す（横スクロールは出さない）。
          各項目は絵文字+短いラベルの固定幅コンテンツで truncate を必要としないため、
          ロットBで踏んだ「入れ子flex+truncateが祖先gridの影響で効かない」問題は生じない。 */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[color:var(--color-text-secondary)]">
        {BASE_SERIES.map((series) => (
          <li key={series.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: series.stroke }}
            />
            {series.label}
          </li>
        ))}
        {SPECIALTIES.map((key, index) => {
          const active = visibleSpecialties.has(key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => toggleSpecialty(key)}
                aria-pressed={active}
                className="flex min-h-[44px] items-center gap-2 py-1 transition-opacity duration-150"
                style={{ opacity: active ? 1 : 0.5 }}
              >
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: specialtyColor(index) }}
                />
                {SPECIALTY_EMOJI[key]} {key}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
