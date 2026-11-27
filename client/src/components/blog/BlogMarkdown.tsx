import type { ReactNode } from "react";

// Strict image URL policy: uploaded images are served by our dedicated media
// endpoint. No data:, javascript:, HTML, SVG, or third-party tracking pixels.
const MEDIA_URL = /^\/api\/blog-media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mediaMarkdown(url: string, alt: string, caption: string): string {
  const safeAlt = alt.trim().replace(/[\[\]\r\n]/g, " ").slice(0, 180);
  const safeCaption = caption.trim().replace(/[\r\n]/g, " ").slice(0, 240);
  if (!MEDIA_URL.test(url) || !safeAlt) throw new Error("Invalid image or missing alt text.");
  return `![${safeAlt}](${url})${safeCaption ? "\n\n*" + safeCaption + "*" : ""}`;
}

export function insertAfterHeading(markdown: string, heading: string, insertion: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  // Match only actual headings, not references within a paragraph or fenced block.
  let fenced = false;
  let position = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fenced = !fenced; continue; }
    if (!fenced && /^#{1,6}\s+/.test(lines[i]) &&
        lines[i].replace(/^#{1,6}\s+/, "").trim().toLowerCase().includes(heading.toLowerCase())) {
      position = i;
      break;
    }
  }
  if (position < 0) throw new Error("Section 4 was not found. Choose another insertion position.");
  // Insert before the next same or higher-level main section, preserving the
  // entire conceptual model/diagram already in Section 4.
  const level = (lines[position].match(/^#+/)?.[0].length ?? 2);
  let next = lines.length;
  fenced = false;
  for (let i = position + 1; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) { fenced = !fenced; continue; }
    const m = !fenced && lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= level) { next = i; break; }
  }
  lines.splice(next, 0, "", insertion, "");
  return lines.join("\n");
}

const parseInline = (text: string): ReactNode[] => {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g);
  return tokens.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="text-amber-200 bg-white/10 px-1 rounded">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-amber-300 underline break-all">{link[1]}</a>;
    return part;
  });
};

export default function BlogMarkdown({ body }: { body: string }) {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const output: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) {
      const language = line.replace(/^\s*```/, "").trim().slice(0, 32);
      const block: string[] = []; i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) block.push(lines[i++]);
      if (i < lines.length) i++;
      output.push(<pre key={output.length} className="bg-black/35 border border-white/10 rounded-xl p-4 my-5 overflow-x-auto text-sm text-white/85"><code data-language={language}>{block.join("\n")}</code></pre>);
      continue;
    }
    const img = line.trim().match(/^!\[([^\]\r\n]{1,180})\]\((\/api\/blog-media\/[0-9a-f-]+)\)$/);
    if (img && MEDIA_URL.test(img[2])) {
      let caption = "";
      if (i + 2 < lines.length && !lines[i+1].trim() && /^\*[^*]+\*$/.test(lines[i+2].trim())) {
        caption = lines[i+2].trim().slice(1, -1); i+=2;
      }
      output.push(<figure key={output.length} className="my-8">
        <img loading="lazy" decoding="async" src={img[2]} alt={img[1]} className="block w-full h-auto rounded-xl border border-white/10" />
        {caption && <figcaption className="mt-2 text-center text-sm text-white/55">{caption}</figcaption>}
      </figure>); i++; continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const klass = level===1 ? "text-3xl" : level===2 ? "text-2xl" : "text-lg";
      output.push(<div key={output.length} role="heading" aria-level={level} className={`${klass} font-bold text-white mt-9 mb-4`}>{parseInline(heading[2])}</div>);
      i++;continue;
    }
    if (/^\s*---\s*$/.test(line)) { output.push(<hr key={output.length} className="my-7 border-white/10"/>); i++;continue; }
    if (/^\s*[-*] /.test(line) || /^\s*\d+\. /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line);const items:string[]=[];
      while (i<lines.length && (ordered ? /^\s*\d+\. /.test(lines[i]): /^\s*[-*] /.test(lines[i]))) {
        items.push(lines[i].replace(ordered?/^\s*\d+\. /:/^\s*[-*] /,""));i++;
      }
      const children = items.map((v,j)=><li key={j} className="my-1">{parseInline(v)}</li>);
      output.push(ordered?<ol key={output.length} className="list-decimal ml-5 my-4 text-white/75">{children}</ol>:<ul key={output.length} className="list-disc ml-5 my-4 text-white/75">{children}</ul>);
      continue;
    }
    if (line.trim().startsWith("|") && i+1<lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i+1])) {
      const cells=(s:string)=>s.trim().replace(/^\||\|$/g,"").split("|").map(x=>x.trim());
      const head=cells(lines[i]);i+=2;const rows:string[][]=[];
      while(i<lines.length&&lines[i].trim().startsWith("|"))rows.push(cells(lines[i++]));
      output.push(<div key={output.length} className="my-5 overflow-x-auto"><table className="w-full text-left text-sm border-collapse"><thead><tr>{head.map((v,j)=><th key={j} className="p-2 border border-white/20 text-amber-200">{parseInline(v)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{head.map((_,k)=><td key={k} className="p-2 border border-white/15 text-white/75">{parseInline(row[k]??"")}</td>)}</tr>)}</tbody></table></div>);continue;
    }
    if (line.startsWith("> ")) { output.push(<blockquote key={output.length} className="border-l-4 border-amber-400 pl-4 italic text-white/70 my-5">{parseInline(line.slice(2))}</blockquote>);i++;continue; }
    const paragraph:string[]=[];
    while (i<lines.length && lines[i].trim() && !/^\s*```|^#{1,6}\s|^\s*[-*] |^\s*\d+\. |^\s*---\s*$|^!\[/.test(lines[i])) paragraph.push(lines[i++]);
    if (paragraph.length) output.push(<p key={output.length} className="text-white/75 leading-relaxed my-4">{parseInline(paragraph.join(" "))}</p>);
    else i++;
  }
  return <div className="min-w-0 break-words" data-testid="blog-markdown-rendered">{output}</div>;
}
