import type { Metadata } from "next";
import logo from "../../../../assets/logo.png";
import { Providers } from "@/components/docs-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TSNX — Build with structure. Ship with confidence.", template: "%s | TSNX Docs" },
  description: "Learn TSNX, the TypeScript and Node.js Web API framework. Guides for routing, dependency injection, middleware, OpenAPI, and application hosting.",
  icons: { icon: { url: logo.src, type: "image/png" } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>;
}
