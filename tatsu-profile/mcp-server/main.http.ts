// Tatsu Profile — remote MCP server (single file, Val Town HTTP val).
//
// Deploy: val.town -> New -> HTTP val -> paste this whole file.
// Secrets: Val Town -> Settings -> Environment Variables:
//   NOTION_TOKEN   = Notion internal integration token (ntn_...)
//   AUTH_SECRET    = long random string used in the connector URL
//   PARENT_PAGE_ID = optional; defaults to the Tatsu Profile page below
//
// Connector URL:  https://<you>-<valname>.web.val.run/<AUTH_SECRET>/mcp
//
// Stateless MCP over Streamable HTTP (JSON responses). Works as a custom
// connector in Claude and ChatGPT. No CLI, no Cloudflare, no GitHub settings.

const DEFAULT_PARENT_PAGE_ID = "36329082-7880-811d-91b6-ca4d9b057b1d";
const CHANGELOG_PAGE_ID = "36429082-7880-81f7-bc3f-ea6e85a8554b";
const DIGEST_PAGE_ID = "36429082-7880-818e-8adb-f57459bb01e1";
const DECISIONS_DB_ID = "9a0ca89ab09f43699b46d7b4966edbc4";
const PROJECTS_DB_ID = "1251d8e7d8fc4eb3b6eb9a25f7a7dc6e";
// Pages excluded from the main profile read (meta pages, not profile content).
const EXCLUDE_TITLES = ["Changelog", "Context Digest"];
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const TTL_MS = 5 * 60 * 1000;

type Section = { id: string; title: string; text: string };
let cache: { at: number; sections: Section[] } | null = null;

function env(name: string): string {
  return (globalThis as any).Deno?.env.get(name) ?? "";
}

function notionHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${NOTION_API}${path}`, {
    headers: notionHeaders(token),
  });
  if (!res.ok) {
    throw new Error(
      `Notion ${res.status} on ${path}: ${(await res.text()).slice(0, 300)}`,
    );
  }
  return res.json();
}

async function notionWrite(
  token: string,
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
): Promise<any> {
  const res = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: notionHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Notion ${res.status} on ${method} ${path}: ${(await res.text()).slice(0, 300)}`,
    );
  }
  return res.json();
}

// Tiny markdown -> Notion blocks (matches the read formatting).
function mdToBlocks(md: string): any[] {
  const rt = (s: string) => [{ type: "text", text: { content: s } }];
  const blocks: any[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") continue;
    if (line.startsWith("### ")) {
      blocks.push({ type: "heading_3", heading_3: { rich_text: rt(line.slice(4)) } });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "heading_2", heading_2: { rich_text: rt(line.slice(3)) } });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "heading_2", heading_2: { rich_text: rt(line.slice(2)) } });
    } else if (line.startsWith("> ")) {
      blocks.push({ type: "quote", quote: { rich_text: rt(line.slice(2)) } });
    } else if (line.startsWith("- ")) {
      blocks.push({
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: rt(line.slice(2)) },
      });
    } else {
      blocks.push({ type: "paragraph", paragraph: { rich_text: rt(line) } });
    }
  }
  return blocks;
}

async function listChildren(token: string, blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const qs = cursor
      ? `?start_cursor=${cursor}&page_size=100`
      : `?page_size=100`;
    const data = await notionGet(token, `/blocks/${blockId}/children${qs}`);
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}

function richText(rich: any[] | undefined): string {
  return (rich ?? []).map((r) => r.plain_text ?? "").join("");
}

async function blocksToText(
  token: string,
  blockId: string,
  depth = 0,
): Promise<string> {
  const blocks = await listChildren(token, blockId);
  const lines: string[] = [];
  for (const b of blocks) {
    const t = b.type;
    const node = b[t];
    if (t === "heading_1") lines.push(`# ${richText(node.rich_text)}`);
    else if (t === "heading_2") lines.push(`## ${richText(node.rich_text)}`);
    else if (t === "heading_3") lines.push(`### ${richText(node.rich_text)}`);
    else if (t === "bulleted_list_item" || t === "numbered_list_item") {
      lines.push(`${"  ".repeat(depth)}- ${richText(node.rich_text)}`);
    } else if (t === "quote") lines.push(`> ${richText(node.rich_text)}`);
    else if (t === "to_do") {
      lines.push(`- [${node.checked ? "x" : " "}] ${richText(node.rich_text)}`);
    } else if (t === "paragraph") {
      const txt = richText(node.rich_text);
      if (txt.trim()) lines.push(txt);
    } else if (t !== "child_page") {
      const txt = node && node.rich_text ? richText(node.rich_text) : "";
      if (txt.trim()) lines.push(txt);
    }
    if (b.has_children && t !== "child_page") {
      lines.push(await blocksToText(token, b.id, depth + 1));
    }
  }
  return lines.filter((l) => l !== "").join("\n");
}

async function getSections(): Promise<Section[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.sections;
  const token = env("NOTION_TOKEN");
  const parent = env("PARENT_PAGE_ID") || DEFAULT_PARENT_PAGE_ID;
  const children = await listChildren(token, parent);
  const pages = children.filter(
    (b) =>
      b.type === "child_page" &&
      !EXCLUDE_TITLES.some((t) => (b.child_page?.title ?? "").includes(t)),
  );
  const sections: Section[] = [];
  for (const p of pages) {
    sections.push({
      id: p.id,
      title: p.child_page?.title ?? "(untitled)",
      text: await blocksToText(token, p.id),
    });
  }
  cache = { at: now, sections };
  return sections;
}

function scoreSection(query: string, s: Section): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let n = 0;
  for (const term of q.split(/\s+/)) {
    if (!term) continue;
    if (s.title.toLowerCase().includes(term)) n += 5;
    n += Math.min(s.text.toLowerCase().split(term).length - 1, 10);
  }
  return n;
}

async function toolSearch(query: string) {
  const all = await getSections();
  const ranked = all
    .map((s) => ({ s, score: scoreSection(query, s) }))
    .sort((a, b) => b.score - a.score);
  const hits = ranked.some((r) => r.score > 0)
    ? ranked.filter((r) => r.score > 0)
    : ranked;
  return {
    results: hits.map(({ s }) => ({
      id: s.id,
      title: s.title,
      snippet: s.text.slice(0, 240),
    })),
  };
}

async function toolFetch(idOrTitle: string) {
  const all = await getSections();
  const norm = idOrTitle.replace(/-/g, "").toLowerCase();
  const found =
    all.find((s) => s.id.replace(/-/g, "").toLowerCase() === norm) ??
    all.find((s) =>
      s.title.toLowerCase().includes(idOrTitle.toLowerCase())
    );
  if (!found) {
    return {
      id: idOrTitle,
      title: "(not found)",
      text: `No section matched "${idOrTitle}". Available: ${
        all.map((s) => s.title).join(", ")
      }`,
    };
  }
  return found;
}

async function toolFullProfile(section?: string) {
  if (section) return (await toolFetch(section)).text;
  const all = await getSections();
  return all.map((s) => `# ${s.title}\n${s.text}`).join("\n\n---\n\n");
}

async function resolveSection(idOrTitle: string): Promise<Section | null> {
  const all = await getSections();
  const norm = idOrTitle.replace(/-/g, "").toLowerCase();
  return (
    all.find((s) => s.id.replace(/-/g, "").toLowerCase() === norm) ??
    all.find((s) => s.title.toLowerCase().includes(idOrTitle.toLowerCase())) ??
    null
  );
}

async function toolAppend(section: string, markdown: string): Promise<string> {
  const sec = await resolveSection(section);
  if (!sec) {
    const all = await getSections();
    return `Section not found: "${section}". Available: ${all.map((s) => s.title).join(", ")}`;
  }
  const token = env("NOTION_TOKEN");
  const blocks = mdToBlocks(markdown);
  if (blocks.length === 0) return "Nothing to append (empty markdown).";
  // Notion caps children at 100 per request.
  for (let i = 0; i < blocks.length; i += 100) {
    await notionWrite(token, "PATCH", `/blocks/${sec.id}/children`, {
      children: blocks.slice(i, i + 100),
    });
  }
  cache = null; // force re-read so subsequent fetches see the change
  await logChangelog("append", `${sec.title}: ${markdown.slice(0, 120)}`);
  return `Appended ${blocks.length} block(s) to "${sec.title}".`;
}

async function toolUpdate(
  section: string,
  find: string,
  replace: string,
): Promise<string> {
  const sec = await resolveSection(section);
  if (!sec) {
    const all = await getSections();
    return `Section not found: "${section}". Available: ${all.map((s) => s.title).join(", ")}`;
  }
  const token = env("NOTION_TOKEN");
  const blocks = await listChildren(token, sec.id);
  for (const b of blocks) {
    const t = b.type;
    const node = b[t];
    if (!node || !node.rich_text) continue;
    const plain = richText(node.rich_text);
    if (!plain.includes(find)) continue;
    const updated = plain.split(find).join(replace);
    await notionWrite(token, "PATCH", `/blocks/${b.id}`, {
      [t]: { rich_text: [{ type: "text", text: { content: updated } }] },
    });
    cache = null;
    await logChangelog("update", `${sec.title}: "${find}" → "${replace}"`);
    return `Updated a ${t} block in "${sec.title}".`;
  }
  return `No block containing "${find}" found in "${sec.title}".`;
}

// ---- Changelog (audit trail). Best-effort; never throws to the caller. ----
async function logChangelog(action: string, detail: string): Promise<void> {
  try {
    const token = env("NOTION_TOKEN");
    const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
    await notionWrite(token, "PATCH", `/blocks/${CHANGELOG_PAGE_ID}/children`, {
      children: [
        {
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              { type: "text", text: { content: `${ts} UTC — ${action}: ${detail}` } },
            ],
          },
        },
      ],
    });
  } catch (_e) {
    // swallow: audit logging must never break a write
  }
}

// ---- remember: route a free-form fact to the right profile section ----
function classifyFact(fact: string): string {
  const f = fact.toLowerCase();
  if (/(決定|決めた|決断|やめた|移行|選んだ|decision)/.test(fact)) {
    return "Key Decisions Log";
  }
  if (/(投資|nisa|株|資産|円|年収|お金|finance|口座|カード)/.test(f) || /投資|資産|年収/.test(fact)) {
    return "Finance & Investments";
  }
  if (/(仕事|転職|異動|キャリア|career|oem|プロジェクト評価)/.test(f) || /仕事|転職|異動|キャリア/.test(fact)) {
    return "Career & Work";
  }
  if (/(健康|筋トレ|サプリ|体重|health|睡眠)/.test(f) || /健康|筋トレ|サプリ|体重/.test(fact)) {
    return "Health & Habits";
  }
  if (/(興味|学習|勉強|趣味|旅行|ドイツ語|interest)/.test(f) || /興味|学習|勉強|趣味|旅行/.test(fact)) {
    return "Interests & Learning";
  }
  if (/(rebecca|パートナー|家族|結婚|relationship)/.test(f) || /パートナー|家族|結婚/.test(fact)) {
    return "Relationships";
  }
  if (/(価値観|判断基準|方針|value)/.test(f) || /価値観|判断基準|方針/.test(fact)) {
    return "Values & Judgment Criteria";
  }
  if (/(プロジェクト|開発|project|アプリ)/.test(f) || /プロジェクト|開発|アプリ/.test(fact)) {
    return "Active Projects";
  }
  return "Key Decisions Log";
}

async function toolRemember(fact: string, sectionHint?: string): Promise<string> {
  const target = sectionHint && sectionHint.trim()
    ? sectionHint
    : classifyFact(fact);
  const date = new Date().toISOString().slice(0, 10);
  const res = await toolAppend(target, `- ${date}: ${fact}`);
  await logChangelog("remember", `→ ${target} : ${fact.slice(0, 120)}`);
  return `${res} (routed to "${target}")`;
}

// ---- Context Digest: compact one-page summary, rebuilt on demand ----
async function buildDigestText(): Promise<string> {
  const all = await getSections();
  const parts: string[] = [
    `# Tatsu Context Digest`,
    `_自動生成: ${new Date().toISOString().slice(0, 16)} UTC_`,
    "",
  ];
  for (const s of all) {
    const lines = s.text
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith(">"))
      .slice(0, 4);
    parts.push(`## ${s.title}`);
    for (const l of lines) parts.push(l.startsWith("#") ? `- ${l.replace(/^#+\s*/, "")}` : l);
    parts.push("");
  }
  return parts.join("\n");
}

async function toolRebuildDigest(): Promise<string> {
  const token = env("NOTION_TOKEN");
  const text = await buildDigestText();
  // Clear existing digest blocks, then write fresh ones.
  const existing = await listChildren(token, DIGEST_PAGE_ID);
  for (const b of existing) {
    try {
      await notionWrite(token, "PATCH", `/blocks/${b.id}`, { archived: true });
    } catch (_e) { /* keep going */ }
  }
  const blocks = mdToBlocks(text);
  for (let i = 0; i < blocks.length; i += 100) {
    await notionWrite(token, "PATCH", `/blocks/${DIGEST_PAGE_ID}/children`, {
      children: blocks.slice(i, i + 100),
    });
  }
  await logChangelog("rebuild_digest", `${blocks.length} blocks`);
  return `Context Digest rebuilt (${blocks.length} blocks).`;
}

async function toolGetDigest(): Promise<string> {
  const token = env("NOTION_TOKEN");
  try {
    const text = await blocksToText(token, DIGEST_PAGE_ID);
    if (text && text.replace(/\s/g, "").length > 40) return text;
  } catch (_e) { /* fall through to rebuild */ }
  await toolRebuildDigest();
  return await blocksToText(token, DIGEST_PAGE_ID);
}

// ---- Structured DB inserts (additive; never affects the read path) ----
async function toolAddDecision(
  decision: string,
  date?: string,
  reason?: string,
  result?: string,
  status?: string,
): Promise<string> {
  const token = env("NOTION_TOKEN");
  const props: any = {
    Decision: { title: [{ text: { content: decision } }] },
  };
  if (date) props.Date = { date: { start: date } };
  if (reason) props.Reason = { rich_text: [{ text: { content: reason } }] };
  if (result) props.Result = { rich_text: [{ text: { content: result } }] };
  if (status) props.Status = { select: { name: status } };
  await notionWrite(token, "POST", `/pages`, {
    parent: { database_id: DECISIONS_DB_ID },
    properties: props,
  });
  await logChangelog("add_decision", decision.slice(0, 120));
  return `Added decision row: "${decision}".`;
}

async function toolAddProject(
  project: string,
  category?: string,
  stack?: string,
  status?: string,
  notes?: string,
): Promise<string> {
  const token = env("NOTION_TOKEN");
  const props: any = {
    Project: { title: [{ text: { content: project } }] },
  };
  if (category) props.Category = { select: { name: category } };
  if (stack) props.Stack = { rich_text: [{ text: { content: stack } }] };
  if (status) props.Status = { select: { name: status } };
  if (notes) props.Notes = { rich_text: [{ text: { content: notes } }] };
  await notionWrite(token, "POST", `/pages`, {
    parent: { database_id: PROJECTS_DB_ID },
    properties: props,
  });
  await logChangelog("add_project", project.slice(0, 120));
  return `Added project row: "${project}".`;
}

// ---- Backup to Val Town blob storage (self-contained, no extra token) ----
async function getBlob(): Promise<any | null> {
  try {
    const mod = await import("https://esm.town/v/std/blob");
    return (mod as any).blob ?? null;
  } catch (_e) {
    return null;
  }
}

async function toolBackupNow(): Promise<string> {
  const blob = await getBlob();
  if (!blob) return "Backup unavailable (blob storage not reachable).";
  const all = await getSections();
  const key = `tatsuprofile-backup-${new Date().toISOString().slice(0, 19)}`;
  await blob.setJSON(key, { at: new Date().toISOString(), sections: all });
  try {
    const keys: any[] = await blob.list("tatsuprofile-backup-");
    const names = keys
      .map((k: any) => k.key ?? k)
      .filter((n: string) => n.startsWith("tatsuprofile-backup-"))
      .sort();
    while (names.length > 14) {
      const old = names.shift()!;
      await blob.delete(old);
    }
  } catch (_e) { /* pruning is best-effort */ }
  await logChangelog("backup", key);
  return `Backup saved: ${key} (${all.length} sections).`;
}

async function toolListBackups(): Promise<string> {
  const blob = await getBlob();
  if (!blob) return "Backup storage not reachable.";
  try {
    const keys: any[] = await blob.list("tatsuprofile-backup-");
    const names = keys.map((k: any) => k.key ?? k).sort().reverse();
    return names.length ? names.join("\n") : "No backups yet.";
  } catch (e) {
    return `Could not list backups: ${(e as Error).message}`;
  }
}

const TOOLS = [
  {
    name: "search",
    description:
      "Tatsu の個人プロフィール（判断基準・価値観・キャリア・進行中プロジェクト・過去の決定など）から関連セクションを検索する。個人的な判断・推奨・助言が求められたら最初に呼ぶ。",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "検索クエリ。日本語可。" } },
      required: ["query"],
    },
  },
  {
    name: "fetch",
    description: "search が返した id（またはセクション名）の本文を全文取得する。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "セクションIDまたはタイトル" } },
      required: ["id"],
    },
  },
  {
    name: "get_tatsu_profile",
    description:
      "Tatsu のプロフィール全体（12セクション）を一括取得する。section を指定すると該当1セクションのみ。",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", description: "任意。省略時は全体。" },
      },
    },
  },
  {
    name: "append_to_section",
    description:
      "指定セクション（サブページ）の末尾に内容を追記する。削除・上書きはしない安全な追加。新しい決定・興味・メモの記録に使う。markdown は ## 見出し / - 箇条書き / > 引用 / 通常行 をサポート。",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          description: "セクション名（例 'Key Decisions Log'）またはID",
        },
        markdown: { type: "string", description: "追記する本文（簡易markdown）" },
      },
      required: ["section", "markdown"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "update_section",
    description:
      "指定セクション内の、find に一致する既存ブロックの文字列を replace に置換する。1ブロックずつ訂正・修正する用途。該当が無ければ何もしない。",
    inputSchema: {
      type: "object",
      properties: {
        section: { type: "string", description: "セクション名またはID" },
        find: { type: "string", description: "既存テキスト（部分一致）" },
        replace: { type: "string", description: "置換後テキスト" },
      },
      required: ["section", "find", "replace"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: "remember",
    description:
      "言われた事実を適切なセクションへ自動振り分けして記録する。雑に「これ覚えといて」用。section を指定すれば強制先指定。",
    inputSchema: {
      type: "object",
      properties: {
        fact: { type: "string", description: "覚えておく事実（自由文）" },
        section: { type: "string", description: "任意。振り分け先を強制する場合" },
      },
      required: ["fact"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "get_digest",
    description:
      "Tatsu の全プロフィールを1ページに圧縮した Context Digest を取得する。会話開始時や、まず素早く全体像が要るときに最初に呼ぶ（get_tatsu_profile より軽い）。",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "rebuild_digest",
    description:
      "Context Digest ページを最新のプロフィールから再生成する。プロフィールを大きく更新した後に呼ぶ。",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "add_decision",
    description:
      "Decisions DB に構造化された意思決定レコードを追加する（日付・理由・結果・ステータス付き）。",
    inputSchema: {
      type: "object",
      properties: {
        decision: { type: "string", description: "決定内容（タイトル）" },
        date: { type: "string", description: "YYYY-MM-DD（任意）" },
        reason: { type: "string", description: "理由（任意）" },
        result: { type: "string", description: "結果（任意）" },
        status: {
          type: "string",
          description: "進行中 / 実行済み / 評価中 / 見送り（任意）",
        },
      },
      required: ["decision"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "add_project",
    description: "Projects DB に構造化されたプロジェクトレコードを追加する。",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "プロジェクト名" },
        category: {
          type: "string",
          description: "個人開発 / 学習 / 旅行 / 仕事（任意）",
        },
        stack: { type: "string", description: "技術スタック（任意）" },
        status: {
          type: "string",
          description: "進行中 / 反復改善中 / 完了 / 構想（任意）",
        },
        notes: { type: "string", description: "メモ（任意）" },
      },
      required: ["project"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "backup_now",
    description:
      "プロフィール全体のスナップショットを Val Town ストレージに保存する（直近14世代を保持）。",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "list_backups",
    description: "保存済みバックアップの一覧を返す。",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
];

async function callTool(name: string, args: any): Promise<string> {
  if (name === "search") return JSON.stringify(await toolSearch(args?.query ?? ""));
  if (name === "fetch") return JSON.stringify(await toolFetch(args?.id ?? ""));
  if (name === "get_tatsu_profile") return await toolFullProfile(args?.section);
  if (name === "append_to_section") {
    return await toolAppend(args?.section ?? "", args?.markdown ?? "");
  }
  if (name === "update_section") {
    return await toolUpdate(args?.section ?? "", args?.find ?? "", args?.replace ?? "");
  }
  if (name === "remember") {
    return await toolRemember(args?.fact ?? "", args?.section);
  }
  if (name === "get_digest") return await toolGetDigest();
  if (name === "rebuild_digest") return await toolRebuildDigest();
  if (name === "add_decision") {
    return await toolAddDecision(
      args?.decision ?? "",
      args?.date,
      args?.reason,
      args?.result,
      args?.status,
    );
  }
  if (name === "add_project") {
    return await toolAddProject(
      args?.project ?? "",
      args?.category,
      args?.stack,
      args?.status,
      args?.notes,
    );
  }
  if (name === "backup_now") return await toolBackupNow();
  if (name === "list_backups") return await toolListBackups();
  throw new Error(`Unknown tool: ${name}`);
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
};

function rpc(id: any, result: any) {
  return { jsonrpc: "2.0", id, result };
}
function rpcErr(id: any, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleRpc(msg: any): Promise<any | null> {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return rpc(id, {
      protocolVersion: params?.protocolVersion ?? "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "tatsu-profile", version: "1.0.0" },
    });
  }
  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return null; // notification: no response
  }
  if (method === "ping") return rpc(id, {});
  if (method === "tools/list") return rpc(id, { tools: TOOLS });
  if (method === "tools/call") {
    try {
      const text = await callTool(params?.name, params?.arguments ?? {});
      return rpc(id, { content: [{ type: "text", text }] });
    } catch (e) {
      return rpc(id, {
        content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
        isError: true,
      });
    }
  }
  return rpcErr(id, -32601, `Method not found: ${method}`);
}

export default async function (req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (url.pathname === "/" || url.pathname === "/health") {
    return new Response("tatsu-profile-mcp ok", {
      status: 200,
      headers: CORS,
    });
  }

  const secret = env("AUTH_SECRET");
  const seg = url.pathname.split("/").filter(Boolean);
  if (!secret || seg[0] !== secret) {
    return new Response("Unauthorized", { status: 401, headers: CORS });
  }
  const rest = "/" + seg.slice(1).join("/");

  if (rest !== "/mcp") {
    return new Response("Not found", { status: 404, headers: CORS });
  }

  if (req.method === "GET") {
    // No server-initiated stream in stateless mode.
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify(rpcErr(null, -32700, "Parse error")), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const out = Array.isArray(body)
    ? (await Promise.all(body.map(handleRpc))).filter((m) => m !== null)
    : await handleRpc(body);

  if (out === null || (Array.isArray(out) && out.length === 0)) {
    return new Response(null, { status: 202, headers: CORS });
  }

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
