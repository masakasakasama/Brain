/**
 * Creates the 12 Tatsu Profile sub-pages under PARENT_PAGE_ID.
 *
 * Usage: node scripts/create_pages.js
 *
 * Safe to re-run: if the parent already has child pages, it warns and aborts
 * unless FORCE=1 is set. Created page IDs are saved to
 * outputs/notion_page_ids.json so a partial run can be inspected.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const { Client } = require("@notionhq/client");
const { PAGES } = require("./pages");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID;
const OUT_FILE = path.join(__dirname, "..", "outputs", "notion_page_ids.json");

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error(
    "ERROR: NOTION_TOKEN and PARENT_PAGE_ID must be set in .env.local " +
      "(copy .env.local.example)."
  );
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry with exponential backoff for transient / rate-limit errors.
async function withRetry(fn, label, max = 5) {
  let delay = 1000;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.code;
      const retryable =
        status === 429 || status === 409 || status === 500 || status === 503;
      if (!retryable || attempt === max) {
        console.error(`FAILED [${label}] (attempt ${attempt}): ${err.message}`);
        throw err;
      }
      console.warn(
        `Retryable error [${label}] attempt ${attempt} (${status}). ` +
          `Waiting ${delay}ms...`
      );
      await sleep(delay);
      delay *= 2;
    }
  }
}

function rich(text) {
  return [{ type: "text", text: { content: text } }];
}

// Tiny markdown dialect -> Notion blocks.
function bodyToBlocks(body) {
  const blocks = [];
  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") continue;
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: rich(line.slice(4)) },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: rich(line.slice(3)) },
      });
    } else if (line.startsWith("> ")) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: rich(line.slice(2)) },
      });
    } else if (line.startsWith("- ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: rich(line.slice(2)) },
      });
    } else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: rich(line) },
      });
    }
  }
  return blocks;
}

async function parentHasChildren() {
  const res = await withRetry(
    () => notion.blocks.children.list({ block_id: PARENT_PAGE_ID, page_size: 5 }),
    "list parent children"
  );
  return res.results.some((b) => b.type === "child_page");
}

async function main() {
  if ((await parentHasChildren()) && process.env.FORCE !== "1") {
    console.warn(
      "WARNING: Parent page already has child pages. Aborting to avoid " +
        "duplicates. Re-run with FORCE=1 to create anyway."
    );
    process.exit(2);
  }

  const created = [];
  for (const page of PAGES) {
    const result = await withRetry(
      () =>
        notion.pages.create({
          parent: { page_id: PARENT_PAGE_ID },
          icon: { type: "emoji", emoji: page.icon },
          properties: {
            title: { title: rich(`${page.icon} ${page.title}`) },
          },
          children: bodyToBlocks(page.body),
        }),
      `create ${page.title}`
    );
    const url = `https://www.notion.so/${result.id.replace(/-/g, "")}`;
    console.log(`OK  ${page.icon} ${page.title}  ${result.id}  ${url}`);
    created.push({ title: page.title, icon: page.icon, id: result.id, url });
    fs.writeFileSync(OUT_FILE, JSON.stringify({ created }, null, 2));
    await sleep(400); // stay under Notion's ~3 req/sec limit
  }

  console.log(`\nDone. ${created.length} pages created.`);
  console.log(`Page IDs saved to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
