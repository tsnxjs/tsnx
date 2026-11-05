import type { Metadata } from "next";
import logo from "../../../../assets/logo.png";
import { Providers } from "@/components/docs-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TSNX — Build with structure. Ship with confidence.", template: "%s | TSNX Docs" },
  description: "A modern Web API framework and modular project system for Node.js. Explicit routing, native dependency injection, and clean application hosting in one unified TypeScript workflow.",
  keywords: [
    "TSNX",
    "TypeScript",
    "Node.js",
    "Web API framework",
    "dependency injection",
    "OpenAPI 3.1",
    "Scalar",
    "clean architecture",
    "monorepo",
    "project system"
  ],
  authors: [{ name: "TSNX Team" }],
  icons: { icon: { url: logo.src, type: "image/png" } },
  openGraph: {
    title: "TSNX — Build with structure. Ship with confidence.",
    description: "A modern Web API framework and modular project system for Node.js. Explicit routing, dependency injection, and clean application hosting.",
    url: "https://tsnx.dev",
    siteName: "TSNX Framework Documentation",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TSNX — The TypeScript Framework for Structured APIs",
    description: "Explicit routing, native dependency injection, and clean application hosting in one unified TypeScript workflow.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
