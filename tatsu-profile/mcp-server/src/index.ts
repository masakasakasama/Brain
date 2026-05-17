import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  type Env,
  searchSections,
  getSection,
  getFullProfile,
} from "./profile";

export class TatsuMCP extends McpAgent<Env> {
  server = new McpServer({ name: "tatsu-profile", version: "1.0.0" });

  async init() {
    const env = this.env;

    this.server.tool(
      "search",
      "Tatsu の個人プロフィール（判断基準・価値観・キャリア・進行中プロジェクト・過去の決定など）から関連セクションを検索する。個人的な判断・推奨・助言が求められたら最初にこれを呼ぶ。",
      { query: z.string().describe("検索クエリ。日本語可。例: '判断基準' 'キャリア'") },
      async ({ query }) => {
        const results = await searchSections(env, query);
        return {
          content: [{ type: "text", text: JSON.stringify({ results }) }],
        };
      }
    );

    this.server.tool(
      "fetch",
      "search が返した id（または セクション名）の本文を全文取得する。",
      { id: z.string().describe("セクションIDまたはタイトル") },
      async ({ id }) => {
        const doc = await getSection(env, id);
        return {
          content: [{ type: "text", text: JSON.stringify(doc) }],
        };
      }
    );

    this.server.tool(
      "get_tatsu_profile",
      "Tatsu のプロフィール全体（12セクション）を一括取得する。section を指定すると該当1セクションのみ。会話開始時や、まとめてコンテキストが要るときに使う。",
      {
        section: z
          .string()
          .optional()
          .describe("任意。例 'Values & Judgment Criteria'。省略時は全体。"),
      },
      async ({ section }) => {
        const text = section
          ? (await getSection(env, section)).text
          : await getFullProfile(env);
        return { content: [{ type: "text", text }] };
      }
    );
  }
}

function firstSegment(pathname: string): string {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

// The auth secret is the first path segment: https://host/<SECRET>/mcp
// Trade-off: this is a bearer-in-URL, not OAuth. Acceptable for a single
// personal connector with an unguessable secret; for stronger isolation put
// Cloudflare Access in front. The secret segment is stripped before the
// request reaches the MCP transport.
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("tatsu-profile-mcp ok", { status: 200 });
    }

    if (!env.AUTH_SECRET || firstSegment(url.pathname) !== env.AUTH_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const rest =
      "/" + url.pathname.split("/").filter(Boolean).slice(1).join("/");
    const rewritten = new Request(
      new URL(rest + url.search, url.origin).toString(),
      request
    );

    if (rest === "/mcp") {
      return TatsuMCP.serve("/mcp").fetch(rewritten, env, ctx);
    }
    if (rest === "/sse" || rest.startsWith("/sse/")) {
      return TatsuMCP.serveSSE("/sse").fetch(rewritten, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
