import { fetchProfile, type Section } from "./notion";

export type Env = {
  NOTION_TOKEN: string;
  PARENT_PAGE_ID: string;
  AUTH_SECRET: string;
};

// Notion allows ~3 req/sec; cache the whole tree to stay well under it.
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; sections: Section[] } | null = null;

async function getAll(env: Env): Promise<Section[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.sections;
  const sections = await fetchProfile(env.NOTION_TOKEN, env.PARENT_PAGE_ID);
  cache = { at: now, sections };
  return sections;
}

function score(query: string, s: Section): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const title = s.title.toLowerCase();
  const text = s.text.toLowerCase();
  let n = 0;
  for (const term of q.split(/\s+/)) {
    if (!term) continue;
    if (title.includes(term)) n += 5;
    const m = text.split(term).length - 1;
    n += Math.min(m, 10);
  }
  return n;
}

export async function searchSections(
  env: Env,
  query: string
): Promise<{ id: string; title: string; snippet: string }[]> {
  const all = await getAll(env);
  const ranked = all
    .map((s) => ({ s, score: score(query, s) }))
    .sort((a, b) => b.score - a.score);
  // If nothing matches, still return all titles so the model can pick.
  const hits = ranked.some((r) => r.score > 0)
    ? ranked.filter((r) => r.score > 0)
    : ranked;
  return hits.map(({ s }) => ({
    id: s.id,
    title: s.title,
    snippet: s.text.slice(0, 240),
  }));
}

export async function getSection(
  env: Env,
  idOrTitle: string
): Promise<{ id: string; title: string; text: string }> {
  const all = await getAll(env);
  const norm = idOrTitle.replace(/-/g, "").toLowerCase();
  const found =
    all.find((s) => s.id.replace(/-/g, "").toLowerCase() === norm) ??
    all.find((s) => s.title.toLowerCase().includes(idOrTitle.toLowerCase()));
  if (!found) {
    return {
      id: idOrTitle,
      title: "(not found)",
      text: `No section matched "${idOrTitle}". Available: ${all
        .map((s) => s.title)
        .join(", ")}`,
    };
  }
  return found;
}

export async function getFullProfile(env: Env): Promise<string> {
  const all = await getAll(env);
  return all.map((s) => `# ${s.title}\n${s.text}`).join("\n\n---\n\n");
}
