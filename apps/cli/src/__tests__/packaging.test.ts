import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '../../../..');
const isWindows = process.platform === 'win32';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function httpGet(url: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body,
        });
      });
    }).on('error', reject);
  });
}

describe('TSNX Packaging & Isolated Consumer Verification', () => {
  it('creates tarballs with strict package integrity and validates complete consumer workflow in isolated environment', async () => {
    // 1. Create tarballs for all 5 packages in a dedicated staging directory
    const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-pack-staging-'));
    const packagesToPack = [
      { name: 'core', pkgDir: path.join(monorepoRoot, 'packages', 'core') },
      { name: 'hosting-abstractions', pkgDir: path.join(monorepoRoot, 'packages', 'hosting-abstractions') },
      { name: 'hosting', pkgDir: path.join(monorepoRoot, 'packages', 'hosting') },
      { name: 'build', pkgDir: path.join(monorepoRoot, 'packages', 'build') },
      { name: 'web', pkgDir: path.join(monorepoRoot, 'packages', 'web') },
      { name: 'cli', pkgDir: path.join(monorepoRoot, 'apps', 'cli') },
    ];

    const tarballPaths: Record<string, string> = {};

    try {
      for (const { name, pkgDir } of packagesToPack) {
        // Run pnpm pack inside stageDir to output tarball there
        const packOutput = execFileSync(
          pnpmCmd,
          ['pack', '--pack-destination', stageDir],
          {
            cwd: pkgDir,
            encoding: 'utf-8',
            shell: isWindows,
          },
        );
        const expectedVersion = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8')).version;
        assert.ok(packOutput.includes(`@tsnx/${name}@${expectedVersion}`), `Failed packing @tsnx/${name}: ${packOutput}`);
        
        // Find produced .tgz
        const files = fs.readdirSync(stageDir);
        const tgzName = files.find((f) => f.startsWith(`tsnx-${name}`) && f.endsWith('.tgz'));
        assert.ok(tgzName, `Could not find tarball for @tsnx/${name} in ${stageDir}`);
        tarballPaths[name] = path.join(stageDir, tgzName);
      }

      // 2. Package Integrity: Verify tarball contents using tar -tf
      for (const [name, tgzPath] of Object.entries(tarballPaths)) {
        const fileList = execFileSync('tar', ['-tf', tgzPath], { encoding: 'utf-8' }).split(/\r?\n/).filter(Boolean);
        
        // Must contain package.json, README.md, and dist/
        assert.ok(fileList.includes('package/package.json'), `${name} tarball missing package.json`);
        assert.ok(fileList.includes('package/README.md'), `${name} tarball missing README.md`);
        assert.ok(fileList.some((f) => f.startsWith('package/dist/')), `${name} tarball missing dist files`);

        // Must NOT contain src/ or __tests__ or .tsbuildinfo or .map
        const invalidFiles = fileList.filter(
          (f) =>
            f.startsWith('package/src/') ||
            f.includes('__tests__') ||
            f.endsWith('.tsbuildinfo') ||
            f.endsWith('.map') ||
            f === 'package/tsconfig.json',
        );
        assert.deepEqual(invalidFiles, [], `${name} tarball contains unwhitelisted files: ${invalidFiles.join(', ')}`);
      }

      // 3. Isolated Consumer Verification
      // Create isolated consumer directory completely outside monorepo
      const consumerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-isolated-consumer-'));

      try {
        // Initialize minimal consumer project
        fs.writeFileSync(
          path.join(consumerDir, 'package.json'),
          JSON.stringify(
            {
              name: 'isolated-consumer',
              version: '1.0.0',
              type: 'module',
              private: true,
            },
            null,
            2,
          ),
          'utf-8',
        );

        // Install all 5 tarballs simultaneously using npm
        const allTarballs = Object.values(tarballPaths);
        execFileSync(npmCmd, ['install', '--no-package-lock', ...allTarballs], {
          cwd: consumerDir,
          encoding: 'utf-8',
          stdio: 'pipe',
          shell: isWindows,
        });

        const consumerTsnxBin = path.join(consumerDir, 'node_modules', '.bin', isWindows ? 'tsnx.cmd' : 'tsnx');
        assert.ok(fs.existsSync(consumerTsnxBin), `tsnx bin not found at ${consumerTsnxBin}`);

        // A. Verify CLI version
        const versionOutput = execFileSync(consumerTsnxBin, ['--version'], {
          cwd: consumerDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(versionOutput.includes('1.0.0-rc.1'));

        // B. Consumer: Console Application (create -> build -> run)
        const createConsoleOutput = execFileSync(
          consumerTsnxBin,
          ['create', 'console', 'MyConsole'],
          {
            cwd: consumerDir,
            encoding: 'utf-8',
            shell: isWindows,
          },
        );
        assert.ok(createConsoleOutput.includes('Project scaffolded'));
        assert.ok(createConsoleOutput.includes('Project created successfully!'));

        const consoleDir = path.join(consumerDir, 'MyConsole');
        assert.ok(fs.existsSync(path.join(consoleDir, 'tsconfig.json')));
        assert.ok(fs.existsSync(path.join(consoleDir, 'package.json')));
        assert.ok(fs.existsSync(path.join(consoleDir, 'src', 'main.ts')));

        // Build console project
        const buildConsoleOutput = execFileSync(consumerTsnxBin, ['build'], {
          cwd: consoleDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(buildConsoleOutput.includes('Build succeeded'));
        assert.ok(fs.existsSync(path.join(consoleDir, 'dist', 'main.js')));

        // Run console project
        const runConsoleOutput = execFileSync(consumerTsnxBin, ['run'], {
          cwd: consoleDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(runConsoleOutput.includes('Hello from MyConsole!'));

        // C. Consumer: Library Project (create -> build -> test)
        const createLibOutput = execFileSync(
          consumerTsnxBin,
          ['create', 'library', 'MyLib'],
          {
            cwd: consumerDir,
            encoding: 'utf-8',
            shell: isWindows,
          },
        );
        assert.ok(createLibOutput.includes('Project scaffolded'));
        assert.ok(createLibOutput.includes('Project created successfully!'));

        const libDir = path.join(consumerDir, 'MyLib');
        // Add a unit test to MyLib
        const libTestDir = path.join(libDir, 'src', '__tests__');
        fs.mkdirSync(libTestDir, { recursive: true });
        fs.writeFileSync(
          path.join(libTestDir, 'math.test.ts'),
          `import assert from 'node:assert/strict';
import { it } from 'node:test';
import { add } from '../index.js';

it('adds two numbers correctly', () => {
  assert.equal(add(2, 3), 5);
});
`,
          'utf-8',
        );

        // Build library
        const buildLibOutput = execFileSync(consumerTsnxBin, ['build'], {
          cwd: libDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(buildLibOutput.includes('Build succeeded'));
        assert.ok(fs.existsSync(path.join(libDir, 'dist', 'index.js')));
        assert.ok(fs.existsSync(path.join(libDir, 'dist', 'index.d.ts')));

        // Run tests with tsnx test
        const testLibOutput = execFileSync(consumerTsnxBin, ['test'], {
          cwd: libDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(testLibOutput.includes('Running tests for "MyLib"'));
        assert.ok(testLibOutput.includes('All tests passed successfully.'));

        // D. Consumer: Web API Project (create -> install deps from tarball -> build -> run -> HTTP query -> stop)
        const createApiOutput = execFileSync(
          consumerTsnxBin,
          ['create', 'webapi', 'MyApi', '--no-install'],
          {
            cwd: consumerDir,
            encoding: 'utf-8',
            shell: isWindows,
          },
        );
        assert.ok(createApiOutput.includes('Project scaffolded'));
        assert.ok(createApiOutput.includes('Project created successfully!'));

        const apiDir = path.join(consumerDir, 'MyApi');
        // Install @tsnx/web, @tsnx/hosting, and @tsnx/hosting-abstractions in MyApi using the tarballs
        execFileSync(
          npmCmd,
          ['install', '--no-package-lock', tarballPaths.web, tarballPaths.hosting, tarballPaths['hosting-abstractions']],
          {
            cwd: apiDir,
            encoding: 'utf-8',
            stdio: 'pipe',
            shell: isWindows,
          },
        );

        // Build Web API
        const buildApiOutput = execFileSync(consumerTsnxBin, ['build'], {
          cwd: apiDir,
          encoding: 'utf-8',
          shell: isWindows,
        });
        assert.ok(buildApiOutput.includes('Build succeeded'));
        assert.ok(fs.existsSync(path.join(apiDir, 'dist', 'main.js')));

        // Run Web API and query HTTP endpoints
        const testPort = 42899;
        const apiChild = spawn(consumerTsnxBin, ['run'], {
          cwd: apiDir,
          env: {
            ...process.env,
            PORT: String(testPort),
          },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: isWindows,
        });

        try {
          // Poll until server is ready
          let ready = false;
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            try {
              const res = await httpGet(`http://127.0.0.1:${testPort}/health`);
              if (res.statusCode === 200) {
                ready = true;
                break;
              }
            } catch {
              // Not ready yet
            }
          }
          assert.ok(ready, 'Web API server did not start within timeout');

          // Query GET /
          const rootRes = await httpGet(`http://127.0.0.1:${testPort}/`);
          assert.equal(rootRes.statusCode, 200);
          assert.ok(rootRes.headers['content-type']?.includes('application/json'));
          const rootJson = JSON.parse(rootRes.body);
          assert.equal(rootJson.message, 'Welcome to MyApi API!');

          // Query GET /health
          const healthRes = await httpGet(`http://127.0.0.1:${testPort}/health`);
          assert.equal(healthRes.statusCode, 200);
          const healthJson = JSON.parse(healthRes.body);
          assert.equal(healthJson.status, 'ok');
          assert.ok(healthJson.timestamp);
        } finally {
          try {
            if (isWindows && apiChild.pid) {
              execFileSync('taskkill', ['/pid', String(apiChild.pid), '/T', '/F'], { stdio: 'ignore' });
            } else {
              apiChild.kill('SIGINT');
            }
          } catch {
            apiChild.kill();
          }
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 2000);
            apiChild.on('close', () => {
              clearTimeout(timer);
              resolve(undefined);
            });
          });
        }
      } finally {
        fs.rmSync(consumerDir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(stageDir, { recursive: true, force: true });
    }
  });
});
