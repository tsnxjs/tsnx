# TSNX documentation

Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui (Radix), with Shiki syntax highlighting and local full-text search.

## Development

Requires Node.js >=20.9 and the repository's pnpm version.

```bash
pnpm install
pnpm --filter @tsnx/docs dev
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/docs/introduction for documentation. API examples with a fixed port use port 5000 to avoid colliding with the docs server.

## Validation and production

```bash
pnpm --filter @tsnx/docs typecheck
pnpm --filter @tsnx/docs build
```

The build exports static HTML to `apps/docs/out`. Serve that directory with any static host supporting directory index pages and a 404 page. `next start` is not used for this static export. Scripts use Next.js's supported Webpack bundler because Turbopack's IPC port binding is unavailable in restricted environments.

## Content and components

- `src/lib/docs.ts`: 28 guides covering the current RC implementation, with navigation groups, version, repository link, and implementation/test references. Sections support paragraphs, ordered steps, examples, tables, and callouts. Related guides link topics together. Adding a document automatically adds its route, navigation, and search entry.
- `src/components/landing-page.tsx`: public landing page with the framework introduction, feature links, request flow, Acme structure, and RC status.
- `src/lib/landing.ts`: landing-page API and workspace examples.
- `src/components/doc-page.tsx`: document rendering, pagination, and source links.
- `src/app/docs/layout.tsx`: documentation shell scoped to `/docs`; the landing page uses its own navigation.
- `src/components/docs-shell.tsx`: navigation, search, theme, table of contents, and clipboard interactions.
- `src/components/ui/`: editable shadcn/ui components, with registry aliases in `components.json`.
- `src/app/globals.css`: shared design tokens, light/dark themes, and responsive layout.

Search runs locally and does not send queries to a service. The helpful-page acknowledgement lasts for the current page visit; it does not persist or transmit feedback. “Suggest a change” opens a GitHub issue. Theme preference is stored by next-themes in the browser. No TSNX runtime packages are imported by the website.

## Content conventions

Verify feature claims against public exports, implementation, and regression tests in this repository. Treat older READMEs, architecture proposals, and legacy samples as context. The RC feature map distinguishes implemented framework contracts from application-owned integrations; it does not claim to verify registry tarballs.

Use `Acme` for the example workspace, short PascalCase project names (`Host`, `Inventory`, `SharedKernel`), and lowercase npm identities (`@acme/host`). Native `tsconfig.json` and `package.json` are the default project model. Keep blank lines between imports, setup, service registration, and endpoint examples so snippets remain readable.
