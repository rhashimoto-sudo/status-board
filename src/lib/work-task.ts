import {
  AREA_TO_SUB_STATUS,
  PHASE_COMPLETION,
  PHASE_DIFFICULTY_BY_CHILD_COUNT,
  WORK_TYPE_TO_MAIN_STATUS,
} from "./constants";
import type { Difficulty, MainStatusKey } from "./types";

/**
 * work-dashboard（Notion タスクDB）の1行から、status-board が必要とする分だけを写した形。
 * 向こうは29プロパティ持つが、EXP 算出に使うのはここに挙げたものだけ。
 *
 * `作業種別` / `領域` は221件すべてに値が入っていることを実測で確認済み（2026-08-15）。
 * 一方 `見積工数` は**221件すべて未入力**だったため、難易度の材料として使えない。
 */
export type WorkTask = {
  /** Notion page.id。証拠の一意キー（10_notion_schema.md §2.2）。 */
  id: string;
  title: string;
  /** `作業種別`。未設定なら null。 */
  workType: string | null;
  /** `領域`。未設定なら null。 */
  area: string | null;
};

export type DerivedStatuses = {
  main: MainStatusKey | null;
  sub: MainStatusKey | null;
};

/**
 * work-dashboard のタスクから主軸・副軸を導く（10_notion_schema.md §8）。
 *
 * - **主軸は `作業種別`**（どの能力を使ったか）
 * - **副軸は `領域`**（何の分野か）
 *
 * 領域は業務ドメインであって能力ではない。同じ「集計」でも SEO でも MEO でも
 * 使う力は 📊DATA なので、主軸を領域から決めてはならない。
 *
 * 主軸が決まらない場合は `main: null` を返す。**呼び出し側は EXP を付けないこと**
 * （知らない作業種別に適当な軸を割り当てると、レーダーの形が意味を失う）。
 */
export function deriveStatuses(task: Pick<WorkTask, "workType" | "area">): DerivedStatuses {
  const main =
    task.workType !== null && task.workType in WORK_TYPE_TO_MAIN_STATUS
      ? WORK_TYPE_TO_MAIN_STATUS[task.workType as keyof typeof WORK_TYPE_TO_MAIN_STATUS]
      : null;

  if (main === null) return { main: null, sub: null };

  const areaSub =
    task.area !== null && task.area in AREA_TO_SUB_STATUS
      ? AREA_TO_SUB_STATUS[task.area as keyof typeof AREA_TO_SUB_STATUS]
      : null;

  // 主軸と同じ軸を副軸にしても意味がない（同じ軸に 100% + 50% が入るだけ）。
  // 例: AI開発 × 開発実装（実測で最多の59件）は主副とも TECH になるため副軸なしにする。
  return { main, sub: areaSub === main ? null : areaSub };
}

/** フェーズ配下のタスクのうち、完了判定に必要な最小限。 */
export type PhaseChild = { done: boolean; completedDate: string | null };

/**
 * フェーズが完了したかを**配下タスクから**判定する（10_notion_schema.md §8.2）。
 *
 * > **フェーズ自身の `ステータス` を見てはならない。**
 * > 実測（2026-08-15）で 17 フェーズすべてが `未着手` のままだった。配下タスクは
 * > 153 件完了しているのに、フェーズ行の status は運用されていない。これを条件に
 * > すると 👑PM の EXP は永久に 0 になる。
 *
 * 配下 0 件のフェーズは完了扱いにしない（「全部完了」が空虚に真になるため）。
 * 実測でも配下 0 件のフェーズが 5 件あり、これらを完了と見なすと EXP を誤って配る。
 */
export function isPhaseComplete(children: readonly PhaseChild[]): boolean {
  return children.length > 0 && children.every((child) => child.done);
}

/**
 * フェーズの完了日 = 配下タスクの完了日の最大値（最後の1件が終わった日）。
 * 完了日を持つ子が1件も無ければ null。
 */
export function phaseCompletedDate(children: readonly PhaseChild[]): string | null {
  const dates = children
    .map((child) => child.completedDate)
    .filter((date): date is string => date !== null);
  // すべて YYYY-MM-DD（JST 打刻）なので辞書順の最大が最新。
  return dates.length === 0 ? null : dates.reduce((a, b) => (a > b ? a : b));
}

/**
 * フェーズ完了の難易度を配下タスク数から決める（10_notion_schema.md §8.2）。
 * `見積工数` が全件未入力のため、規模の代理指標として配下タスク数を使う。
 */
export function phaseDifficulty(childCount: number): Difficulty {
  const band = PHASE_DIFFICULTY_BY_CHILD_COUNT.find((b) => childCount <= b.maxChildren);
  // 最終要素の maxChildren が Infinity なので必ず見つかる。型のために既定値を置く。
  return band?.difficulty ?? PHASE_DIFFICULTY_BY_CHILD_COUNT[0].difficulty;
}

/**
 * フェーズ完了の完遂度。期限内に着地したかで決める。
 * 期限が未設定のフェーズは「期日という約束が無かった」ため減点しない（onTime 扱い）。
 */
export function phaseCompletion(deadline: string | null, completedDate: string | null): number {
  if (deadline === null || completedDate === null) return PHASE_COMPLETION.onTime;
  // どちらも Notion の date（YYYY-MM-DD、JST 打刻）。同じ書式どうしなので辞書順比較でよい。
  return completedDate <= deadline ? PHASE_COMPLETION.onTime : PHASE_COMPLETION.late;
}
