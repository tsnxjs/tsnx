"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  FileCode2,
  SlidersHorizontal,
  Terminal,
} from "lucide-react";
import type { FeatureShowcaseItem } from "@/lib/landing";

export type ShowcaseRenderedItem = FeatureShowcaseItem & {
  codeHtml: string;
};

// Lightweight, safe syntax highlighter for JSON preview shell
function highlightJsonLine(rawLine: string) {
  // Escape HTML entities first
  const line = rawLine
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Regex matches:
  // 1. "key": (property key with trailing colon)
  // 2. "string" (string value)
  // 3. true | false | null
  // 4. numbers
  // 5. punctuation { } [ ] , :
  return line.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          const key = match.slice(0, -1);
          return `<span class="json-token-key">${key}</span><span class="json-token-punct">:</span>`;
        }
        return `<span class="json-token-string">${match}</span>`;
      }
      if (/true|false/.test(match)) {
        return `<span class="json-token-bool">${match}</span>`;
      }
      if (/null/.test(match)) {
        return `<span class="json-token-null">${match}</span>`;
      }
      if (/[{}[\],:]/.test(match)) {
        return `<span class="json-token-punct">${match}</span>`;
      }
      return `<span class="json-token-number">${match}</span>`;
    }
  );
}

export function FeatureExplorer({ items }: { items: ShowcaseRenderedItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "routing");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [previewTab, setPreviewTab] = useState<"body" | "headers">("body");

  const current = items.find((item) => item.id === activeId) ?? items[0];

  const handleCopyCode = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyJson = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.preview.details);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore
    }
  };

  const jsonLines = (current.preview.details || "").split("\n");

  const headersList = [
    { key: "status", value: current.preview.status, isStatus: true },
    { key: "content-type", value: "application/json; charset=utf-8" },
    { key: "x-powered-by", value: "tsnx/2.2.0 (node.js)" },
    { key: "x-request-id", value: `req_${current.id}_982a` },
    { key: "date", value: "Wed, 05 Nov 2026 08:38:00 GMT" },
    { key: "cache-control", value: "no-cache, no-store" },
    { key: "connection", value: "keep-alive" },
  ];

  return (
    <div className="showcase-container">
      {/* Tab Navigation Pill Bar (Angular style) */}
      <div
        className="showcase-tabs-wrapper"
        role="tablist"
        aria-label="Feature demonstrations"
      >
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
                  setCopiedCode(false);
                  setCopiedJson(false);
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
            <Link
              href={`/docs/${current.docSlug}`}
              className="showcase-doc-link"
            >
              Read guide: {current.tabLabel} <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right: Modern IDE / Code Window */}
        <div className="showcase-editor">
          {/* Editor Header Bar */}
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
              onClick={handleCopyCode}
              className="editor-copy-btn"
              aria-label="Copy snippet code"
            >
              {copiedCode ? (
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

          {/* Code Body */}
          <div
            className="highlighted-code showcase-code"
            dangerouslySetInnerHTML={{ __html: current.codeHtml }}
          />

          {/* ============================================================= */}
          {/* POLISHED API RESPONSE SHELL                                    */}
          {/* ============================================================= */}
          <div className="api-response-shell">
            {/* Shell Control Bar */}
            <div className="response-shell-bar">
              {/* Endpoint Badge */}
              <div className="response-endpoint-group">
                <span className={`response-method-tag ${current.preview.statusType}`}>
                  {current.preview.method}
                </span>
                <code className="response-endpoint-path">
                  {current.preview.endpoint}
                </code>
              </div>

              {/* Mode Switcher */}
              <div className="response-mode-switch" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === "body"}
                  onClick={() => setPreviewTab("body")}
                  className={`response-tab-btn ${
                    previewTab === "body" ? "active" : ""
                  }`}
                >
                  <span className="response-tab-glyph">&#123;&#125;</span>
                  <span>Response</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewTab === "headers"}
                  onClick={() => setPreviewTab("headers")}
                  className={`response-tab-btn ${
                    previewTab === "headers" ? "active" : ""
                  }`}
                >
                  <SlidersHorizontal size={11} />
                  <span>Headers</span>
                </button>
              </div>

              {/* Status & Metrics */}
              <div className="response-metrics-group">
                {current.preview.latency && (
                  <span className="response-metric-chip latency" title="Response Latency">
                    <span className="metric-dot" />
                    <span>{current.preview.latency}</span>
                  </span>
                )}
                {current.preview.size && (
                  <span className="response-metric-chip size" title="Payload Size">
                    {current.preview.size}
                  </span>
                )}
                <span
                  className={`response-status-badge ${current.preview.statusType}`}
                >
                  <span className="status-indicator-dot" />
                  <span>{current.preview.status}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="response-copy-btn"
                  aria-label="Copy response payload"
                  title="Copy response payload"
                >
                  {copiedJson ? (
                    <Check size={12} className="text-emerald-500" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>

            {/* Shell Body: Syntax-Highlighted JSON or Headers Table */}
            <div className="response-shell-viewport">
              {previewTab === "body" ? (
                <div className="json-shell-table" role="region" aria-label="JSON Response">
                  {jsonLines.map((line, idx) => (
                    <div key={idx} className="json-shell-line">
                      <span className="json-gutter-num" aria-hidden="true">
                        {idx + 1}
                      </span>
                      <span
                        className="json-line-content"
                        dangerouslySetInnerHTML={{
                          __html: highlightJsonLine(line),
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="headers-shell-table" role="region" aria-label="Response Headers">
                  {headersList.map((header, idx) => (
                    <div key={idx} className="headers-shell-line">
                      <span className="header-key-label">{header.key}</span>
                      <span className="header-key-colon">:</span>
                      <span
                        className={`header-val-label ${
                          header.isStatus ? "status-val" : ""
                        }`}
                      >
                        {header.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
