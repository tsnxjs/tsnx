"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { installCommands } from "@/lib/landing";

type PkgManager = "npm" | "pnpm" | "bun";

export function LandingInstallBar() {
  const [pm, setPm] = useState<PkgManager>("npm");
  const [copied, setCopied] = useState(false);

  const command = installCommands[pm];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="hero-install-box">
      <div className="hero-install-tabs">
        {(["npm", "pnpm", "bun"] as PkgManager[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setPm(tab)}
            className={`hero-pm-btn ${pm === tab ? "active" : ""}`}
            aria-label={`Select ${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="hero-install-cmd">
        <span className="hero-cmd-prompt">$</span>
        <code>{command}</code>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="hero-copy-btn"
        aria-label="Copy installation command"
      >
        {copied ? (
          <>
            <Check size={13} className="text-emerald-500" />
            <span className="hero-copy-feedback">Copied</span>
          </>
        ) : (
          <>
            <Copy size={13} />
            <span className="hero-copy-feedback">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
