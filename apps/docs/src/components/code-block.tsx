import { codeToHtml } from "shiki";
import { FileCode2, Terminal } from "lucide-react";
import { CopyButton } from "@/components/docs-shell";

export async function CodeBlock({ code, language = "typescript", filename = "src/main.ts" }: { code: string; language?: string; filename?: string }) {
  const html = await codeToHtml(code, { lang: language, themes: { light: "github-light", dark: "github-dark" } });
  return (
    <div className="code-block">
      <div className="code-header">
        <div className="window-dots" aria-hidden="true">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="code-filename">
          {language === "bash" ? <Terminal size={13} className="text-primary" /> : <FileCode2 size={13} className="text-primary" />}
          <span>{filename}</span>
        </div>
        <CopyButton text={code} />
      </div>
      <div className="highlighted-code" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
