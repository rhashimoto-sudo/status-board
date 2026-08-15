import { GrowthTab } from "@/components/growth/growth-tab";
import { MissionTab } from "@/components/mission/mission-tab";
import { StatusTab } from "@/components/status/status-tab";
import { Tabs } from "@/components/tabs";
import type { DashboardData } from "@/lib/types";

type DashboardProps = { data: DashboardData };

/**
 * ダッシュボード全体（09_dashboard_spec.md §1）。サーバーコンポーネント。
 *
 * 3タブの中身をサーバー側で組み立て、`Tabs`（クライアント）へ ReactNode の slot として渡す。
 * `Tabs` はデータを一切知らず、選択中の1つの slot だけを DOM に残す（非選択タブはアンマウント）。
 * ルートの違いは `loadDashboard` に渡す phase だけで、レイアウト・タブ構成は完全に同一（AC-10）。
 */
export function Dashboard({ data }: DashboardProps) {
  return (
    <Tabs
      statusTab={<StatusTab data={data} />}
      missionTab={<MissionTab data={data} />}
      growthTab={<GrowthTab data={data} />}
    />
  );
}
