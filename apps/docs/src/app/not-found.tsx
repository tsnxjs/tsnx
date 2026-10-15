import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main id="main-content" className="not-found"><span className="eyebrow">404 · PAGE NOT FOUND</span><h1>A little off the path.</h1><p>This page doesn’t exist. Let’s get you back to the docs.</p><Button asChild><Link href="/docs/introduction"><ArrowLeft /> Back to documentation</Link></Button></main>;
}
