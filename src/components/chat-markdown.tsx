import React from "react";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
  isMe?: boolean;
}

export function ChatMarkdown({ content, className, isMe = false }: ChatMarkdownProps) {
  if (!content) return null;

  // Split content into blocks (paragraphs, tables, lists, headers)
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

    // Filter out separator row (e.g. |---|---|)
    const validRows = rows.filter((r) => !r.every((c) => /^[-:\s]+$/.test(c)));
    if (validRows.length > 0) {
      const header = validRows[0];
      const body = validRows.slice(1);

      elements.push(
        <div
          key={`table-${elements.length}`}
          className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-card/80 shadow-sm"
        >
          <table className="w-full text-left text-xs border-collapse">
            {header.length > 0 && (
              <thead>
                <tr className="border-b border-border/80 bg-secondary/60">
                  {header.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 font-bold text-foreground">
                      {renderInlineFormatting(col, isMe)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="border-b border-border/40 last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-foreground/90 align-top">
                      {renderInlineFormatting(cell, isMe)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    tableBuffer = [];
    inTable = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    } else if (inTable) {
      flushTable();
    }

    // Empty lines
    if (!trimmed) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4
          key={`h3-${index}`}
          className={cn(
            "mt-3 mb-1 text-sm font-bold tracking-tight",
            isMe ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {renderInlineFormatting(trimmed.slice(4), isMe)}
        </h4>,
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3
          key={`h2-${index}`}
          className={cn(
            "mt-3 mb-1 text-base font-bold tracking-tight",
            isMe ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {renderInlineFormatting(trimmed.slice(3), isMe)}
        </h3>,
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2
          key={`h1-${index}`}
          className={cn(
            "mt-4 mb-1 text-lg font-bold tracking-tight",
            isMe ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {renderInlineFormatting(trimmed.slice(2), isMe)}
        </h2>,
      );
      return;
    }

    // Bullet list item
    if (/^[-*•]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*•]\s+/, "");
      elements.push(
        <div key={`li-${index}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm pl-1">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
          <div className="flex-1 leading-relaxed">{renderInlineFormatting(itemText, isMe)}</div>
        </div>,
      );
      return;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        elements.push(
          <div key={`nli-${index}`} className="flex items-start gap-2 my-1 text-xs sm:text-sm pl-1">
            <span
              className={cn(
                "inline-grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold mt-0.5",
                isMe ? "bg-white/20 text-white" : "bg-primary/10 text-primary",
              )}
            >
              {match[1]}
            </span>
            <div className="flex-1 leading-relaxed">{renderInlineFormatting(match[2], isMe)}</div>
          </div>,
        );
        return;
      }
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${index}`} className="my-1 text-xs sm:text-sm leading-relaxed break-words">
        {renderInlineFormatting(trimmed, isMe)}
      </p>,
    );
  });

  if (inTable) {
    flushTable();
  }

  return <div className={cn("space-y-0.5", className)}>{elements}</div>;
}

function renderInlineFormatting(text: string, isMe: boolean): React.ReactNode {
  // Convert markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const codeRegex = /`([^`]+)`/g;

  // Simple parser: split by tokens
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  // Replace <br> or <br/> with space
  remaining = remaining.replace(/<br\s*\/?>/gi, " ");

  // Tokenize bold, links, and code
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const tokens = remaining.split(tokenRegex);

  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong
          key={i}
          className={cn(
            "font-semibold",
            isMe ? "text-primary-foreground font-bold" : "text-foreground font-bold",
          )}
        >
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code
          key={i}
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-mono font-medium",
            isMe ? "bg-white/20 text-white" : "bg-secondary text-primary",
          )}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline font-medium hover:opacity-80 transition-opacity",
            isMe ? "text-white" : "text-primary",
          )}
        >
          {linkMatch[1]}
        </a>
      );
    }
    return token;
  });
}
