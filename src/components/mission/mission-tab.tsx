import { CalibrationBanner } from "@/components/calibration-banner";
import { DailyQuests } from "@/components/mission/daily-quests";
import { DefeatLog } from "@/components/mission/defeat-log";
import { MissionList } from "@/components/mission/mission-list";
import { UrgentBoard } from "@/components/mission/urgent-board";
import type { DashboardData } from "@/lib/types";

type MissionTabProps = { data: DashboardData };

/**
 * Tab2「ミッション」（09_dashboard_spec.md §3）。サーバーコンポーネント。
 * calibration 中は CalibrationBanner をこのタブ内部の先頭に置く（共通ヘッダーには置かない。C-13）。
 * HP・ストリーク・TOTAL Lv は Tab1 のヒーローヘッダーにのみ置き、ここには出さない（§1 のルール）。
 */
export function MissionTab({ data }: MissionTabProps) {
  const { state, quests } = data;
  const calibrating = state.phase === "calibration";

  return (
    <div className="flex flex-col gap-4">
      {calibrating && state.calibration ? (
        <CalibrationBanner progress={state.calibration} />
      ) : null}

      <UrgentBoard bosses={quests.bosses} guerrillas={quests.guerrillas} />

      <MissionList missions={quests.missions} />

      <DailyQuests dailies={quests.dailies} />

      <DefeatLog defeats={quests.defeats} />
    </div>
  );
}
