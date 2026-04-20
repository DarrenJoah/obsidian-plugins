import { MindmapFile } from "../types";
import { FRONTMATTER_KEY, FRONTMATTER_VALUE, FRONTMATTER_COMPAT } from "../constants";

export function hasMindmapFrontmatter(content: string): boolean {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return false;
  const fm = match[1];
  return fm.includes(`${FRONTMATTER_KEY}: ${FRONTMATTER_VALUE}`) ||
         fm.includes(`${FRONTMATTER_KEY}: ${FRONTMATTER_COMPAT}`);
}

export function extractJson(content: string): MindmapFile | null {
  const match = content.match(/```\s*json\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as MindmapFile;
  } catch {
    return null;
  }
}

export function buildMarkdown(data: MindmapFile, frontmatterValue?: string): string {
  const fmVal = frontmatterValue || FRONTMATTER_VALUE;
  const json = JSON.stringify(data);
  return `---\n\n${FRONTMATTER_KEY}: ${fmVal}\n\n---\n\n# Root\n\`\`\` json\n${json}\n\`\`\`\n`;
}
