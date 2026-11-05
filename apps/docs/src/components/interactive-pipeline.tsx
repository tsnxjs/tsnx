"use client";

import { useState } from "react";
import { Check, ChevronRight, Copy, Terminal } from "lucide-react";
import { pipelineStages, type PipelineStageItem } from "@/lib/landing";

export type RenderedPipelineStage = PipelineStageItem & {
  codeHtml?: string;
};

export function InteractivePipeline({
  stages = pipelineStages,
}: {
  stages?: RenderedPipelineStage[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const activeStage = stages[activeIdx] ?? stages[0];

  const handleCopy = async () => {
    if (!activeStage) return;
    try {
      await navigator.clipboard.writeText(activeStage.runtimeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="interactive-pipeline-layout">
      {/* Left Column: Interactive Stages Stepper List (Side-by-Side) */}
      <div className="pipeline-stages-col">
        <span className="pipeline-col-label">REQUEST LIFECYCLE STAGES</span>
        <ol
          className="pipeline-stages-list"
          role="tablist"
          aria-label="Request pipeline stages"
        >
          {stages.map((stage, idx) => {
            const isActive = idx === activeIdx;
            return (
              <li
                key={stage.step}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => {
                  setActiveIdx(idx);
                  setCopied(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveIdx(idx);
                    setCopied(false);
                  }
                }}
                className={`pipeline-stage-item ${isActive ? "active" : ""}`}
              >
                <div className="stage-item-left">
                  <span className="stage-num">{stage.step}</span>
                  <div className="stage-item-info">
                    <div className="stage-name-row">
                      <span className="stage-name">{stage.name}</span>
                      <span className="stage-badge-mini">{stage.badge}</span>
                    </div>
                    <span className="stage-summary">{stage.summary}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="stage-arrow" aria-hidden="true" />
              </li>
            );
          })}
        </ol>
      </div>

      {/* Right Column: Live Inspector Panel & Shell Code */}
      <div className="pipeline-inspector-col">
        <div className="pipeline-inspector-header">
          <div className="pipeline-inspector-meta">
            <span className="pipeline-step-pill">
              STAGE {activeStage.step} / 06
            </span>
            <span className="pipeline-badge">{activeStage.badge}</span>
            <h4 className="pipeline-inspector-title">
              {activeStage.name} Phase
            </h4>
          </div>
          <div className="pipeline-inspector-nav">
            <button
              type="button"
              disabled={activeIdx === 0}
              onClick={() => {
                setActiveIdx((prev) => Math.max(0, prev - 1));
                setCopied(false);
              }}
              className="pipeline-nav-btn"
              aria-label="Previous lifecycle stage"
            >
              &larr; Prev
            </button>
            <button
              type="button"
              disabled={activeIdx === stages.length - 1}
              onClick={() => {
                setActiveIdx((prev) =>
                  Math.min(stages.length - 1, prev + 1)
                );
                setCopied(false);
              }}
              className="pipeline-nav-btn"
              aria-label="Next lifecycle stage"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <p className="pipeline-inspector-desc">{activeStage.details}</p>

        {/* Polished IDE Window with Shiki Dual-Theme Highlighting */}
        <div className="pipeline-code-preview">
          <div className="pipeline-code-bar">
            <div className="window-dots" aria-hidden="true">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="pipeline-code-tab">
              <Terminal size={12} className="pipeline-code-tab-icon" />
              <span className="pipeline-code-tab-name">
                ctx · stage_{activeStage.step} ({activeStage.name.toLowerCase()})
              </span>
              <span className="pipeline-code-badge">
                {activeStage.step === "01" ? "JSON" : "TS"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="pipeline-code-copy-btn"
              aria-label="Copy runtime snippet"
              title="Copy snippet"
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

          {activeStage.codeHtml ? (
            <div
              className="highlighted-code pipeline-code-body"
              dangerouslySetInnerHTML={{ __html: activeStage.codeHtml }}
            />
          ) : (
            <pre className="pipeline-pre">
              <code>{activeStage.runtimeSnippet}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
