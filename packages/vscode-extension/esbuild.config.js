import esbuild from 'esbuild';

// 1. VS Code Extension Host bundle
await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.cjs',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  banner: {
    js: 'const import_meta_url = require("url").pathToFileURL(__filename).toString();',
  },
  define: {
    'import.meta.url': 'import_meta_url',
  },
});

// 2. TypeScript Server Plugin bundle
await esbuild.build({
  entryPoints: ['plugins/tsnx-tsserver-plugin/src/index.ts'],
  bundle: true,
  outfile: 'plugins/tsnx-tsserver-plugin/index.js',
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
});

console.log('✔ Bundled vscode-tsnx and tsnx-tsserver-plugin successfully with esbuild.');
