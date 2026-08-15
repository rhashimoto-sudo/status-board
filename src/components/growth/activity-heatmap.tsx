import { weekdayIndexInTimeZone } from "@/lib/datetime";
import { HEATMAP_INTENSITY_STEPS } from "@/lib/constants";

const CELL_SIZE = 11;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const WEEKDAYS_PER_WEEK = 7;

type HeatmapDay = { date: string; gainedExp: number; intensity: number };

type HeatmapCell = HeatmapDay | null;

// GitHub の草と同じ「週×曜日」の列優先グリッドに並べ替える。
// 先頭日の曜日ぶんだけ空セルを差し込み、列の起点を日曜に揃える。
// 末尾も7の倍数になるよう空セルで埋め、最後の列だけ行数が崩れないようにする。
function buildWeekColumns(days: readonly HeatmapDay[]): readonly HeatmapCell[][] {
  if (days.length === 0) return [];

  // date は "YYYY-MM-DD"（DISPLAY_TIME_ZONE 基準で既に確定済みの日付文字列）。この文字列に
  // もう解決すべきタイムゾーン情報は無いため、`T00:00:00Z` として組み立てた Date は
  // 常に "UTC" で再評価する（datetime.ts のドキュメントコメント参照）。DISPLAY_TIME_ZONE
  // を渡すと、負のオフセットのタイムゾーンでは全セルが1行ずれてグリッドが崩れる。
  const leadingPad = weekdayIndexInTimeZone(new Date(`${days[0]!.date}T00:00:00Z`), "UTC");
  const cells: HeatmapCell[] = [...Array(leadingPad).fill(null), ...days];
  const trailingPad = (WEEKDAYS_PER_WEEK - (cells.length % WEEKDAYS_PER_WEEK)) % WEEKDAYS_PER_WEEK;
  for (let i = 0; i < trailingPad; i += 1) cells.push(null);

  const columns: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += WEEKDAYS_PER_WEEK) {
    columns.push(cells.slice(i, i + WEEKDAYS_PER_WEEK));
  }
  return columns;
}

// 濃度は intensity（0 〜 HEATMAP_INTENSITY_STEPS-1、活動0を含む）を Cyan の不透明度に
// 線形マップする。intensity=0 でも罫線付きの薄いセルとして残り、ストリークの空白が
// 視覚的に分かるようにする（09_dashboard_spec.md §4.2）。
function intensityToOpacity(intensity: number): number {
  const steps = HEATMAP_INTENSITY_STEPS - 1;
  const clamped = Math.min(Math.max(intensity, 0), steps);
  const minOpacity = 0.06;
  const maxOpacity = 0.85;
  if (steps <= 0) return minOpacity;
  return minOpacity + (clamped / steps) * (maxOpacity - minOpacity);
}

type ActivityHeatmapProps = { days: readonly HeatmapDay[] };

/**
 * 直近90日分の活動ヒートマップ（自前SVG。チャートライブラリを使わない / C-20）。
 * `viewBox` + `width:100%` で親幅に追従し、375pxでも横スクロールを発生させない。
 */
export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const columns = buildWeekColumns(days);
  const svgWidth = columns.length * CELL_STEP;
  const svgHeight = WEEKDAYS_PER_WEEK * CELL_STEP;

  return (
    <div className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${Math.max(svgWidth, CELL_STEP)} ${svgHeight}`}
        width="100%"
        style={{ display: "block" }}
        role="img"
        aria-label={`直近${days.length}日の活動ヒートマップ`}
      >
        {columns.map((column, columnIndex) => (
          <g key={columnIndex} transform={`translate(${columnIndex * CELL_STEP}, 0)`}>
            {column.map((cell, rowIndex) =>
              cell === null ? null : (
                <rect
                  key={cell.date}
                  x={0}
                  y={rowIndex * CELL_STEP}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill="var(--color-accent-cyan)"
                  fillOpacity={intensityToOpacity(cell.intensity)}
                  stroke="var(--color-border-hairline)"
                  strokeWidth={1}
                >
                  <title>{`${cell.date} 獲得EXP ${cell.gainedExp}`}</title>
                </rect>
              ),
            )}
          </g>
        ))}
      </svg>

      {/* 濃淡だけに頼らないための凡例（色 + テキスト）。5項目程度の固定幅チップのみで
          375pxでも折り返す必要がないくらい短いが、念のため flex-wrap にしておく。 */}
      <ul className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[color:var(--color-text-secondary)]">
        <li>少ない</li>
        {Array.from({ length: HEATMAP_INTENSITY_STEPS }, (_, step) => (
          <li key={step} aria-hidden>
            <span
              className="inline-block h-3 w-3 rounded-[2px] border border-[color:var(--color-border-hairline)]"
              style={{
                backgroundColor: "var(--color-accent-cyan)",
                opacity: intensityToOpacity(step),
              }}
            />
          </li>
        ))}
        <li>多い</li>
      </ul>
    </div>
  );
}
