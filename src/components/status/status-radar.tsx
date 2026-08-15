"use client";

import type { ReactNode } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Text,
} from "recharts";
import { STATUS_ORDER } from "@/lib/constants";
import type { StatusKey } from "@/lib/types";
import type { BaseTickContentProps } from "recharts";

// ── 軸ラベル用の絵文字（このコンポーネントの表示専用。調整値ではないためここに閉じる） ──
const STATUS_EMOJI: Readonly<Record<StatusKey, string>> = {
  INT: "🧠",
  TECH: "💻",
  DATA: "📊",
  MARKETING: "📣",
  PM: "👑",
  BRIDGE: "🤝",
  ENGLISH: "🌎",
  LEARNING: "🔥",
  EXECUTION: "⚔️",
};

const RADAR_MAX = 10;
const UNMEASURED_LABEL = "???";

export type StatusRadarPoint = {
  key: StatusKey;
  /** 現在の Lv（1〜10）。 */
  current: number;
  /** 3ヶ月前の Lv（1〜10）。 */
  ghost: number;
};

type StatusRadarProps = {
  data: readonly StatusRadarPoint[];
  /**
   * 測定済みの軸キー。指定が無ければ全軸を測定済み扱いにする（main フェーズ）。
   * calibration 中は測定完了分だけを渡す。
   */
  measuredKeys?: readonly StatusKey[];
  /** レーダー中心に絶対配置する要素（《構造化》紋章など）。09_dashboard_spec.md:75。 */
  centerSlot?: ReactNode;
};

type ChartRow = {
  key: StatusKey;
  label: string;
  current: number;
  ghost: number;
  measured: boolean;
};

function buildChartRows(
  data: readonly StatusRadarPoint[],
  measuredKeys: readonly StatusKey[] | undefined,
): readonly ChartRow[] {
  const byKey = new Map(data.map((point) => [point.key, point]));
  const measuredSet = measuredKeys ? new Set(measuredKeys) : null;

  // 軸順は STATUS_ORDER のみを参照する（C-10）。ハードコードしない。
  return STATUS_ORDER.map((key) => {
    const measured = measuredSet ? measuredSet.has(key) : true;
    const point = byKey.get(key);
    return {
      key,
      label: measured ? `${STATUS_EMOJI[key]} ${key}` : UNMEASURED_LABEL,
      // 未測定の軸は current/ghost とも値を出さない（多角形の頂点は中心に落ちるが、9軸の形は保たれる）。
      // ghost を測定済みでガードしないと、未測定軸でも3ヶ月前の値がチャートから読み取れてしまう（A-1）。
      current: measured ? (point?.current ?? 0) : 0,
      ghost: measured ? (point?.ghost ?? 0) : 0,
      measured,
    };
  });
}

// モジュールレベルに巻き上げ、毎レンダーで新しいコンポーネント型を生成しない（C-1）。
// labelByKey は `tick={<AxisTick labelByKey={...} />}` の要素として渡し、recharts が
// x/y/payload 等を cloneElement でマージする（型の同一性は保たれるため再マウントされない）。
type AxisTickProps = Partial<BaseTickContentProps> & {
  labelByKey: ReadonlyMap<StatusKey, string>;
};

function AxisTick({ x, y, textAnchor, payload, labelByKey }: AxisTickProps) {
  const label = payload ? (labelByKey.get(payload.value as StatusKey) ?? String(payload.value)) : "";
  return (
    <Text
      x={x}
      y={y}
      textAnchor={textAnchor}
      verticalAnchor="middle"
      fill="var(--color-text-secondary)"
      fontSize={11}
    >
      {label}
    </Text>
  );
}

/**
 * 9軸固定の Recharts レーダー（現在値 + 3ヶ月前ゴースト）。
 * 軸最大値は常に 10 固定。データに応じて自動調整しない（C-11）。
 */
export function StatusRadar({ data, measuredKeys, centerSlot }: StatusRadarProps) {
  const rows = buildChartRows(data, measuredKeys);
  const labelByKey = new Map(rows.map((row) => [row.key, row.label]));

  return (
    <div className="w-full">
      {/* centerSlot をレーダー中心に絶対配置するための相対コンテナ（A-4）。
          ResponsiveContainer は aspect=1 の正方形なので、中心は常に 50%/50%。
          centerSlot は DOM 順で ResponsiveContainer より「前」に置く（A-1）。
          兄弟要素は DOM 順が描画順（後勝ち）になるため、紋章を先に置き
          チャート（SVG、背景透明）を後に重ねると、ポリゴン・グリッド・軸ラベルが
          常に紋章の上に描画される。これにより Lv2〜3 の頂点が紋章に隠れなくなる。 */}
      <div className="relative w-full">
        {centerSlot && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            aria-hidden={false}
          >
            {centerSlot}
          </div>
        )}
        <ResponsiveContainer width="100%" aspect={1}>
          {/* outerRadius を 70% → 58% → 55% に縮小し、375px 幅でも軸ラベル
              （🔥 LEARNING 等）が SVG 端でクリップされない余白を確保する（B-1）。
              9軸は startAngle=90 から時計回り40°刻み（STATUS_ORDER順）で配置され、
              各軸の水平オフセットは radius * cos(angle) で決まる。左端に最も寄るのは
              LEARNING（角度170°、cos≈-0.985）で、半径を縮めるほど全軸のオフセットが
              一様に中心へ寄るため、他8軸（📣 MARKETING・🧠 INT 含む）の既存の
              クリップ解消の余白はむしろ広がる方向にしか動かない。 */}
          <RadarChart data={rows} outerRadius="55%">
            <PolarGrid stroke="var(--color-border-hairline)" />
            <PolarAngleAxis
              dataKey="key"
              tick={<AxisTick labelByKey={labelByKey} />}
            />
            <PolarRadiusAxis
              domain={[0, RADAR_MAX]}
              tick={false}
              axisLine={false}
              tickCount={6}
            />
            <Radar
              name="3ヶ月前"
              dataKey="ghost"
              stroke="var(--color-ghost-stroke)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="var(--color-accent-violet)"
              fillOpacity={0.08}
              isAnimationActive={false}
            />
            <Radar
              name="現在"
              dataKey="current"
              stroke="var(--color-accent-cyan)"
              strokeWidth={2}
              fill="var(--color-accent-cyan)"
              fillOpacity={0.22}
              dot={{ r: 2.5, fill: "var(--color-accent-cyan)" }}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap justify-center gap-4 text-[13px] text-[color:var(--color-text-secondary)]">
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-accent-cyan)" }}
          />
          現在
        </li>
        <li className="flex items-center gap-2">
          {/* 凡例スウォッチは系列と同じ破線色（stroke: var(--color-ghost-stroke)）・
              塗り不透明度 0.08（fillOpacity と同じ）に一致させる（B-3）。 */}
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full border border-dashed"
            style={{
              borderColor: "var(--color-ghost-stroke)",
              backgroundColor:
                "color-mix(in srgb, var(--color-accent-violet) 8%, transparent)",
            }}
          />
          3ヶ月前
        </li>
      </ul>
    </div>
  );
}
