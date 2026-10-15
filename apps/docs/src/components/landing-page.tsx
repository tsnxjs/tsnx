import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Blocks, Braces, ChevronRight, FileCode2,
  GitBranch, Github, Layers3, Network, Plug, Route, Terminal, Workflow,
} from "lucide-react";
import { Brand, CopyButton, LandingHeader } from "@/components/docs-shell";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/code-block";
import { repository, version } from "@/lib/docs";
import { installCommand, landingExample, workspaceTree } from "@/lib/landing";

const features = [
  { icon: Route, title: "Routes that read like your API.", text: "Map endpoints, compose middleware, and group related routes. Keep the HTTP contract close to the handler.", code: "app.mapGroup('/inventory')", href: "routing", label: "Routing & middleware" },
  { icon: Braces, title: "Types meet the real request.", text: "Bind JSON, query strings, and route values with explicit runtime schemas and inferred TypeScript arguments.", code: "body({ name: String })", href: "declarative-binding", label: "Runtime model binding" },
  { icon: Blocks, title: "The right service. The right scope.", text: "Typed tokens, explicit constructor dependencies, and singleton, scoped, or transient lifetimes. No decorators required.", code: "services.addScoped(Repository)", href: "dependency-injection", label: "Dependency injection" },
  { icon: Plug, title: "Behavior you can compose.", text: "Inspect bound arguments, apply reusable validation, or short-circuit a handler with group and endpoint filters.", code: ".addEndpointFilter(validate)", href: "endpoint-filters", label: "Endpoint filters" },
  { icon: Workflow, title: "A lifecycle you can follow.", text: "Coordinated startup and shutdown, request cancellation, explicit deadlines, and owned-resource disposal.", code: "ctx.request.signal", href: "lifecycle", label: "Hosting & lifecycle" },
  { icon: FileCode2, title: "Your contracts, in the open.", text: "Generate OpenAPI 3.1 from descriptors and metadata. Add Scalar when you want an interactive API reference.", code: "mapOpenApi(app)", href: "openapi", label: "OpenAPI & Scalar" },
];

const requestStages = ["HTTP request", "Middleware", "Routing", "Binding & filters", "Your handler", "HTTP result"];

export function LandingPage() {
  return <div className="landing">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <LandingHeader />
    <main id="main-content">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-grid" aria-hidden="true" />
        <div className="landing-container landing-hero-content">
          <div className="landing-hero-copy">
            <Link className="landing-release-link" href="/docs/rc-features"><span className="status-dot" /> v{version}<span className="release-divider" /> Meet the release candidate <ArrowRight size={13} /></Link>
            <p className="landing-eyebrow">THE TYPESCRIPT APPLICATION FRAMEWORK</p>
            <h1 id="landing-title">Build with structure.<br /><span>Ship with confidence.</span></h1>
            <p className="landing-hero-description">Familiar application architecture.<br />Native TypeScript. A foundation that grows with you.</p>
            <p className="landing-hero-detail">A Web API framework and project system for Node.js, bringing explicit routing, dependency injection, and application hosting into one connected workflow.</p>
            <div className="landing-hero-buttons">
              <Button asChild><Link href="/docs/quick-start">Get started <ArrowRight /></Link></Button>
              <Button variant="outline" asChild><a href={repository} target="_blank" rel="noreferrer"><Github /> View on GitHub <ArrowUpRight /></a></Button>
            </div>
            <div className="landing-install"><Terminal size={15} aria-hidden="true" /><code>{installCommand}</code><CopyButton text={installCommand} label="Copy CLI installation command" /></div>
          </div>
          <div className="landing-hero-example">
            <div className="landing-example-label"><span><span className="example-dot" /> A small API. A solid start.</span><span>TypeScript</span></div>
            <CodeBlock code={landingExample} filename="src/main.ts" />
            <div className="landing-example-response"><span className="response-method">POST</span><code>/warehouses</code><span className="example-response-label">Example response</span><span className="response-status">201 Created</span></div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-features landing-container" aria-labelledby="features-title">
        <div className="landing-section-heading"><div><p className="landing-eyebrow">EXPLICIT BY DESIGN</p><h2 id="features-title">The pieces your API needs.<br /><span>Already working together.</span></h2></div><p>Start with one endpoint. Add services, validation, and documentation as your application grows.</p></div>
        <div className="landing-feature-grid">{features.map(({ icon: Icon, ...feature }) => <Link key={feature.href} href={`/docs/${feature.href}`} className="landing-feature">
          <div className="landing-feature-top"><span><Icon size={19} /></span><ArrowUpRight size={16} /></div>
          <p className="landing-feature-label">{feature.label}</p><h3>{feature.title}</h3><p>{feature.text}</p><code>{feature.code}</code>
        </Link>)}</div>
      </section>

      <section className="landing-flow-section" aria-labelledby="flow-title"><div className="landing-container">
        <div className="landing-flow-heading"><span className="landing-flow-icon"><Network size={22} /></span><div><h2 id="flow-title">One request. A clear path.</h2><p>An explicit context and service scope through the pipeline, with cleanup after handler work settles.</p></div><Link href="/docs/introduction#request-journey">Follow the lifecycle <ArrowUpRight size={14} /></Link></div>
        <ol className="landing-request-flow">{requestStages.map((stage, index) => <li key={stage}><span className="request-stage-index">0{index + 1}</span><span>{stage}</span>{index < requestStages.length - 1 && <ChevronRight size={14} aria-hidden="true" />}</li>)}</ol>
      </div></section>

      <section id="workspace" className="landing-workspace landing-container" aria-labelledby="workspace-title">
        <div className="landing-workspace-copy"><p className="landing-eyebrow">NATIVE PROJECTS. CLEAR BOUNDARIES.</p><h2 id="workspace-title">A small workspace.<br /><span>Room to grow.</span></h2><p>Keep your host, business modules, and shared types in projects with names that make sense. Acme starts with just three.</p>
          <div className="landing-project-roles"><div><span>01</span><p><strong>Host</strong>The entry point. Configure services and start your API.</p></div><div><span>02</span><p><strong>Inventory</strong>A business module with its own public package exports.</p></div><div><span>03</span><p><strong>SharedKernel</strong>The shared types and primitives your modules need.</p></div></div>
          <p className="landing-native-note"><GitBranch size={16} /><span>Native <code>tsconfig.json</code> references and <code>package.json</code> workspaces. Familiar tools, explicit dependencies.</span></p>
          <Link className="landing-text-link" href="/docs/project-structure">Explore the Acme structure <ArrowRight size={15} /></Link>
        </div>
        <div className="landing-workspace-visual"><CodeBlock code={workspaceTree} language="bash" filename="Acme/" /><div className="landing-dependencies"><span>Host</span><ArrowRight size={14} /><span>Inventory</span><ArrowRight size={14} /><span>SharedKernel</span></div></div>
      </section>

      <section className="landing-start-section" aria-labelledby="start-title"><div className="landing-container landing-start-layout">
        <div><p className="landing-eyebrow">FROM EMPTY FOLDER TO FIRST REQUEST</p><h2 id="start-title">Your next idea<br />starts here.</h2><p>Scaffold a host with the CLI, run it locally, and build from there. The guides explain the contracts behind every feature.</p><Link className="landing-text-link" href="/docs/quick-start">Follow the quick start <ArrowRight size={15} /></Link></div>
        <CodeBlock code={`${installCommand}\n\ntsnx create webapi Host\n\ncd Host\ntsnx run`} language="bash" filename="Terminal" />
      </div></section>

      <section className="landing-release-section landing-container" aria-labelledby="release-title"><div className="landing-release-copy"><span className="landing-release-icon"><Layers3 size={24} /></span><div><p className="landing-eyebrow">v{version} · RELEASE CANDIDATE</p><h2 id="release-title">Built in the open. Better with feedback.</h2><p>Explore the implemented features and current boundaries. Try the RC, read the source, and help shape what comes next.</p></div></div><Button variant="outline" asChild><Link href="/docs/rc-features">Explore the RC <ArrowRight /></Link></Button></section>
    </main>
    <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-brand"><Brand /><p>A thoughtful foundation for TypeScript APIs.</p></div><nav aria-label="Footer navigation"><Link href="/docs/introduction">Documentation</Link><Link href="/docs/quick-start">Quick start</Link><a href={repository} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a><a href={`${repository}/issues`} target="_blank" rel="noreferrer">Feedback <ArrowUpRight size={12} /></a></nav><span className="landing-license">MIT · TSNX</span></div></footer>
  </div>;
}
