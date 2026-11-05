import Link from "next/link";
import { codeToHtml } from "shiki";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  FileCode2,
  FolderTree,
  GitBranch,
  Github,
  Layers,
  Network,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { Brand, LandingHeader } from "@/components/docs-shell";
import { Button } from "@/components/ui/button";
import { FeatureExplorer } from "@/components/feature-explorer";
import { HeroInteractiveGlow } from "@/components/interactive-glow";
import { InteractivePipeline } from "@/components/interactive-pipeline";
import { InteractiveTerminal } from "@/components/interactive-terminal";
import { LandingInstallBar } from "@/components/landing-install-bar";
import { SpotlightCard } from "@/components/spotlight-card";
import { repository, version } from "@/lib/docs";
import {
  featureShowcases,
  frameworkStats,
  pipelineStages,
  workspaceTree,
} from "@/lib/landing";

export async function LandingPage() {
  // Pre-render syntax highlighted code on server for instantaneous client render
  const renderedShowcases = await Promise.all(
    featureShowcases.map(async (feat) => ({
      ...feat,
      codeHtml: await codeToHtml(feat.code, {
        lang: feat.language,
        themes: { light: "github-light", dark: "github-dark" },
      }),
    }))
  );

  const workspaceHtml = await codeToHtml(workspaceTree, {
    lang: "bash",
    themes: { light: "github-light", dark: "github-dark" },
  });

  const renderedStages = await Promise.all(
    pipelineStages.map(async (stage) => ({
      ...stage,
      codeHtml: await codeToHtml(stage.runtimeSnippet, {
        lang: stage.step === "01" ? "json" : "typescript",
        themes: { light: "github-light", dark: "github-dark" },
      }),
    }))
  );

  return (
    <div className="landing-modern">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {/* Floating Glassmorphic Navbar (NestJS & Next.js inspired) */}
      <LandingHeader />

      <main id="main-content">
        {/* ========================================================================= */}
        {/* HERO SECTION: Glowing Ambient Mesh + Huge Outline Logo + Centered Copy   */}
        {/* ========================================================================= */}
        <section className="hero-modern" aria-labelledby="hero-title">
          {/* Dynamic Living Ambient Orbs reacting to mouse physics */}
          <HeroInteractiveGlow />
          <div className="hero-grid-pattern" aria-hidden="true" />
          {/* Smooth Fade Transition from glow to normal background */}
          <div className="hero-bottom-fade" aria-hidden="true" />

          {/* Giant Outlined Watermark (Next.js inspired) */}
          <div className="hero-watermark-wrapper" aria-hidden="true">
            <svg
              className="hero-watermark-svg"
              viewBox="0 0 1000 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <text
                x="50%"
                y="65%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="hero-watermark-text"
              >
                TSNX
              </text>
            </svg>
          </div>

          <div className="landing-container hero-inner">
            {/* Announcement Pill (Angular & Next.js inspired) */}
            <Link href="/docs/migrating-to-v2" className="hero-badge-pill">
              <span className="badge-sparkle">
                <Sparkles size={12} />
              </span>
              <span className="badge-text">
                TSNX v{version} is now available
              </span>
              <span className="badge-divider" />
              <span className="badge-action">
                Explore what&apos;s new <ArrowRight size={12} />
              </span>
            </Link>

            {/* Main Centered Typography */}
            <h1 id="hero-title" className="hero-title">
              Build with structure.
              <br />
              <span className="hero-title-gradient">
                Ship with confidence.
              </span>
            </h1>

            <p className="hero-subtitle">
              A modern Web API framework and project system for Node.js.
              <br className="hidden sm:inline" />
              Bringing explicit routing, dependency injection, and clean
              application hosting into one unified TypeScript workflow.
            </p>

            {/* Dual CTA Buttons (NestJS inspired) */}
            <div className="hero-actions-row">
              <Button asChild size="lg" className="hero-btn-primary">
                <Link href="/docs/quick-start">
                  Get Started <ArrowRight size={15} />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="hero-btn-secondary"
              >
                <a
                  href={repository}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TSNX repository on GitHub"
                >
                  <Github size={16} />
                  <span>GitHub</span>
                  <ArrowUpRight size={13} className="hero-btn-arrow" />
                </a>
              </Button>
            </div>

            {/* Interactive Package Manager Install Pill (Next.js inspired) */}
            <div className="hero-install-container">
              <LandingInstallBar />
            </div>

            {/* Framework Stats Bar (NestJS bottom metadata row) */}
            <div className="hero-stats-bar">
              {frameworkStats.map((stat, idx) => (
                <div key={idx} className="hero-stat-card">
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-sub">{stat.sub}</span>
                </div>
              ))}
            </div>

            {/* Architectural Motto */}
            <div className="hero-motto">
              <span>&#123; THE STRUCTURED APPLICATION FRAMEWORK FOR NODE.JS &#125;</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE FEATURE SHOWCASE: Tabbed Explorer (Angular & Next.js inspired)*/}
        {/* ========================================================================= */}
        <section
          id="features"
          className="section-features"
          aria-labelledby="features-title"
        >
          <div className="landing-container">
            <div className="section-header-centered">
              <div className="section-eyebrow">
                <Zap size={14} />
                <span>EXPLICIT BY DESIGN</span>
              </div>
              <h2 id="features-title" className="section-title">
                Features that actually solve problems
              </h2>
              <p className="section-description">
                Start with one endpoint. Compose services, validation, and
                documentation as your application grows — with zero magic decorators.
              </p>
            </div>

            {/* Interactive Tabbed Code & Concept Explorer */}
            <FeatureExplorer items={renderedShowcases} />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ARCHITECTURE BENTO GRID: Deep Architectural Capabilities                  */}
        {/* ========================================================================= */}
        <section
          id="architecture"
          className="section-bento"
          aria-labelledby="architecture-title"
        >
          <div className="landing-container">
            <div className="section-header-centered">
              <div className="section-eyebrow">
                <Layers size={14} />
                <span>MODULAR ARCHITECTURE</span>
              </div>
              <h2 id="architecture-title" className="section-title">
                Everything you need to build scalable APIs
              </h2>
              <p className="section-description">
                Deterministic lifecycle, native multi-project boundaries, and
                uncompromising type safety.
              </p>
            </div>

            <div className="bento-grid">
              {/* Bento Card 1: Interactive Request Lifecycle Flow */}
              <SpotlightCard className="bento-wide">
                <div className="bento-card-header">
                  <div className="bento-icon-wrapper">
                    <Network size={20} />
                  </div>
                  <div>
                    <span className="bento-badge">LIFECYCLE PIPELINE</span>
                    <h3 className="bento-card-title">
                      One request. A clear, deterministic path.
                    </h3>
                  </div>
                  <Link
                    href="/docs/introduction#request-journey"
                    className="bento-header-link"
                  >
                    <span>Follow the journey</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
                <p className="bento-card-text">
                  An explicit request context and service scope moves cleanly
                  through every stage, with guaranteed disposal after work settles.
                  Click or tap any stage below to inspect runtime behavior:
                </p>

                {/* Interactive Visual Pipeline Stages */}
                <InteractivePipeline stages={renderedStages} />
              </SpotlightCard>

              {/* Bento Card 2: Native Project System */}
              <SpotlightCard className="bento-split">
                <div className="bento-split-copy">
                  <div className="bento-icon-wrapper">
                    <FolderTree size={20} />
                  </div>
                  <span className="bento-badge">MONOREPO PROJECT SYSTEM</span>
                  <h3 className="bento-card-title">
                    Clear boundaries. Room to grow.
                  </h3>
                  <p className="bento-card-text">
                    Keep your host entrypoint, business modules, and shared types
                    in dedicated projects with names that make sense.
                  </p>

                  <div className="project-layers-list">
                    <div className="project-layer-item">
                      <span className="layer-num">01</span>
                      <div>
                        <strong>Host</strong>
                        <p>The entry point. Configures services and runs the server.</p>
                      </div>
                    </div>
                    <div className="project-layer-item">
                      <span className="layer-num">02</span>
                      <div>
                        <strong>Inventory</strong>
                        <p>A business module with its own isolated public package exports.</p>
                      </div>
                    </div>
                    <div className="project-layer-item">
                      <span className="layer-num">03</span>
                      <div>
                        <strong>SharedKernel</strong>
                        <p>Shared domain primitives and types used across modules.</p>
                      </div>
                    </div>
                  </div>

                  <div className="workspace-footnote">
                    <GitBranch size={15} />
                    <span>
                      Native <code>tsconfig.json</code> project references &amp;{" "}
                      <code>package.json</code> workspaces.
                    </span>
                  </div>

                  <Link
                    href="/docs/project-structure"
                    className="bento-action-link"
                  >
                    <span>Explore the Acme architecture</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="bento-split-visual">
                  <div className="bento-window">
                    <div className="bento-window-bar">
                      <div className="window-dots" aria-hidden="true">
                        <span className="dot dot-red" />
                        <span className="dot dot-yellow" />
                        <span className="dot dot-green" />
                      </div>
                      <span className="window-title">Acme Monorepo</span>
                    </div>
                    <div
                      className="highlighted-code bento-code"
                      dangerouslySetInnerHTML={{ __html: workspaceHtml }}
                    />
                  </div>
                  <div className="project-dependency-chain">
                    <span className="dep-tag dep-host">Host</span>
                    <ArrowRight size={13} className="dep-arrow" />
                    <span className="dep-tag dep-mod">Inventory</span>
                    <ArrowRight size={13} className="dep-arrow" />
                    <span className="dep-tag dep-shared">SharedKernel</span>
                  </div>
                </div>
              </SpotlightCard>

              {/* Bento Card 3: Zero Decorators */}
              <SpotlightCard>
                <div className="bento-icon-wrapper">
                  <ShieldCheck size={20} />
                </div>
                <span className="bento-badge">ZERO RUNTIME MAGIC</span>
                <h3 className="bento-card-title">Pure TypeScript. No experimental flags.</h3>
                <p className="bento-card-text">
                  No <code>experimentalDecorators</code> or <code>emitDecoratorMetadata</code> required.
                  Handler arguments, route paths, and responses are fully typechecked by standard TypeScript.
                </p>
                <div className="bento-pill-tags">
                  <span className="bento-tag">100% Strict Types</span>
                  <span className="bento-tag">Fast Build Times</span>
                  <span className="bento-tag">Zero Polyfills</span>
                </div>
              </SpotlightCard>

              {/* Bento Card 4: High-Performance DI */}
              <SpotlightCard>
                <div className="bento-icon-wrapper">
                  <Cpu size={20} />
                </div>
                <span className="bento-badge">SCOPED IOC ENGINE</span>
                <h3 className="bento-card-title">Automatic disposal of request resources.</h3>
                <p className="bento-card-text">
                  Services registered as <code>scoped</code> exist for the duration of a single HTTP request
                  and are automatically disposed when the response settles, preventing memory leaks.
                </p>
                <div className="bento-pill-tags">
                  <span className="bento-tag">Singleton</span>
                  <span className="bento-tag">Scoped</span>
                  <span className="bento-tag">Transient</span>
                </div>
              </SpotlightCard>

              {/* Bento Card 5: OpenAPI 3.1 & Scalar */}
              <SpotlightCard>
                <div className="bento-icon-wrapper">
                  <Code2 size={20} />
                </div>
                <span className="bento-badge">DOCUMENTATION FIRST</span>
                <h3 className="bento-card-title">Interactive Scalar UI out of the box.</h3>
                <p className="bento-card-text">
                  Export valid OpenAPI 3.1 definitions directly to JSON, or host the beautiful
                  modern Scalar interactive documentation portal with one function call.
                </p>
                <div className="bento-pill-tags">
                  <span className="bento-tag">OpenAPI 3.1</span>
                  <span className="bento-tag">Scalar UI</span>
                  <span className="bento-tag">SDK Generation Ready</span>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* QUICK START CTA SECTION: Terminal Scaffolding Card                        */}
        {/* ========================================================================= */}
        <section className="section-cta" aria-labelledby="cta-title">
          <div className="landing-container">
            <div className="cta-card">
              <div className="cta-ambient-glow" aria-hidden="true" />
              <div className="cta-content">
                <div className="section-eyebrow">
                  <Boxes size={14} />
                  <span>START IN SECONDS</span>
                </div>
                <h2 id="cta-title" className="cta-title">
                  Your next API starts here.
                </h2>
                <p className="cta-text">
                  Scaffold a host with the CLI, run it locally with hot-reloading,
                  and build production-ready services in minutes.
                </p>

                <div className="cta-actions">
                  <Button asChild size="lg" className="hero-btn-primary">
                    <Link href="/docs/quick-start">
                      Follow the Quick Start <ArrowRight size={15} />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="hero-btn-secondary">
                    <Link href="/docs/introduction">Read Introduction</Link>
                  </Button>
                </div>
              </div>

              <div className="cta-terminal-wrapper">
                <InteractiveTerminal />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RELEASE BANNER                                                            */}
        {/* ========================================================================= */}
        <section className="section-release landing-container">
          <div className="release-banner-card">
            <div className="release-banner-icon">
              <Workflow size={24} />
            </div>
            <div className="release-banner-copy">
              <span className="release-tag">v{version} · STABLE PRODUCTION RELEASE</span>
              <h3 className="release-title">
                TSNX {version} is ready for production.
              </h3>
              <p className="release-desc">
                Explore the latest request descriptors, OpenAPI 3.1 Scalar integration,
                and upgraded project scaffolding tools.
              </p>
            </div>
            <Button asChild variant="outline" className="release-btn">
              <Link href="/docs/migrating-to-v2">
                Migration Guide <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODERN FOOTER                                                             */}
      {/* ========================================================================= */}
      <footer className="footer-modern">
        <div className="landing-container footer-inner">
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-tagline">
              A structured, dependable foundation for building production TypeScript APIs.
            </p>
            <span className="footer-copy">MIT License · TSNX</span>
          </div>

          <div className="footer-nav-groups">
            <div className="footer-group">
              <span className="footer-heading">Documentation</span>
              <Link href="/docs/introduction">Introduction</Link>
              <Link href="/docs/quick-start">Quick Start</Link>
              <Link href="/docs/routing">Routing &amp; Middleware</Link>
              <Link href="/docs/dependency-injection">Dependency Injection</Link>
            </div>

            <div className="footer-group">
              <span className="footer-heading">Architecture</span>
              <Link href="/docs/project-structure">Project System</Link>
              <Link href="/docs/declarative-binding">Runtime Binding</Link>
              <Link href="/docs/endpoint-filters">Endpoint Filters</Link>
              <Link href="/docs/openapi">OpenAPI &amp; Scalar</Link>
            </div>

            <div className="footer-group">
              <span className="footer-heading">Ecosystem</span>
              <a href={repository} target="_blank" rel="noreferrer">
                GitHub <ArrowUpRight size={12} />
              </a>
              <a href={`${repository}/issues`} target="_blank" rel="noreferrer">
                Issue Tracker <ArrowUpRight size={12} />
              </a>
              <a href={`${repository}/releases`} target="_blank" rel="noreferrer">
                Releases <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
