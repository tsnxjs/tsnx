import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TsProject, TsWorkspace, VERSION } from '@tsnx/core';

const CLI_BIN = fileURLToPath(new URL('../index.js', import.meta.url));

describe('@tsnx/cli Scaffolding & Execution', () => {
  it('scaffolds console project and executes it with tsdk run', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-scaffold-console-'));

    try {
      // 1. tsdk create console HelloWorld
      const createOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'console', 'HelloWorld'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(createOutput.includes('Project scaffolded'));
      assert.ok(createOutput.includes('Project created successfully!'));

      const projectDir = path.join(tmpDir, 'HelloWorld');
      assert.ok(fs.existsSync(path.join(projectDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(projectDir, 'package.json')));
      assert.ok(fs.existsSync(path.join(projectDir, 'src', 'main.ts')));

      // Verify loaded as valid TsProject
      const proj = TsProject.loadSync(projectDir);
      assert.equal(proj.name, 'HelloWorld');
      assert.equal(proj.type, 'console');

      // 2. cd HelloWorld && tsdk run
      const runOutput = execFileSync(process.execPath, [CLI_BIN, 'run'], {
        cwd: projectDir,
        encoding: 'utf-8',
      });
      assert.ok(runOutput.includes('Hello from HelloWorld!'));
      assert.ok(fs.existsSync(path.join(projectDir, 'dist', 'main.js')));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('scaffolds library project and builds it with tsdk build', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-scaffold-lib-'));

    try {
      // 1. tsdk create library MyLib
      const createOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'library', 'MyLib'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(createOutput.includes('Project scaffolded'));
      assert.ok(createOutput.includes('Project created successfully!'));

      const projectDir = path.join(tmpDir, 'MyLib');
      assert.ok(fs.existsSync(path.join(projectDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(projectDir, 'package.json')));
      assert.ok(fs.existsSync(path.join(projectDir, 'src', 'index.ts')));
      assert.ok(fs.existsSync(path.join(projectDir, 'src', 'index.test.ts')));

      const proj = TsProject.loadSync(projectDir);
      assert.equal(proj.name, 'MyLib');
      assert.equal(proj.type, 'library');

      // 2. tsdk build
      const buildOutput = execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: projectDir,
        encoding: 'utf-8',
      });
      assert.ok(buildOutput.includes('Build succeeded'));
      assert.ok(fs.existsSync(path.join(projectDir, 'dist', 'index.js')));
      assert.ok(fs.existsSync(path.join(projectDir, 'dist', 'index.d.ts')));

      // 3. tsdk test
      const testOutput = execFileSync(process.execPath, [CLI_BIN, 'test'], {
        cwd: projectDir,
        encoding: 'utf-8',
      });
      assert.ok(testOutput.includes('All tests passed successfully.'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('initializes workspace and automatically registers newly created projects', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-scaffold-ws-'));

    try {
      // 1. tsnx workspace init AcmeDemo
      const initOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'workspace', 'init', 'AcmeDemo'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(initOutput.includes('Initialized workspace "AcmeDemo"'));
      assert.ok(fs.existsSync(path.join(tmpDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(tmpDir, 'package.json')));
      assert.ok(fs.existsSync(path.join(tmpDir, 'pnpm-workspace.yaml')));

      // 2. Create console app inside workspace root: should auto-register in root tsconfig.json
      const createOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'console', 'MyCli'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(createOutput.includes('Registered project in workspace "AcmeDemo"'));

      // Verify workspace registry
      const ws = TsWorkspace.loadSync(tmpDir);
      assert.equal(ws.projects.length, 1);
      assert.equal(ws.projects[0].name, 'MyCli');

      // 3. tsdk project list shows MyCli
      const listOutput = execFileSync(process.execPath, [CLI_BIN, 'project', 'list'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      assert.ok(listOutput.includes('MyCli'));
      assert.ok(listOutput.includes('console'));

      // 4. tsdk run inside MyCli directory
      const myCliDir = path.join(tmpDir, 'MyCli');
      const runOutput = execFileSync(process.execPath, [CLI_BIN, 'run'], {
        cwd: myCliDir,
        encoding: 'utf-8',
      });
      assert.ok(runOutput.includes('Hello from MyCli!'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('supports full lifecycle with tsdk ref add and package synchronization', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-lifecycle-'));

    try {
      // 1. Init workspace
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'FlowApp'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // 2. Create library CoreLib and console Runner
      execFileSync(process.execPath, [CLI_BIN, 'create', 'library', 'CoreLib'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'Runner'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const runnerDir = path.join(tmpDir, 'Runner');
      const coreLibDir = path.join(tmpDir, 'CoreLib');

      // 3. Add reference inside Runner: tsdk ref add CoreLib
      const refOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'ref', 'add', 'CoreLib'],
        {
          cwd: runnerDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(refOutput.includes('Added reference to "CoreLib"'));

      // Verify Runner tsconfig.json contains CoreLib reference
      const runnerTsconfig = JSON.parse(
        fs.readFileSync(path.join(runnerDir, 'tsconfig.json'), 'utf-8'),
      );
      assert.ok(runnerTsconfig.references.some((r: any) => r.path === '../CoreLib'));

      // Verify Runner package.json contains workspace:*
      const runnerPkg = JSON.parse(
        fs.readFileSync(path.join(runnerDir, 'package.json'), 'utf-8'),
      );
      assert.ok(runnerPkg.dependencies && runnerPkg.dependencies['@flowapp/core-lib'] === 'workspace:*');

      // 4. Update Runner/src/main.ts to call CoreLib
      fs.writeFileSync(
        path.join(runnerDir, 'src', 'main.ts'),
        `import { add } from '@flowapp/core-lib';
console.log('Calculation:', add(10, 25));
`,
      );

      // Link node_modules for local package resolution if not already linked by tsnx ref add
      const runnerModules = path.join(runnerDir, 'node_modules', '@flowapp');
      if (!fs.existsSync(path.join(runnerModules, 'core-lib'))) {
        fs.mkdirSync(runnerModules, { recursive: true });
        fs.symlinkSync(coreLibDir, path.join(runnerModules, 'core-lib'), 'junction');
      }

      // 5. tsdk build --workspace
      const buildOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'build', '--workspace'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(buildOutput.includes('Build succeeded'));

      // 6. tsdk run inside Runner
      const runOutput = execFileSync(process.execPath, [CLI_BIN, 'run'], {
        cwd: runnerDir,
        encoding: 'utf-8',
      });
      assert.ok(runOutput.includes('Calculation: 35'), `Expected "Calculation: 35" in runOutput, but received:\n${runOutput}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('scaffolds webapi project, builds it, runs it with HTTP server, and verifies endpoints', async () => {
    const { spawn } = await import('node:child_process');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdk-scaffold-webapi-'));

    try {
      // 1. tsdk create webapi MyApi
      const createOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'webapi', 'MyApi', '--no-install'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );
      assert.ok(createOutput.includes('Project scaffolded'));
      assert.ok(createOutput.includes('Project created successfully!'));

      const apiDir = path.join(tmpDir, 'MyApi');
      assert.ok(fs.existsSync(path.join(apiDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(apiDir, 'package.json')));
      assert.ok(fs.existsSync(path.join(apiDir, 'src', 'main.ts')));
      assert.ok(fs.existsSync(path.join(apiDir, 'src', 'app.ts')));
      assert.ok(fs.existsSync(path.join(apiDir, 'src', 'app.test.ts')));
      const generatedPackage = JSON.parse(fs.readFileSync(path.join(apiDir, 'package.json'), 'utf8'));
      assert.equal(generatedPackage.dependencies['@tsnx/web'], `^${VERSION}`);
      assert.equal(generatedPackage.devDependencies['@tsnx/testing'], `^${VERSION}`);

      // Verify loaded as valid TsProject with spec.type: webapi
      const proj = TsProject.loadSync(apiDir);
      assert.equal(proj.name, 'MyApi');
      assert.equal(proj.type, 'webapi');

      // Link node_modules so compiled code can import @tsnx/web, @tsnx/hosting, @tsnx/hosting-abstractions, @tsnx/testing, @tsnx/core and @types/node
      const monorepoRoot = path.resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
      const webPkgDir = path.join(monorepoRoot, 'packages', 'web');
      const hostingPkgDir = path.join(monorepoRoot, 'packages', 'hosting');
      const hostingAbstractionsPkgDir = path.join(monorepoRoot, 'packages', 'hosting-abstractions');
      const testingPkgDir = path.join(monorepoRoot, 'packages', 'testing');
      const corePkgDir = path.join(monorepoRoot, 'packages', 'core');

      const apiModules = path.join(apiDir, 'node_modules', '@tsnx');
      fs.mkdirSync(apiModules, { recursive: true });
      if (fs.existsSync(path.join(apiModules, 'web'))) {
        fs.rmSync(path.join(apiModules, 'web'), { recursive: true, force: true });
      }
      if (fs.existsSync(path.join(apiModules, 'hosting'))) {
        fs.rmSync(path.join(apiModules, 'hosting'), { recursive: true, force: true });
      }
      if (fs.existsSync(path.join(apiModules, 'hosting-abstractions'))) {
        fs.rmSync(path.join(apiModules, 'hosting-abstractions'), { recursive: true, force: true });
      }
      if (fs.existsSync(path.join(apiModules, 'testing'))) {
        fs.rmSync(path.join(apiModules, 'testing'), { recursive: true, force: true });
      }
      if (fs.existsSync(path.join(apiModules, 'core'))) {
        fs.rmSync(path.join(apiModules, 'core'), { recursive: true, force: true });
      }
      fs.symlinkSync(webPkgDir, path.join(apiModules, 'web'), 'junction');
      fs.symlinkSync(hostingPkgDir, path.join(apiModules, 'hosting'), 'junction');
      fs.symlinkSync(hostingAbstractionsPkgDir, path.join(apiModules, 'hosting-abstractions'), 'junction');
      fs.symlinkSync(testingPkgDir, path.join(apiModules, 'testing'), 'junction');
      fs.symlinkSync(corePkgDir, path.join(apiModules, 'core'), 'junction');

      // Link node_modules/@types
      const monorepoTypes = path.join(monorepoRoot, 'node_modules', '@types');
      if (fs.existsSync(monorepoTypes) && !fs.existsSync(path.join(apiDir, 'node_modules', '@types'))) {
        fs.symlinkSync(monorepoTypes, path.join(apiDir, 'node_modules', '@types'), 'junction');
      }

      // 2. tsdk build
      const buildOutput = execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: apiDir,
        encoding: 'utf-8',
      });
      assert.ok(buildOutput.includes('Build succeeded'));
      assert.ok(fs.existsSync(path.join(apiDir, 'dist', 'main.js')));

      // 3. Launch with tsdk run on a dynamic port
      const testPort = 42891;
      const child = spawn(process.execPath, [CLI_BIN, 'run'], {
        cwd: apiDir,
        env: {
          ...process.env,
          PORT: String(testPort),
        },
        stdio: 'pipe',
      });

      let stdoutData = '';
      child.stdout?.on('data', (d) => {
        stdoutData += d.toString();
      });

      try {
        // Poll until HTTP server is ready
        let serverReady = false;
        for (let i = 0; i < 30; i++) {
          try {
            const res = await fetch(`http://127.0.0.1:${testPort}/health`);
            if (res.status === 200) {
              serverReady = true;
              break;
            }
          } catch {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        assert.ok(serverReady, `Server did not respond within timeout. Output: ${stdoutData}`);

        // Verify root endpoint '/'
        const rootRes = await fetch(`http://127.0.0.1:${testPort}/`);
        assert.equal(rootRes.status, 200);
        const rootData = await rootRes.json() as any;
        assert.equal(rootData.message, 'Welcome to MyApi API!');

        // Verify '/health' endpoint
        const healthRes = await fetch(`http://127.0.0.1:${testPort}/health`);
        assert.equal(healthRes.status, 200);
        const healthData = await healthRes.json() as any;
        assert.equal(healthData.status, 'ok');
        assert.ok(healthData.timestamp);
      } finally {
        // 4. Graceful shutdown via SIGTERM / SIGINT
        child.kill('SIGTERM');
        const closedPromise = new Promise((r) => child.on('close', r));
        const timeoutPromise = new Promise((r) => setTimeout(r, 2000));
        await Promise.race([closedPromise, timeoutPromise]);
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }

      // 5. Verify tsdk test executes integration tests and passes out of the box
      const testOutput = execFileSync(process.execPath, [CLI_BIN, 'test'], {
        cwd: apiDir,
        encoding: 'utf-8',
      });
      assert.ok(testOutput.includes('All tests passed successfully.'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('supports -n and -o flags to scaffold into specific output directories in workspace', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-scaffold-flags-'));

    try {
      // 1. Init workspace
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'MySolution'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // 2. tsnx create webapi -n ArasHRMS.Host -o apps/ArasHRMS.Host --no-install
      const createHostOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'webapi', '-n', 'ArasHRMS.Host', '-o', 'apps/ArasHRMS.Host', '--no-install'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      assert.ok(createHostOutput.includes('Project scaffolded'));
      assert.ok(createHostOutput.includes('Registered project in workspace "MySolution"'));
      assert.ok(createHostOutput.includes('cd apps/ArasHRMS.Host'));

      const hostDir = path.join(tmpDir, 'apps', 'ArasHRMS.Host');
      assert.ok(fs.existsSync(path.join(hostDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(hostDir, 'src', 'main.ts')));

      // 3. tsnx create library -n ArasHRMS.Core -o packages --no-install
      const createCoreOutput = execFileSync(
        process.execPath,
        [CLI_BIN, 'create', 'library', '-n', 'ArasHRMS.Core', '-o', 'packages', '--no-install'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      assert.ok(createCoreOutput.includes('Project scaffolded'));
      assert.ok(createCoreOutput.includes('Registered project in workspace "MySolution"'));
      assert.ok(createCoreOutput.includes('cd packages/ArasHRMS.Core'));

      const coreDir = path.join(tmpDir, 'packages', 'ArasHRMS.Core');
      assert.ok(fs.existsSync(path.join(coreDir, 'tsconfig.json')));
      assert.ok(fs.existsSync(path.join(coreDir, 'src', 'index.ts')));

      // 4. Verify workspace has both registered
      const ws = TsWorkspace.loadSync(tmpDir);
      assert.equal(ws.projects.length, 2);
      assert.ok(ws.projects.some((p) => p.name === 'ArasHRMS.Host'));
      assert.ok(ws.projects.some((p) => p.name === 'ArasHRMS.Core'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
