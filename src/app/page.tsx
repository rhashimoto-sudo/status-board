import { Dashboard } from "@/components/dashboard";
import { loadDashboard } from "@/lib/data-source";

/** 通常モード。`/calibration` とはこの phase 以外まったく同じ（AC-10）。 */
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4">
      <Dashboard data={loadDashboard("main")} />
    </main>
  );
}
