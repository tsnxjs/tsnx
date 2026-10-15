import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Info, Package } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { PageFeedback, TableOfContents } from "@/components/docs-shell";
import { docs, docHref, repository, type Doc } from "@/lib/docs";

export function DocPage({ doc }: { doc: Doc }) {
  const index = docs.findIndex((item) => item.slug === doc.slug);
  const previous = docs[index - 1];
  const next = docs[index + 1];
  return <>
    <main id="main-content" className="doc-main">
      <div className="breadcrumb"><BookIcon /><span>{doc.group}</span><ChevronRight size={12} /><span>{doc.title}</span></div>
      <div className="doc-heading"><span className="eyebrow">{doc.group}</span><h1>{doc.title}</h1><p>{doc.description}</p></div>
      <div className="doc-content">
        {doc.sections.map((section) => (
          <section id={section.id} key={section.id} className="doc-section">
            <h2><a href={`#${section.id}`}>{section.title}<span className="heading-hash" aria-hidden="true">#</span></a></h2>
            <p>{section.text}</p>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.steps && <ol className="doc-steps">{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
            {section.code && <CodeBlock code={section.code} language={section.language} filename={section.filename} />}
            {section.table && <div className="table-wrapper"><table><thead><tr>{section.table.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{i === 0 ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody></table></div>}
            {section.note && <div className="callout"><Info size={17} /><p>{section.note}</p></div>}
          </section>
        ))}
      </div>
      {doc.related && <section className="related-guides" aria-label="Related guides"><h2>Keep exploring</h2><div>{doc.related.map((slug) => { const related = docs.find((item) => item.slug === slug); return related && <Link key={slug} href={docHref(slug)}><span>{related.title}<ArrowUpRight size={14} /></span><p>{related.description}</p></Link>; })}</div></section>}
      {doc.sources && <details className="implementation-sources"><summary>Implementation &amp; behavior references</summary><p>These guides describe the current RC source tree. Follow the implementation and regression tests for the exact contracts.</p><ul>{[doc.source, ...doc.sources].map((source) => <li key={source}><a href={`${repository}/blob/main/${source}`} target="_blank" rel="noreferrer">{source}<ArrowUpRight size={11} /></a></li>)}</ul></details>}
      <PageFeedback />
      <div className="page-pagination">{previous ? <Link href={docHref(previous.slug)}><span><ArrowLeft size={12} /> Previous</span><strong>{previous.title}</strong></Link> : <div />}{next && <Link href={docHref(next.slug)} className="next"><span>Next <ArrowRight size={12} /></span><strong>{next.title}</strong></Link>}</div>
      <footer className="doc-footer"><span>Built with care. Open source by design.</span><a href={`${repository}/blob/main/${doc.source}`} target="_blank" rel="noreferrer">View source <ArrowUpRight size={12} /></a></footer>
    </main>
    <TableOfContents sections={doc.sections.map(({ id, title }) => ({ id, title }))} />
  </>;
}

function BookIcon() { return <Package size={13} />; }
