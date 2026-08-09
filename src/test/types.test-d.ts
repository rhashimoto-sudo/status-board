import type { MainStatusKey, SubStatusKey } from "@/lib/types";

// S-8: MainStatusKey / SubStatusKey に "LEARNING" を代入すると型エラーになることを固定する。
// tsc --noEmit がこの行を「型エラー」として検出しなければ @ts-expect-error 自体がエラーになる。
// @ts-expect-error LEARNING は SpecialtyStatusKey ではないため MainStatusKey に代入できない
const mainKey: MainStatusKey = "LEARNING";

// @ts-expect-error LEARNING は SpecialtyStatusKey ではないため SubStatusKey に代入できない
const subKey: SubStatusKey = "LEARNING";

void mainKey;
void subKey;
