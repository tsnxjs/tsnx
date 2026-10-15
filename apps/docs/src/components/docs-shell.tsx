"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "../../../../assets/logo.png";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Command } from "cmdk";
import { ArrowDown, ArrowRight, ArrowUp, Box, Command as CommandIcon, ExternalLink, FileText, Github, Menu, Moon, Search, Sun, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { docHref, docs, groups, repository, version } from "@/lib/docs";
import { cn } from "@/lib/utils";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
}

export function Brand() {
  return <Link href="/" className="brand" aria-label="TSNX home"><Image src={logo} alt="" width={44} height={40} className="brand-mark" priority /><span>tsnx<span className="brand-dot">.</span></span></Link>;
}

export function LandingHeader() {
  return <header className="site-header landing-header"><div className="landing-header-inner">
    <Brand />
    <nav className="landing-nav" aria-label="Main navigation">
      <a href="#features" className="landing-section-link">Features</a>
      <a href="#workspace" className="landing-section-link">Project system</a>
      <Link href="/docs/introduction">Documentation <ArrowRight size={13} /></Link>
    </nav>
    <div className="landing-header-actions">
      <a className="landing-github" href={repository} target="_blank" rel="noreferrer" aria-label="TSNX on GitHub"><Github size={18} /></a>
      <ThemeToggle />
      <Button asChild className="landing-header-cta"><Link href="/docs/quick-start">Get started <ArrowRight /></Link></Button>
    </div>
  </div></header>;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return <Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun className="dark:hidden" /><Moon className="hidden dark:block" /></Button>;
}

function SearchDocs() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button className="search-trigger"><Search size={15} /><span>Search documentation...</span><kbd><CommandIcon size={11} /> K</kbd></button></DialogTrigger>
    <DialogContent className="gap-0 overflow-hidden p-0">
      <DialogTitle className="sr-only">Search documentation</DialogTitle>
      <DialogDescription className="sr-only">Search guides and API concepts. Use arrow keys to select a result and Enter to open it.</DialogDescription>
      <Command label="Documentation search">
        <div className="flex items-center gap-3 border-b px-5 pr-12"><Search className="size-4 text-muted-foreground" /><Command.Input autoFocus placeholder="What are you looking for?" className="h-16 w-full bg-transparent text-sm outline-none" /></div>
        <Command.List className="max-h-[55vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-12 text-center text-sm text-muted-foreground">No results found. Try “routing” or “services”.</Command.Empty>
          {groups.map((group) => <Command.Group heading={group} key={group} className="search-group">{docs.filter((doc) => doc.group === group).map((doc) => <Command.Item key={doc.slug} value={`${doc.title} ${doc.description} ${doc.sections.map((s) => `${s.title} ${s.text} ${s.paragraphs?.join(" ") ?? ""} ${s.table?.rows.flat().join(" ") ?? ""}`).join(" ")}`} onSelect={() => { setOpen(false); router.push(docHref(doc.slug)); }} className="search-result"><FileText size={15} /><span>{doc.title}<small>{doc.description}</small></span><ArrowRight size={14} /></Command.Item>)}</Command.Group>)}
        </Command.List>
        <div className="flex items-center gap-4 border-t px-5 py-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> to navigate</span><span>↵ to open</span><span className="ml-auto">esc to close</span></div>
      </Command>
    </DialogContent>
  </Dialog>;
}

function SidebarNavigation({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return <>
    <Link href="/docs/quick-start" className="sidebar-start" onClick={close}><span className="sidebar-start-icon"><Terminal size={16} /></span><span>Start building<small>Your first API in minutes</small></span><ArrowRight size={14} /></Link>
    <nav aria-label="Documentation">{groups.map((group) => <div className="nav-group" key={group}><p>{group}</p>{docs.filter((doc) => doc.group === group).map((doc) => <Link key={doc.slug} href={docHref(doc.slug)} onClick={close} aria-current={pathname === docHref(doc.slug) || pathname === `${docHref(doc.slug)}/` || pathname === "/" && doc.slug === "introduction" ? "page" : undefined} className="sidebar-link">{doc.title}{doc.slug === "quick-start" && <span className="nav-new">START</span>}</Link>)}</div>)}</nav>
    <div className="sidebar-bottom"><span className="flex items-center gap-2"><span className="status-dot" /> Release candidate</span><span>v{version}</span></div>
  </>;
}

function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation"><Menu /></Button></DialogTrigger><DialogContent className="left-0 top-0 h-dvh w-[min(350px,90vw)] max-w-none translate-x-0 overflow-y-auto rounded-none p-6"><DialogTitle className="text-xl font-bold">TSNX Documentation</DialogTitle><DialogDescription className="sr-only">Browse documentation topics</DialogDescription><div><SidebarNavigation close={() => setOpen(false)} /></div></DialogContent></Dialog>;
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><div className="header-inner">
      <MobileNavigation /><Brand /><span className="header-divider" /><span className="header-docs">Documentation</span><span className="version-badge">v1.0 <span>RC</span></span>
      <div className="header-right"><SearchDocs /><a className="header-github" href={repository} target="_blank" rel="noreferrer" aria-label="TSNX on GitHub"><Github size={19} /></a><span className="header-divider secondary" /><ThemeToggle /></div>
    </div></header>
    <div className="docs-layout"><aside className="desktop-sidebar"><SidebarNavigation /></aside><div key={pathname} className="page-container">{children}</div></div>
  </>;
}

export function TableOfContents({ sections }: { sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-80px 0px -65% 0px" });
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);
  return <aside className="toc"><p>On this page</p><nav aria-label="On this page">{sections.map((section) => <a key={section.id} href={`#${section.id}`} className={cn(active === section.id && "active")}>{section.title}</a>)}</nav><div className="toc-links"><a href={`${repository}/issues`} target="_blank" rel="noreferrer">Give us feedback <ExternalLink size={12} /></a><a href={repository} target="_blank" rel="noreferrer">Star on GitHub <Github size={12} /></a></div><div className="toc-card"><Box size={22} /><strong>Less setup.<br />More building.</strong><p>From your first endpoint to a modular application.</p><Link href="/docs/quick-start">Get started <ArrowRight size={13} /></Link></div></aside>;
}

export function CopyButton({ text, label = "Copy code" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timeout = setTimeout(() => setState("idle"), 2200);
    return () => clearTimeout(timeout);
  }, [state]);
  return <button className="copy-button" aria-label={label} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setState("copied"); }
    catch { setState("error"); }
  }}><span aria-live="polite">{state === "copied" ? "Copied!" : state === "error" ? "Select to copy" : "Copy"}</span>{state === "copied" ? <span aria-hidden="true">✓</span> : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" /></svg>}</button>;
}

export function PageFeedback() {
  const [feedback, setFeedback] = useState<string | null>(null);
  return <div className="page-feedback"><span>{feedback ? "Thanks! Your feedback is noted for this visit." : "Was this page helpful?"}</span>{!feedback && <div><Button variant="outline" size="sm" onClick={() => setFeedback("yes")}>Yes, thanks</Button><Button variant="ghost" size="sm" asChild><a href={`${repository}/issues/new`} target="_blank" rel="noreferrer">Suggest a change <ExternalLink /></a></Button></div>}</div>;
}
