import { CalibrationBanner } from "@/components/calibration-banner";
import { BalanceMeter } from "@/components/status/balance-meter";
import { HeroHeader } from "@/components/status/hero-header";
import { SkillEmblem } from "@/components/status/skill-emblem";
import { StatusList } from "@/components/status/status-list";
import { StatusRadar, type StatusRadarPoint } from "@/components/status/status-radar";
import { UniqueSkillPanel } from "@/components/status/unique-skill-panel";
import { STATUS_ORDER } from "@/lib/constants";
import { computeTotalLevel, levelFromExp, levelsOf } from "@/lib/level";
import { hpState } from "@/lib/penalty";
import { buildUniqueSkill } from "@/lib/skill";
import { totalTitleFor } from "@/lib/titles";
import type { DashboardData, StatusKey } from "@/lib/types";

type StatusTabProps = { data: DashboardData };

/**
 * Tab1「ステータス」（09_dashboard_spec.md §2）。サーバーコンポーネント。
 * calibration 中は CalibrationBanner をこのタブ内部の先頭に置く（共通ヘッダーには置かない。C-13）。
 */
export function StatusTab({ data }: StatusTabProps) {
  const { state } = data;
  const calibrating = state.phase === "calibration";

  const levels = levelsOf(state.statuses);
  const measuredKeys = STATUS_ORDER.filter((key) => state.statuses[key].measured);
  const allMeasured = measuredKeys.length === STATUS_ORDER.length;

  // 全軸の測定が完了するまで TOTAL Lv・総合称号は未測定（null）。docs/03_status_system.md:189。
  const totalLevel = allMeasured ? computeTotalLevel(state.statuses) : null;
  const totalTitle = totalLevel === null ? null : totalTitleFor(totalLevel);

  const radarData: readonly StatusRadarPoint[] = STATUS_ORDER.map((key) => ({
    key,
    current: levels[key],
    ghost: levelFromExp(state.statuses[key].expThreeMonthsAgo),
  }));

  const skill = buildUniqueSkill(state.uniqueSkillActivations, state.statuses);

  return (
    <div className="flex flex-col gap-4">
      {calibrating && state.calibration ? (
        <CalibrationBanner progress={state.calibration} />
      ) : null}

      <HeroHeader
        totalLevel={totalLevel}
        totalTitle={totalTitle}
        hpState={hpState(state.hp, state.phase)}
        debuffs={state.debuffs}
        streak={state.streak}
        phase={state.phase}
      />

      <StatusRadar
        data={radarData}
        measuredKeys={calibrating ? (measuredKeys as readonly StatusKey[]) : undefined}
        centerSlot={<SkillEmblem skillLevel={calibrating ? null : skill.level} />}
      />

      <UniqueSkillPanel skill={skill} totalLevel={totalLevel} />

      <StatusList items={state.statuses} />

      <BalanceMeter learningLv={levels.LEARNING} executionLv={levels.EXECUTION} />
    </div>
  );
}
