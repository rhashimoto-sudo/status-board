"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
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
      // 未測定の軸は値を出さない（多角形の頂点は中心に落ちるが、9軸の形は保たれる）
      current: measured ? (point?.current ?? 0) : 0,
      ghost: point?.ghost ?? 0,
      measured,
    };
  });
}

function makeAxisTick(labelByKey: ReadonlyMap<StatusKey, string>) {
  return function AxisTick({ x, y, textAnchor, payload }: BaseTickContentProps) {
    const label = labelByKey.get(payload.value as StatusKey) ?? String(payload.value);
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="var(--color-text-secondary)"
        fontSize={11}
      >
        {label}
      </text>
    );
  };
}

/**
 * 9軸固定の Recharts レーダー（現在値 + 3ヶ月前ゴースト）。
 * 軸最大値は常に 10 固定。データに応じて自動調整しない（C-11）。
 */
export function StatusRadar({ data, measuredKeys }: StatusRadarProps) {
  const rows = buildChartRows(data, measuredKeys);
  const labelByKey = new Map(rows.map((row) => [row.key, row.label]));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" aspect={1}>
        <RadarChart data={rows} outerRadius="70%">
          <PolarGrid stroke="var(--color-border-hairline)" />
          <PolarAngleAxis dataKey="key" tick={makeAxisTick(labelByKey)} />
          <PolarRadiusAxis
            domain={[0, RADAR_MAX]}
            tick={false}
            axisLine={false}
            tickCount={6}
          />
          <Radar
            name="3ヶ月前"
            dataKey="ghost"
            stroke="var(--color-ghost)"
            strokeDasharray="4 3"
            fill="var(--color-accent-violet)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
          <Radar
            name="現在"
            dataKey="current"
            stroke="var(--color-accent-cyan)"
            fill="var(--color-accent-cyan)"
            fillOpacity={0.25}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
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
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full border border-dashed"
            style={{ borderColor: "var(--color-accent-violet)" }}
          />
          3ヶ月前
        </li>
      </ul>
    </div>
  );
}
