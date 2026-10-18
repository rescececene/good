// Pages 고급 모드(_worker.js): /db-test 는 D1 저장 테스트, 그 밖의 주소는 원래 정적 파일 그대로
// 바인딩: 프로젝트 Settings → Bindings → D1 database, 이름 db (또는 DB) → galldb

export default {
  async fetch(req, env) {
    if (!new URL(req.url).pathname.startsWith("/db-test")) return env.ASSETS.fetch(req);  // 구매가이드 · 조합 페이지는 그대로
    const db = env.DB || env.db;
    if (!db) return new Response("D1 연결이 안 됐어요: Settings → Bindings → D1 database, 이름 db, 데이터베이스 galldb", { status: 500 });
    await db.prepare("CREATE TABLE IF NOT EXISTS memo (id INTEGER PRIMARY KEY AUTOINCREMENT, msg TEXT NOT NULL, at TEXT NOT NULL)").run();
    const url = new URL(req.url);

    if (url.pathname === "/db-test/add" && req.method === "POST") {
      const form = await req.formData();
      const msg = String(form.get("msg") || "").trim().slice(0, 100);
      if (msg) await db.prepare("INSERT INTO memo (msg, at) VALUES (?, ?)").bind(msg, new Date().toISOString()).run();
      return Response.redirect(url.origin + "/db-test", 303);
    }
    if (url.pathname === "/db-test/clear" && req.method === "POST") {
      await db.prepare("DELETE FROM memo").run();
      return Response.redirect(url.origin + "/db-test", 303);
    }

    const { results } = await db.prepare("SELECT id, msg, at FROM memo ORDER BY id DESC LIMIT 50").all();
    const cnt = await db.prepare("SELECT COUNT(*) AS n FROM memo").first();
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const rows = results.map((r) => `<li><b>#${r.id}</b> ${esc(r.msg)}<small>${new Date(r.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })}</small></li>`).join("");
    return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>D1 저장 테스트</title><style>
body{margin:0;background:#f2f4f6;font-family:-apple-system,'Malgun Gothic',sans-serif;color:#191f28}
.w{max-width:560px;margin:0 auto;padding:20px 16px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 14px;color:#8b95a1;font-size:13px}
form{display:flex;gap:8px;margin-bottom:12px}input{flex:1;padding:11px 12px;border:1px solid #d1d6db;border-radius:10px;font-size:15px}
button{border:0;border-radius:10px;background:#3b4890;color:#fff;font-weight:800;padding:0 16px;font-size:14px}
.card{background:#fff;border-radius:14px;padding:12px 16px}ul{list-style:none;margin:0;padding:0}
li{padding:9px 0;border-top:1px solid #eee;font-size:15px}li:first-child{border-top:0}li b{color:#3b4890;margin-right:6px}li small{display:block;color:#8b95a1;font-size:12px}
.clr{margin-top:12px}.clr button{background:#c8343e;padding:8px 12px}
</style></head><body><div class="w">
<h1>D1 저장 테스트</h1><p>저장된 줄 수 <b>${cnt.n}</b> · 새로고침해도 남아 있으면 성공</p>
<form method="post" action="/db-test/add"><input name="msg" maxlength="100" placeholder="아무 글이나 입력" required autofocus><button>저장</button></form>
<div class="card"><ul>${rows || "<li><small>아직 저장된 게 없어요</small></li>"}</ul></div>
<form class="clr" method="post" action="/db-test/clear"><button>전부 지우기</button></form>
</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  },
};
