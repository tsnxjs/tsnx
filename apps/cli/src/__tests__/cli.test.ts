import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findContext } from '../discovery.js';

const CLI_BIN = fileURLToPath(new URL('../index.js', import.meta.url));

describe('@tsnx/cli Commands & Context Discovery', () => {
  it('discovers workspace from root and from nested directories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-cli-disc-'));

    try {
      const apiSrc = path.join(tmpDir, 'apps', 'Acme.Api', 'src');
      fs.mkdirSync(apiSrc, { recursive: true });

      fs.writeFileSync(
        path.join(tmpDir, 'apps', 'Acme.Api', 'Acme.Api.tsproj'),
        `
schemaVersion: 1
kind: Project
metadata:
  name: Acme.Api
spec:
  type: webapi
`,
      );

      fs.writeFileSync(
        path.join(tmpDir, 'Acme.tswork'),
        `
schemaVersion: 1
kind: Workspace
metadata:
  name: Acme
projects:
  - path: apps/Acme.Api/Acme.Api.tsproj
`,
      );

      // 1. From root
      const rootCtx = findContext(tmpDir);
      assert.ok(rootCtx);
      assert.equal(rootCtx.kind, 'workspace');
      assert.equal(rootCtx.workspace.name, 'Acme');

      // 2. From deep nested subfolder apps/Acme.Api/src: prioritizes nearest .tsproj project
      const nestedCtx = findContext(apiSrc);
      assert.ok(nestedCtx);
      assert.equal(nestedCtx.kind, 'project');
      assert.equal(nestedCtx.project.name, 'Acme.Api');
      assert.equal(nestedCtx.parentWorkspace?.name, 'Acme');

      // 3. From deep nested subfolder with forceWorkspace = true (--workspace flag)
      const forcedWsCtx = findContext(apiSrc, true);
      assert.ok(forcedWsCtx);
      assert.equal(forcedWsCtx.kind, 'workspace');
      assert.equal(forcedWsCtx.workspace.name, 'Acme');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runs tsnx --version and tsnx --help', () => {
    const helpOutput = execFileSync(process.execPath, [CLI_BIN, '--help'], {
      encoding: 'utf-8',
    });
    assert.ok(helpOutput.includes('TSNX - TypeScript Application Framework CLI'));
    assert.ok(helpOutput.includes('build'));
    assert.ok(helpOutput.includes('restore'));
    assert.ok(helpOutput.includes('graph'));

    const versionOutput = execFileSync(process.execPath, [CLI_BIN, '--version'], {
      encoding: 'utf-8',
    });
    assert.ok(versionOutput.includes('tsnx v1.0.0-rc.1'));
  });

  it('runs tsnx project list, graph, restore, build, and clean in workspace', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-cli-e2e-'));

    try {
      const apiDir = path.join(tmpDir, 'apps', 'Acme.Api');
      const domainDir = path.join(tmpDir, 'packages', 'Acme.Domain');
      const apiSrc = path.join(apiDir, 'src');
      const domainSrc = path.join(domainDir, 'src');

      fs.mkdirSync(apiSrc, { recursive: true });
      fs.mkdirSync(domainSrc, { recursive: true });

      fs.writeFileSync(
        path.join(domainSrc, 'index.ts'),
        `export const value = 100;`,
      );

      fs.writeFileSync(
        path.join(apiSrc, 'main.ts'),
        `import { value } from '@acme/domain';
console.log(value);
`,
      );

      fs.writeFileSync(
        path.join(domainDir, 'package.json'),
        JSON.stringify({
          name: '@acme/domain',
          version: '1.0.0',
          type: 'module',
          main: './dist/index.js',
          types: './dist/index.d.ts',
          exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
        }),
      );

      fs.writeFileSync(
        path.join(apiDir, 'package.json'),
        JSON.stringify({ name: '@acme/api', version: '1.0.0', type: 'module' }),
      );

      fs.writeFileSync(
        path.join(domainDir, 'Acme.Domain.tsproj'),
        `
schemaVersion: 1
kind: Project
metadata:
  name: Acme.Domain
spec:
  type: library
  package:
    name: "@acme/domain"
`,
      );

      fs.writeFileSync(
        path.join(apiDir, 'Acme.Api.tsproj'),
        `
schemaVersion: 1
kind: Project
metadata:
  name: Acme.Api
spec:
  type: webapi
  package:
    name: "@acme/api"
  references:
    - project: Acme.Domain
`,
      );

      fs.writeFileSync(
        path.join(tmpDir, 'Acme.tswork'),
        `
schemaVersion: 1
kind: Workspace
metadata:
  name: Acme
projects:
  - path: apps/Acme.Api/Acme.Api.tsproj
  - path: packages/Acme.Domain/Acme.Domain.tsproj
`,
      );

      // Link node_modules so tsc finds @acme/domain
      const apiModules = path.join(apiDir, 'node_modules', '@acme');
      fs.mkdirSync(apiModules, { recursive: true });
      fs.symlinkSync(domainDir, path.join(apiModules, 'domain'), 'junction');

      // 1. tsdk project list
      const listOutput = execFileSync(process.execPath, [CLI_BIN, 'project', 'list'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(listOutput.includes('Acme.Api'));
      assert.ok(listOutput.includes('Acme.Domain'));

      // 2. tsdk graph
      const graphOutput = execFileSync(process.execPath, [CLI_BIN, 'graph'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(graphOutput.includes('Topological Build Order'));
      assert.ok(graphOutput.includes('1. Acme.Domain'));
      assert.ok(graphOutput.includes('2. Acme.Api'));

      // 3. tsdk restore
      const restoreOutput = execFileSync(process.execPath, [CLI_BIN, 'restore'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(restoreOutput.includes('Restore completed'));

      const apiPkgJson = JSON.parse(
        fs.readFileSync(path.join(apiDir, 'package.json'), 'utf-8'),
      );
      assert.equal(apiPkgJson.dependencies['@acme/domain'], 'workspace:*');

      // 4. tsdk build
      const buildOutput = execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(buildOutput.includes('Build succeeded'));
      assert.ok(fs.existsSync(path.join(apiDir, 'dist', 'main.js')));
      assert.ok(fs.existsSync(path.join(domainDir, 'dist', 'index.js')));

      // 5. tsdk test
      const testOutput = execFileSync(process.execPath, [CLI_BIN, 'test'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      // Domain and Api have no test files -> explicit warning shown, not silent success
      assert.ok(testOutput.includes('[TSNX Warning] No test files found'));

      // 6. Link node_modules/@types to workspace and add actual test file in Acme.Domain
      const monorepoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
      const monorepoTypes = path.join(monorepoRoot, 'node_modules', '@types');
      if (fs.existsSync(monorepoTypes)) {
        const wsModules = path.join(tmpDir, 'node_modules');
        fs.mkdirSync(wsModules, { recursive: true });
        fs.symlinkSync(monorepoTypes, path.join(wsModules, '@types'), 'junction');

        const domainModules = path.join(domainDir, 'node_modules');
        fs.mkdirSync(domainModules, { recursive: true });
        fs.symlinkSync(monorepoTypes, path.join(domainModules, '@types'), 'junction');
      }

      fs.writeFileSync(
        path.join(domainDir, 'src', 'index.test.ts'),
        `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { value } from './index.js';

test('domain value is 100', () => {
  assert.equal(value, 100);
});
`,
      );

      const passTestOutput = execFileSync(process.execPath, [CLI_BIN, 'test'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(passTestOutput.includes('Running tests for "Acme.Domain"'));
      assert.ok(passTestOutput.includes('All tests passed successfully'));

      // 7. tsdk clean
      const cleanOutput = execFileSync(process.execPath, [CLI_BIN, 'clean'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(cleanOutput.includes('Clean completed'));
      assert.ok(!fs.existsSync(path.join(domainDir, 'dist', 'index.js')));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
