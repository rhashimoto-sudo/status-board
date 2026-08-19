import { CalibrationBanner } from "@/components/calibration-banner";
import { ActivityHeatmap } from "@/components/growth/activity-heatmap";
import { GmLearningPanel } from "@/components/growth/gm-learning-panel";
import { GrowthChart } from "@/components/growth/growth-chart";
import { HallOfFamePanel } from "@/components/growth/hall-of-fame";
import { buildHeatmapDays } from "@/lib/heatmap";
import type { DashboardData } from "@/lib/types";

type GrowthTabProps = { data: DashboardData };

/**
 * Tab3「成長推移」（09_dashboard_spec.md §4）。サーバーコンポーネント。
 * calibration 中は CalibrationBanner をこのタブ内部の先頭に置く（共通ヘッダーには置かない。C-13）。
 *
 * ヒートマップの濃度段階は `lib/heatmap.ts` の分位点ベースの純関数で算出する
 * （最大値による線形正規化は外れ値と近接値の両方で濃淡が潰れるため使わない）。
 */
export function GrowthTab({ data }: GrowthTabProps) {
  const { state, history, hallOfFame } = data;
  const calibrating = state.phase === "calibration";
  const days = buildHeatmapDays(history);

  return (
    <div className="flex flex-col gap-4">
      {calibrating && state.calibration ? (
        <CalibrationBanner progress={state.calibration} />
      ) : null}

      <GrowthChart history={history} levelCap={state.levelCap} />

      <ActivityHeatmap days={days} />

      <GmLearningPanel />

      <HallOfFamePanel hallOfFame={hallOfFame} />
    </div>
  );
}
