import { NextResponse, type NextRequest } from "next/server";

/**
 * 書き込み API を Basic 認証で守る（10_notion_schema.md §5）。
 *
 * status-board は Vercel の公開 URL で、ログインの概念が無い。デイリーのチェックを
 * 画面上で付けられるようにした以上、**URL を知る誰もが押せる状態**になるため必須。
 *
 * ## なぜ API だけでなくサイト全体を守るのか
 * **`/api` だけを守ると動かない。** `fetch()` は 401 を受け取っても認証ダイアログを出さず、
 * そのまま失敗する（ダイアログが出るのはトップレベルのナビゲーションだけ）。ページ本体が
 * 無認証だとブラウザは資格情報を一度も持たないため、クライアントからの `/api/daily` が
 * 必ず 401 になり、チェックが永久に保存できない。
 *
 * ページごと守れば、ブラウザは初回アクセス時にダイアログを出し、以降そのオリジンへの
 * リクエストに資格情報を自動で載せる。結果として API 呼び出しも通る。
 *
 * 静的生成は壊れない。middleware は配信前に走るだけで、ページのレンダリング方式
 * （`○ Static`）は変わらない。
 *
 * ## 定数時間比較にしない理由
 * 突き合わせるのは Vercel 側の環境変数であり、タイミング攻撃の前提（大量試行が可能で
 * 応答時間差が観測できる）が成立する状況ではない。ここで自作の比較関数を持ち込むより、
 * 素直に書いて読めるようにしておく方が安全側に倒れると判断した。
 */
export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // 未設定のまま公開されると無防備になる。開ける方向のフォールバックはしない。
  if (!user || !password) {
    return NextResponse.json(
      { error: "BASIC_AUTH_USER / BASIC_AUTH_PASSWORD が未設定です" },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    const [inputUser, ...rest] = atob(header.slice(6)).split(":");
    // パスワードに ":" が含まれても壊れないよう、最初の ":" だけで分割する。
    if (inputUser === user && rest.join(":") === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    // ブラウザに認証ダイアログを出させる。
    headers: { "WWW-Authenticate": 'Basic realm="status-board", charset="UTF-8"' },
  });
}

export const config = {
  // 静的アセットは除外する（認証しても守るものが無く、毎回 middleware を通すのは無駄）。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
