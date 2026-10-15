import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocPage } from "@/components/doc-page";
import { docs } from "@/lib/docs";

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
  return <DocPage doc={doc} />;
}
