import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocPage } from "@/components/doc-page";
import { DocsShell } from "@/components/docs-shell";
import { docs, version } from "@/lib/docs-v1.3.2";

export const dynamicParams = false;
export function generateStaticParams() { return docs.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = docs.find((item) => item.slug === slug);
  return { title: doc?.title ?? "Page not found", description: doc?.description };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs.find((item) => item.slug === slug);
  if (!doc) notFound();
  return <DocsShell docs={docs} version={version} basePath="/v1.3.2/docs"><DocPage doc={doc} allDocs={docs} basePath="/v1.3.2/docs" sourceRef="v1.3.2" /></DocsShell>;
}
