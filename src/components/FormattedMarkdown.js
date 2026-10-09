"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal, ExternalLink } from "lucide-react";

/**
 * Parses inline markdown tokens: bold, italic, inline code, links, strikethrough.
 */
function parseInline(text) {
  if (!text) return null;

  // Token pattern to match:
  // 1. Code: `code`
  // 2. Bold+Italic: ***text*** or ___text___
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Strikethrough: ~~text~~
  // 6. Links: [text](url)
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|(?<!\w)\*[^*]+\*(?!\w)|(?<!\w)_[^_]+_(?!\w)|\[([^\]]+)\]\(([^)]+)\))/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];

    if (token.startsWith("`") && token.endsWith("`")) {
      // Inline Code
      const code = token.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className="rounded-md bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs"
        >
          {code}
        </code>
      );
    } else if (
      (token.startsWith("***") && token.endsWith("***")) ||
      (token.startsWith("___") && token.endsWith("___"))
    ) {
      // Bold + Italic
      const inner = token.slice(3, -3);
      parts.push(
        <strong key={match.index} className="font-bold italic text-slate-900 dark:text-white">
          {parseInline(inner)}
        </strong>
      );
    } else if (
      (token.startsWith("**") && token.endsWith("**")) ||
      (token.startsWith("__") && token.endsWith("__"))
    ) {
      // Bold
      const inner = token.slice(2, -2);
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
          {parseInline(inner)}
        </strong>
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      // Italic
      const inner = token.slice(1, -1);
      parts.push(
        <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
          {parseInline(inner)}
        </em>
      );
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      // Strikethrough
      const inner = token.slice(2, -2);
      parts.push(
        <del key={match.index} className="line-through text-slate-400 dark:text-slate-500">
          {parseInline(inner)}
        </del>
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      // Link [label](url)
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#0052CC] dark:text-[#579DFF] hover:underline"
          >
            <span>{label}</span>
            <ExternalLink className="h-3 w-3 inline shrink-0 opacity-70" />
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Code Block with syntax tag and copy button
 */
function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-slate-300">
            {language || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-emerald-300 dark:text-emerald-200">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

/**
 * Clean markdown table renderer
 */
function MarkdownTable({ rows }) {
  if (!rows || rows.length < 2) return null;

  const headerRow = rows[0];
  const isSeparator = (r) => r.every((cell) => /^[:\-\s]+$/.test(cell));
  const dataRows = rows.slice(1).filter((r) => !isSeparator(r));

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200">
          <tr>
            {headerRow.map((cell, idx) => (
              <th key={idx} className="px-3.5 py-2.5">
                {parseInline(cell.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
          {dataRows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={rIdx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30"}
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2 whitespace-normal">
                  {parseInline(cell.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main FormattedMarkdown Component
 */
export default function FormattedMarkdown({ content = "", className = "" }) {
  if (!content || typeof content !== "string") {
    return null;
  }

  // Pre-process: split into lines and parse block structures
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code blocks (```language ... ```)
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: "codeblock",
        language: lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 2. Table (| Col 1 | Col 2 |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const cells = lines[i]
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        tableRows.push(cells);
        i++;
      }
      blocks.push({
        type: "table",
        rows: tableRows,
      });
      continue;
    }

    // 3. Headings (#, ##, ###, ####)
    if (/^#{1,6}\s+/.test(line.trim())) {
      const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const headingText = match[2];
        blocks.push({
          type: "heading",
          level,
          text: headingText,
        });
        i++;
        continue;
      }
    }

    // 4. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 5. Blockquote (> quote)
    if (line.trim().startsWith(">")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "quote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // 6. Unordered List (- item or * item)
    if (/^(\s*)[-*+]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^(\s*)[-*+]\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^(\s*)[-*+]\s+/, "").trim();
        listItems.push(raw);
        i++;
      }
      blocks.push({
        type: "ul",
        items: listItems,
      });
      continue;
    }

    // 7. Ordered List (1. item, 2. item)
    if (/^(\s*)\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^(\s*)\d+\.\s+/.test(lines[i])) {
        const raw = lines[i].replace(/^(\s*)\d+\.\s+/, "").trim();
        listItems.push(raw);
        i++;
      }
      blocks.push({
        type: "ol",
        items: listItems,
      });
      continue;
    }

    // 8. Empty lines
    if (!line.trim()) {
      blocks.push({ type: "break" });
      i++;
      continue;
    }

    // 9. Standard Paragraph (accumulate consecutive non-empty lines)
    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,6}\s+/.test(lines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith(">") &&
      !/^(\s*)[-*+]\s+/.test(lines[i]) &&
      !/^(\s*)\d+\.\s+/.test(lines[i])
    ) {
      pLines.push(lines[i]);
      i++;
    }

    if (pLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: pLines.join(" "),
      });
    }
  }

  return (
    <div className={`formatted-markdown text-slate-800 dark:text-slate-200 leading-relaxed font-sans space-y-2.5 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  className="mt-4 mb-2 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-2"
                >
                  <span className="inline-block h-4 w-1 bg-[#0052CC] rounded-full" />
                  <span>{parseInline(block.text)}</span>
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="mt-3.5 mb-1.5 text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <span className="inline-block h-3.5 w-1 bg-indigo-500 rounded-full" />
                  <span>{parseInline(block.text)}</span>
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={idx}
                  className="mt-3 mb-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
                >
                  <span className="inline-block h-2.5 w-1 bg-blue-400 rounded-full" />
                  <span>{parseInline(block.text)}</span>
                </h3>
              );
            }
            return (
              <h4
                key={idx}
                className="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                {parseInline(block.text)}
              </h4>
            );
          }

          case "paragraph":
            return (
              <p key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {parseInline(block.text)}
              </p>
            );

          case "ul":
            return (
              <ul key={idx} className="my-2 space-y-1.5 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0052CC] dark:bg-[#579DFF]" />
                    <span className="flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={idx} className="my-2 space-y-1.5 pl-1">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/70 text-[10px] font-bold text-[#0052CC] dark:text-[#579DFF] border border-blue-200 dark:border-blue-900 mt-0.5">
                      {itemIdx + 1}
                    </span>
                    <span className="flex-1">{parseInline(item)}</span>
                  </li>
                ))}
              </ol>
            );

          case "quote":
            return (
              <div
                key={idx}
                className="my-2 rounded-r-xl border-l-3 border-[#0052CC] bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500 py-2 px-3.5 text-xs sm:text-sm italic text-slate-700 dark:text-slate-300"
              >
                {parseInline(block.text)}
              </div>
            );

          case "codeblock":
            return <CodeBlock key={idx} language={block.language} code={block.code} />;

          case "table":
            return <MarkdownTable key={idx} rows={block.rows} />;

          case "hr":
            return <hr key={idx} className="my-3 border-slate-200 dark:border-slate-800" />;

          case "break":
            return <div key={idx} className="h-1" />;

          default:
            return null;
        }
      })}
    </div>
  );
}
