import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Clock, Info, Package } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { HeadingAnchor } from "@/components/heading-anchor";
import { PageFeedback, TableOfContents } from "@/components/docs-shell";
import { docs, docHref, repository, version, type Doc } from "@/lib/docs";

export function DocPage({ doc, allDocs = docs, basePath, sourceRef = "main" }: { doc: Doc; allDocs?: Doc[]; basePath?: string; sourceRef?: string }) {
  const index = allDocs.findIndex((item) => item.slug === doc.slug);
  const previous = allDocs[index - 1];
  const next = allDocs[index + 1];
  const href = basePath ? (slug: string) => `${basePath}/${slug}` : docHref;

  const totalWords = doc.sections.reduce((acc, s) => {
    const words = (s.text + " " + (s.paragraphs?.join(" ") ?? "")).trim().split(/\s+/).length;
    return acc + words;
  }, 0);
  const readTime = Math.max(1, Math.ceil(totalWords / 160));

  return <>
    <main id="main-content" className="doc-main">
      <div className="doc-meta-row">
        <div className="breadcrumb"><BookIcon /><span>{doc.group}</span><ChevronRight size={12} /><span>{doc.title}</span></div>
        <div className="doc-meta-badges">
          <span className="doc-read-time"><Clock size={12} /> {readTime} min read</span>
          <span className="doc-version-pill">v{version}</span>
        </div>
      </div>
      <div className="doc-heading"><span className="eyebrow">{doc.group}</span><h1>{doc.title}</h1><p>{doc.description}</p></div>
      <div className="doc-content">
        {doc.sections.map((section) => (
          <section id={section.id} key={section.id} className="doc-section">
            <HeadingAnchor id={section.id} title={section.title} />
            <p>{section.text}</p>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.steps && <ol className="doc-steps">{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
            {section.code && <CodeBlock code={section.code} language={section.language} filename={section.filename} />}
            {section.table && <div className="table-wrapper"><table><thead><tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody></table></div>}
            {section.note && <div className="callout"><Info size={17} /><p>{section.note}</p></div>}
          </section>
        ))}
      </div>
      {doc.related && <section className="related-guides" aria-label="Related guides"><h2>Keep exploring</h2><div>{[...new Set(doc.related)].map((slug) => { const related = allDocs.find((item) => item.slug === slug); return related && <Link key={slug} href={href(slug)}><span>{related.title}<ArrowUpRight size={14} /></span><p>{related.description}</p></Link>; })}</div></section>}
      {doc.sources && <details className="implementation-sources"><summary>Implementation &amp; behavior references</summary><p>These guides describe the TSNX source tree for v{sourceRef}. Follow the matching implementation and regression tests for the exact contracts.</p><ul>{[...new Set([doc.source, ...doc.sources])].map((source) => <li key={source}><a href={`${repository}/blob/${sourceRef}/${source}`} target="_blank" rel="noreferrer">{source}<ArrowUpRight size={11} /></a></li>)}</ul></details>}
      <PageFeedback />
      <div className="page-pagination">{previous ? <Link href={href(previous.slug)}><span><ArrowLeft size={12} /> Previous</span><strong>{previous.title}</strong></Link> : <div />}{next && <Link href={href(next.slug)} className="next"><span>Next <ArrowRight size={12} /></span><strong>{next.title}</strong></Link>}</div>
      <footer className="doc-footer"><span>Built with care. Open source by design.</span><a href={`${repository}/blob/${sourceRef}/${doc.source}`} target="_blank" rel="noreferrer">View source <ArrowUpRight size={12} /></a></footer>
    </main>
    <TableOfContents sections={doc.sections.map(({ id, title }) => ({ id, title }))} />
  </>;
}

function BookIcon() { return <Package size={13} />; }
