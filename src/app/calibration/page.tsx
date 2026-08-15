import { Dashboard } from "@/components/dashboard";
import { loadDashboard } from "@/lib/data-source";

/** 測定期間モード。`/` とはこの phase 以外まったく同じ（AC-10）。再起動も環境変数も不要。 */
export default function CalibrationPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <Dashboard data={loadDashboard("calibration")} />
    </main>
  );
}
