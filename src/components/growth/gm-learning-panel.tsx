import type { ReactNode } from "react";
import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";

// Step 1 は GM（査定AI。Step 4 で導入）が存在しないため、以下はすべて画面表示用のダミー値。
// 08_gm_learning_loop.md §3 / 09_dashboard_spec.md §4.3 に列挙された3指標のみを表示する。
// これらは HP増減・EXP係数などの「調整値」ではなく実データを持たない期間の表示プレースホルダーの
// ため、constants.ts（ゲームバランス調整値の一元管理先）には置かず本ファイルに閉じ込める。
const DUMMY_ESTIMATE_ACCURACY_TREND = "±12% → ±5%";
const DUMMY_D_JUDGMENT_MATCH_RATE = 82;
const DUMMY_RUBRIC_ITEM_COUNT = 12;

const DUMMY_TAG = "ダミー";
const REAL_DATA_LABEL = "Step 5 で実データ化";

/**
 * GM学習状況パネル（09_dashboard_spec.md §4.3）。
 * GM は Step 4 で導入されるため Step 1 の時点では実データを一切持たない。
 * ここに表示される数値は固定のダミー定数であり、実データと誤認させないよう
 * 「ダミー」バッジと「Step 5 で実データ化」ラベルを常に併記する。
 */
export function GmLearningPanel() {
  return (
    <Panel heading={<span>🤖 GM学習状況</span>}>
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded-[4px] border border-[color:var(--color-border-hairline)] px-2 py-0.5 text-[color:var(--color-text-secondary)]">
          <span aria-hidden="true">🚧</span> {DUMMY_TAG}
        </span>
        <span className="text-[color:var(--color-text-secondary)]">{REAL_DATA_LABEL}</span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <Metric
          label="見積精度の推移"
          value={<StatValue className="text-[16px] font-semibold">{DUMMY_ESTIMATE_ACCURACY_TREND}</StatValue>}
          note="GMのEXP見積と実績の乖離（時系列）"
        />
        <Metric
          label="D判定一致率"
          value={
            <>
              <StatValue className="text-[16px] font-semibold">{DUMMY_D_JUDGMENT_MATCH_RATE}</StatValue>%
            </>
          }
          note="難易度判定が本人の感覚と一致した割合"
        />
        <Metric
          label="ルーブリック条項数"
          value={
            <>
              <StatValue className="text-[16px] font-semibold">{DUMMY_RUBRIC_ITEM_COUNT}</StatValue>件
            </>
          }
          note="蓄積された査定ルールの数"
        />
      </dl>
    </Panel>
  );
}

function Metric({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="min-w-0 border-l-2 border-[color:var(--color-border-hairline)] pl-3">
      <dt className="text-[13px] text-[color:var(--color-text-secondary)]">
        {label} <span className="text-[color:var(--color-text-secondary)]">（{DUMMY_TAG}）</span>
      </dt>
      <dd className="mt-1 text-[color:var(--color-text-primary)]">{value}</dd>
      <dd className="mt-0.5 text-[13px] text-[color:var(--color-text-secondary)]">{note}</dd>
    </div>
  );
}
