"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Copy, FileCode2 } from "lucide-react";
import type { FeatureShowcaseItem } from "@/lib/landing";

export type ShowcaseRenderedItem = FeatureShowcaseItem & {
  codeHtml: string;
};

export function FeatureExplorer({ items }: { items: ShowcaseRenderedItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "routing");
  const [copied, setCopied] = useState(false);

  const current = items.find((item) => item.id === activeId) ?? items[0];

  const handleCopy = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="showcase-container">
      {/* Tab Navigation Pill Bar (Angular style) */}
      <div className="showcase-tabs-wrapper" role="tablist" aria-label="Feature demonstrations">
        <div className="showcase-tabs">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveId(item.id);
                  setCopied(false);
                }}
                className={`showcase-tab ${isActive ? "active" : ""}`}
              >
                <span>{item.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Interactive Card */}
      <div className="showcase-card">
        {/* Left: Explanatory Copy */}
        <div className="showcase-copy">
          <span className="showcase-tag">{current.tag}</span>
          <h3 className="showcase-title">{current.title}</h3>
          <p className="showcase-desc">{current.description}</p>

          <ul className="showcase-highlights">
            {current.highlights.map((highlight, idx) => (
              <li key={idx}>
                <CheckCircle2 size={15} className="showcase-check" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <div className="showcase-action">
            <Link href={`/docs/${current.docSlug}`} className="showcase-doc-link">
              Read guide: {current.tabLabel} <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right: Modern IDE / Code Window */}
        <div className="showcase-editor">
          <div className="showcase-editor-header">
            <div className="window-dots" aria-hidden="true">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="editor-tab">
              <FileCode2 size={13} className="editor-file-icon" />
              <span>{current.filename}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="editor-copy-btn"
              aria-label="Copy snippet code"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div
            className="highlighted-code showcase-code"
            dangerouslySetInnerHTML={{ __html: current.codeHtml }}
          />

          {/* Interactive Response / Output Preview Pill */}
          <div className="showcase-preview-bar">
            <div className="preview-endpoint">
              <span className={`preview-method ${current.preview.statusType}`}>
                {current.preview.method}
              </span>
              <code>{current.preview.endpoint}</code>
            </div>
            <span className={`preview-status ${current.preview.statusType}`}>
              {current.preview.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
