/**
 * Minimal Markdown → HTML for docs pages (no dependencies).
 * Supports headings, fenced code, lists, paragraphs, inline code, links, bold/italic, tables (simple).
 */
export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const inline = (s: string): string =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" rel="noopener noreferrer">$1</a>',
      );

  while (i < lines.length) {
    let line = lines[i];

    // Strip raw HTML anchors / empty tags so they never appear as escaped text.
    if (/^\s*<a\s+id="[^"]*"\s*><\/a>\s*$/i.test(line)) {
      i++;
      continue;
    }
    line = line.replace(/<a\s+id="[^"]*"\s*><\/a>/gi, "").trimEnd();
    if (!line.trim() && lines[i].includes("<a")) {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        inCode = false;
        const code = escapeHtml(codeBuf.join("\n"));
        const lang = codeLang ? ` data-lang="${escapeAttr(codeLang)}"` : "";
        html.push(
          `<div class="docs-code"><pre class="code-block" tabindex="0"${lang}><code>${code}</code></pre><button type="button" class="btn btn-ghost btn-sm docs-copy-code">Copy</button></div>`,
        );
        codeBuf = [];
        codeLang = "";
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    if (/^#{1,4}\s/.test(line)) {
      closeList();
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s+/, "");
      const id = slugify(text);
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeList();
      html.push("<hr />");
      i++;
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      const type = ul ? "ul" : "ol";
      if (listType !== type) {
        closeList();
        listType = type;
        html.push(`<${type}>`);
      }
      html.push(`<li>${inline((ul ?? ol)![1])}</li>`);
      i++;
      continue;
    }

    if (!line.trim()) {
      closeList();
      i++;
      continue;
    }

    closeList();
    // Table row detection (simple GFM; \| is a literal pipe in cells)
    if (line.includes("|") && lines[i + 1]?.match(/^\|?[\s:-]+\|/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const row = lines[i];
        i++;
        if (/^\|?[\s:-]+\|/.test(row)) continue;
        rows.push(splitTableRow(row));
      }
      if (rows.length) {
        const colCount = rows[0].length;
        html.push('<div class="docs-table-wrap"><table class="docs-table"><thead><tr>');
        rows[0].forEach((c) => html.push(`<th>${inline(c)}</th>`));
        html.push("</tr></thead><tbody>");
        for (const r of rows.slice(1)) {
          html.push("<tr>");
          for (let c = 0; c < colCount; c++) {
            html.push(`<td>${inline(r[c] ?? "")}</td>`);
          }
          html.push("</tr>");
        }
        html.push("</tbody></table></div>");
      }
      continue;
    }

    html.push(`<p>${inline(line)}</p>`);
    i++;
  }
  closeList();
  return html.join("\n");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Split a GFM table row on unescaped `|`, then unescape `\|` → `|`. */
function splitTableRow(row: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let escaped = false;
  const trimmed = row.replace(/^\|/, "").replace(/\|$/, "");
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

export function wireDocsCopyButtons(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>(".docs-copy-code").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pre = btn.parentElement?.querySelector("code");
      const text = pre?.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        const prev = btn.textContent;
        btn.textContent = "Copied";
        window.setTimeout(() => {
          btn.textContent = prev;
        }, 1400);
      } catch {
        btn.textContent = "Select to copy";
      }
    });
  });
}
