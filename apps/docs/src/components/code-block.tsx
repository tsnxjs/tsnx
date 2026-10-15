import { codeToHtml } from "shiki";
import { FileCode2, Terminal } from "lucide-react";
import { CopyButton } from "@/components/docs-shell";

export async function CodeBlock({ code, language = "typescript", filename = "src/main.ts" }: { code: string; language?: string; filename?: string }) {
  const html = await codeToHtml(code, { lang: language, themes: { light: "github-light", dark: "github-dark" } });
  return <div className="code-block"><div className="code-header"><span>{language === "bash" ? <Terminal size={14} /> : <FileCode2 size={14} />}{filename}</span><CopyButton text={code} /></div><div className="highlighted-code" dangerouslySetInnerHTML={{ __html: html }} /></div>;
}
