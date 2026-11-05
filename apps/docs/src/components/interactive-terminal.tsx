"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface CommandItem {
  cmd: string;
  comment?: string;
}

const commands: CommandItem[] = [
  { cmd: "npx @tsnx/cli new my-api", comment: "# Scaffold a new TSNX workspace" },
  { cmd: "cd my-api", comment: "# Enter project directory" },
  { cmd: "pnpm dev", comment: "# Start host server with hot-reload" }
];

export function InteractiveTerminal() {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState<number | null>(null);

  const copyAll = async () => {
    const text = commands.map((c) => c.cmd).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const copySingle = async (cmd: string, idx: number) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedLine(idx);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  return (
    <div className="interactive-terminal-card">
      <div className="cta-terminal-bar">
        <div className="window-dots" aria-hidden="true">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-muted-foreground" />
          <span className="window-title">bash — quickstart</span>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="terminal-copy-all-btn"
          aria-label="Copy all commands"
          title="Copy all commands"
        >
          {copiedAll ? (
            <>
              <Check size={12} className="text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy all</span>
            </>
          )}
        </button>
      </div>

      <div className="terminal-lines-body">
        {commands.map((item, idx) => (
          <div key={idx} className="terminal-line-row group">
            {item.comment && (
              <span className="terminal-line-comment">{item.comment}</span>
            )}
            <div className="terminal-line-content">
              <span className="terminal-prompt">$</span>
              <span className="terminal-cmd-text">{item.cmd}</span>
              <button
                type="button"
                onClick={() => copySingle(item.cmd, idx)}
                className="terminal-line-copy-btn"
                aria-label={`Copy command ${item.cmd}`}
                title="Copy line"
              >
                {copiedLine === idx ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          </div>
        ))}
        <div className="terminal-ready-indicator">
          <span className="terminal-ready-dot" />
          <span>Ready on http://localhost:3000 (OpenAPI Scalar at /scalar/v1)</span>
        </div>
      </div>
    </div>
  );
}
