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
  const pages = children.filter((b) => b.type === "child_page");
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
];

async function callTool(name: string, args: any): Promise<string> {
  if (name === "search") return JSON.stringify(await toolSearch(args?.query ?? ""));
  if (name === "fetch") return JSON.stringify(await toolFetch(args?.id ?? ""));
  if (name === "get_tatsu_profile") return await toolFullProfile(args?.section);
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
