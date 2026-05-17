/**
 * Verifies the Tatsu Profile page tree and output files.
 *
 * Usage: node scripts/verify.js
 *
 * - Lists child pages under PARENT_PAGE_ID and checks all 12 exist.
 * - Reports the block count of each child page (flags empty pages).
 * - Checks the 4 required files in outputs/ exist.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const { Client } = require("@notionhq/client");
const { PAGES } = require("./pages");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID;

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error("ERROR: NOTION_TOKEN and PARENT_PAGE_ID must be set in .env.local");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listAllChildren(blockId) {
  const out = [];
  let cursor;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

async function blockCount(pageId) {
  const children = await listAllChildren(pageId);
  return children.length;
}

async function main() {
  let ok = true;

  const children = await listAllChildren(PARENT_PAGE_ID);
  const childPages = children.filter((b) => b.type === "child_page");
  console.log(`Found ${childPages.length} child pages under parent.`);

  const titles = childPages.map((p) => p.child_page.title);
  for (const def of PAGES) {
    const match = childPages.find((p) =>
      p.child_page.title.includes(def.title)
    );
    if (!match) {
      console.log(`MISSING: ${def.title}`);
      ok = false;
      continue;
    }
    const n = await blockCount(match.id);
    const flag = n === 0 ? "  <-- EMPTY!" : "";
    if (n === 0) ok = false;
    console.log(`OK  ${def.icon} ${def.title}  blocks=${n}${flag}`);
    await sleep(300);
  }

  const outputs = [
    "chatgpt_about_me.txt",
    "chatgpt_how_to_respond.txt",
    "claude_personal_preferences.txt",
    "SETUP_GUIDE.md",
  ];
  console.log("\noutputs/ files:");
  for (const f of outputs) {
    const p = path.join(__dirname, "..", "outputs", f);
    const exists = fs.existsSync(p);
    if (!exists) ok = false;
    console.log(`${exists ? "OK " : "MISSING"}  ${f}`);
  }

  console.log(`\nVerification ${ok ? "PASSED" : "FAILED"}.`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
