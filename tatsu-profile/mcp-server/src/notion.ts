// Minimal Notion REST client (fetch-based, Workers-compatible).

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

async function notionGet(token: string, path: string): Promise<any> {
  const res = await fetch(`${NOTION_API}${path}`, { headers: headers(token) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function listChildren(token: string, blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : `?page_size=100`;
    const data = await notionGet(token, `/blocks/${blockId}/children${qs}`);
    out.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}

function richToText(rich: any[] | undefined): string {
  if (!rich) return "";
  return rich.map((r) => r.plain_text ?? "").join("");
}

// Flatten a page's blocks into readable Markdown-ish text.
async function blocksToText(token: string, blockId: string, depth = 0): Promise<string> {
  const blocks = await listChildren(token, blockId);
  const lines: string[] = [];
  for (const b of blocks) {
    const t = b.type;
    const node = b[t];
    switch (t) {
      case "heading_1":
        lines.push(`# ${richToText(node.rich_text)}`);
        break;
      case "heading_2":
        lines.push(`## ${richToText(node.rich_text)}`);
        break;
      case "heading_3":
        lines.push(`### ${richToText(node.rich_text)}`);
        break;
      case "bulleted_list_item":
      case "numbered_list_item":
        lines.push(`${"  ".repeat(depth)}- ${richToText(node.rich_text)}`);
        break;
      case "quote":
        lines.push(`> ${richToText(node.rich_text)}`);
        break;
      case "to_do":
        lines.push(`- [${node.checked ? "x" : " "}] ${richToText(node.rich_text)}`);
        break;
      case "paragraph": {
        const txt = richToText(node.rich_text);
        if (txt.trim()) lines.push(txt);
        break;
      }
      case "child_page":
        // handled by the caller as a section, skip inline
        break;
      default: {
        const txt = node && node.rich_text ? richToText(node.rich_text) : "";
        if (txt.trim()) lines.push(txt);
      }
    }
    if (b.has_children && t !== "child_page") {
      lines.push(await blocksToText(token, b.id, depth + 1));
    }
  }
  return lines.filter((l) => l !== "").join("\n");
}

export type Section = { id: string; title: string; text: string };

// Lists the child pages of the parent and returns each as a Section.
export async function fetchProfile(
  token: string,
  parentId: string
): Promise<Section[]> {
  const children = await listChildren(token, parentId);
  const pages = children.filter((b) => b.type === "child_page");
  const sections: Section[] = [];
  for (const p of pages) {
    const title: string = p.child_page?.title ?? "(untitled)";
    const text = await blocksToText(token, p.id);
    sections.push({ id: p.id, title, text });
  }
  return sections;
}
