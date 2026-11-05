"use client";

import { useState } from "react";
import { Check, Hash } from "lucide-react";

export function HeadingAnchor({ id, title }: { id: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    try {
      await navigator.clipboard.writeText(url);
      window.history.pushState(null, "", `#${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.hash = id;
    }
  };

  return (
    <h2>
      <a href={`#${id}`} onClick={handleCopy} className="heading-anchor-link">
        <span>{title}</span>
        <span className="heading-hash" aria-hidden="true">
          {copied ? <Check size={14} className="text-emerald-500" /> : <Hash size={14} />}
        </span>
        {copied && <span className="anchor-copied-tooltip">Link copied!</span>}
      </a>
    </h2>
  );
}
