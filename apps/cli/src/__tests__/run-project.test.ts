import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseRunArgs } from '../commands/run.js';
import { WatchSupervisor } from '../commands/watch.js';

const CLI_BIN = fileURLToPath(new URL('../index.js', import.meta.url));

describe('tsnx run command options & workspace execution', () => {
  it('correctly parses CLI arguments and handles "--" separator', () => {
    // 1. --project App
    const r1 = parseRunArgs(['--project', 'App']);
    assert.equal(r1.projectName, 'App');
    assert.equal(r1.noBuild, false);
    assert.deepEqual(r1.appArgs, []);

    // 2. -p App
    const r2 = parseRunArgs(['-p', 'App']);
    assert.equal(r2.projectName, 'App');
    assert.equal(r2.noBuild, false);

    // 3. --project=App
    const r3 = parseRunArgs(['--project=App']);
    assert.equal(r3.projectName, 'App');

    // 4. -p=App
    const r4 = parseRunArgs(['-p=App']);
    assert.equal(r4.projectName, 'App');

    // 5. --no-build flag
    const r5 = parseRunArgs(['--no-build']);
    assert.equal(r5.noBuild, true);
    assert.equal(r5.projectName, undefined);

    // 6. Forwarding arguments after '--'
    const r6 = parseRunArgs(['-p', 'HostApp', '--no-build', '--', '--port', '3000', '--custom']);
    assert.equal(r6.projectName, 'HostApp');
    assert.equal(r6.noBuild, true);
    assert.deepEqual(r6.appArgs, ['--port', '3000', '--custom']);

    // 7. Forwarding flags directly without '--'
    const r7 = parseRunArgs(['-p', 'HostApp', '--foo', 'bar']);
    assert.equal(r7.projectName, 'HostApp');
    assert.deepEqual(r7.appArgs, ['--foo', 'bar']);
  });

  it('runs project from workspace root using --project <name>', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-root-'));

    try {
      // 1. Init workspace
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'MySolution'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // 2. Create console project inside workspace
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'HostApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // Update HostApp/src/main.ts
      const mainPath = path.join(tmpDir, 'HostApp', 'src', 'main.ts');
      fs.writeFileSync(mainPath, `console.log('HELLO_FROM_HOST_APP');\n`, 'utf-8');

      // 3. Run from workspace root using --project HostApp
      const output = execFileSync(
        process.execPath,
        [CLI_BIN, 'run', '--project', 'HostApp'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      assert.ok(output.includes('[TSNX] Building "HostApp"'));
      assert.ok(output.includes('HELLO_FROM_HOST_APP'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runs project from workspace root using -p <name> and forwards arguments after --', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-args-'));

    try {
      // 1. Init workspace
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'MySolution'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // 2. Create console project
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'ArgApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      // Update main.ts to print received process.argv
      const mainPath = path.join(tmpDir, 'ArgApp', 'src', 'main.ts');
      fs.writeFileSync(
        mainPath,
        `declare const process: any;\nconsole.log('ARGS:' + JSON.stringify(process.argv.slice(2)));\n`,
        'utf-8',
      );

      // 3. Run: tsnx run -p ArgApp -- --port 3000 --env production
      const output = execFileSync(
        process.execPath,
        [CLI_BIN, 'run', '-p', 'ArgApp', '--', '--port', '3000', '--env', 'production'],
        {
          cwd: tmpDir,
          encoding: 'utf-8',
        },
      );

      assert.ok(output.includes('ARGS:["--port","3000","--env","production"]'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runs project from workspace root automatically when only 1 runnable project exists', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-single-'));

    try {
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'SingleWs'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'OnlyApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const mainPath = path.join(tmpDir, 'OnlyApp', 'src', 'main.ts');
      fs.writeFileSync(mainPath, `console.log('ONLY_APP_AUTO_RUN');\n`, 'utf-8');

      // Run `tsnx run` directly from workspace root without --project
      const output = execFileSync(process.execPath, [CLI_BIN, 'run'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      assert.ok(output.includes('ONLY_APP_AUTO_RUN'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('honors --no-build flag and skips compilation', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-nobuild-'));

    try {
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'QuickApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const appDir = path.join(tmpDir, 'QuickApp');

      // 1. Initial build
      execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: appDir,
        encoding: 'utf-8',
      });

      // 2. Change source file
      const mainPath = path.join(appDir, 'src', 'main.ts');
      fs.writeFileSync(mainPath, `console.log('NEW_MODIFIED_CODE');\n`, 'utf-8');

      // 3. Run with --no-build: should run previous build output, NOT NEW_MODIFIED_CODE
      const output = execFileSync(process.execPath, [CLI_BIN, 'run', '--no-build'], {
        cwd: appDir,
        encoding: 'utf-8',
      });

      assert.ok(!output.includes('[TSNX] Building'));
      assert.ok(output.includes('Hello from QuickApp!'));
      assert.ok(!output.includes('NEW_MODIFIED_CODE'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reports error when project is not found in workspace', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-err-'));

    try {
      execFileSync(process.execPath, [CLI_BIN, 'workspace', 'init', 'ErrWs'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'ExistingApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      try {
        execFileSync(process.execPath, [CLI_BIN, 'run', '-p', 'GhostApp'], {
          cwd: tmpDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });
        assert.fail('Should have failed');
      } catch (err: any) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        assert.ok(stderr.includes('Project "GhostApp" not found in workspace "ErrWs"'));
        assert.ok(stderr.includes('ExistingApp (console)'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-09: watch stopChildProcess forcefully terminates child process with SIGKILL if it ignores SIGTERM', async () => {
    // Spawn a node child process that traps SIGTERM and ignores it, notifying on stdout when ready
    const child = spawn(
      process.execPath,
      ['-e', 'process.on("SIGTERM", () => {}); console.log("READY"); setInterval(() => {}, 1000);'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );

    // Wait until child is running and has registered the SIGTERM handler
    await new Promise<void>((resolve) => {
      child.stdout.once('data', () => resolve());
    });

    const supervisor = new WatchSupervisor({ kind: 'project', project: {} as any, filePath: '' }, {});
    supervisor.setChildProcessForTesting(child);

    assert.ok(child.pid);
    const pid = child.pid;

    // Verify process is running
    assert.doesNotThrow(() => process.kill(pid, 0));

    // Call stopChildProcess with 150ms timeout (should send SIGTERM, wait 150ms, then force-kill with SIGKILL)
    await supervisor.stopChildProcess(150);

    // Verify process has exited via SIGKILL
    assert.strictEqual(child.signalCode, 'SIGKILL');

    // Verify process is no longer running in OS
    assert.throws(
      () => process.kill(pid, 0),
      (err: any) => err.code === 'ESRCH',
    );
  });

  it('M-16: tsnx run maps signal termination to a non-zero exit code', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-sig-'));

    try {
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'SigApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const appDir = path.join(tmpDir, 'SigApp');
      const mainPath = path.join(appDir, 'src', 'main.ts');

      // Application outputs READY then keeps running
      fs.writeFileSync(
        mainPath,
        `console.log('READY_FOR_SIGNAL');
setInterval(() => {}, 1000);
`,
        'utf-8',
      );

      // Build app first
      execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: appDir,
        encoding: 'utf-8',
      });

      // Run app via tsnx run
      const cliChild = spawn(process.execPath, [CLI_BIN, 'run', '--no-build'], {
        cwd: appDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Wait until child is running
      await new Promise<void>((resolve, reject) => {
        let output = '';
        const onData = (data: Buffer) => {
          output += data.toString();
          if (output.includes('READY_FOR_SIGNAL')) {
            cliChild.stdout?.removeListener('data', onData);
            resolve();
          }
        };
        cliChild.stdout?.on('data', onData);
        cliChild.on('error', reject);
      });

      // Send SIGTERM to the CLI process
      cliChild.kill('SIGTERM');

      const exitStatus = await new Promise<{ code: number | null; sig: NodeJS.Signals | null }>((resolve) => {
        cliChild.on('close', (code, sig) => {
          resolve({ code, sig });
        });
      });

      // Must exit with a non-zero exit code (128 + 15 = 143 or signalCode SIGTERM)
      if (exitStatus.code !== null) {
        assert.notEqual(exitStatus.code, 0, 'CLI exit code must not be 0 when terminated by signal');
        assert.equal(exitStatus.code, 143, 'CLI exit code for SIGTERM must be 128 + 15 = 143');
      } else {
        assert.equal(exitStatus.sig, 'SIGTERM');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-17: tsnx run forwards repeated signals to running child', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-run-sig-repeat-'));

    try {
      execFileSync(process.execPath, [CLI_BIN, 'create', 'console', 'SigRepeatApp', '--no-install'], {
        cwd: tmpDir,
        encoding: 'utf-8',
      });

      const appDir = path.join(tmpDir, 'SigRepeatApp');
      const mainPath = path.join(appDir, 'src', 'main.ts');

      // The child listens to SIGTERM:
      // - First SIGTERM: logs 'SIGTERM_COUNT_1', but keeps running (simulating slow graceful shutdown)
      // - Second SIGTERM: logs 'SIGTERM_COUNT_2' and exits with 143
      fs.writeFileSync(
        mainPath,
        `let count = 0;
process.on('SIGTERM', () => {
  count++;
  console.log('SIGTERM_COUNT_' + count);
  if (count >= 2) {
    process.exit(143);
  }
});
console.log('READY_FOR_REPEATED_SIGNAL');
setInterval(() => {}, 1000);
`,
        'utf-8',
      );

      // Build app first
      execFileSync(process.execPath, [CLI_BIN, 'build'], {
        cwd: appDir,
        encoding: 'utf-8',
      });

      // Run app via tsnx run
      const cliChild = spawn(process.execPath, [CLI_BIN, 'run', '--no-build'], {
        cwd: appDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let fullOutput = '';
      cliChild.stdout?.on('data', (d: Buffer) => {
        fullOutput += d.toString();
      });

      // Wait until child is running
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (fullOutput.includes('READY_FOR_REPEATED_SIGNAL')) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
        cliChild.on('error', (err) => {
          clearInterval(interval);
          reject(err);
        });
      });

      // Send 1st SIGTERM
      cliChild.kill('SIGTERM');

      // Wait until child processes 1st SIGTERM
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          if (fullOutput.includes('SIGTERM_COUNT_1')) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
        cliChild.on('error', (err) => {
          clearInterval(interval);
          reject(err);
        });
      });

      // Send 2nd SIGTERM
      cliChild.kill('SIGTERM');

      const exitStatus = await new Promise<{ code: number | null; sig: NodeJS.Signals | null }>((resolve) => {
        cliChild.on('close', (code, sig) => {
          resolve({ code, sig });
        });
      });

      assert.ok(
        fullOutput.includes('SIGTERM_COUNT_2'),
        'Child process must receive second SIGTERM forwarded by CLI',
      );
      assert.equal(exitStatus.code, 143);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-24: watchDirectorySubtree fallback detects file changes in deeply nested directories', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-watch-subtree-'));

    try {
      const deepDir = path.join(tmpDir, 'src', 'features', 'users', 'services');
      fs.mkdirSync(deepDir, { recursive: true });

      const supervisor = new WatchSupervisor({ kind: 'project', project: {} as any, filePath: '' }, {});

      let changeDetected = false;
      supervisor.watchDirectorySubtreeForTesting(path.join(tmpDir, 'src'), () => {
        changeDetected = true;
      });

      // Write a file in the deeply nested directory
      const testFile = path.join(deepDir, 'user.service.ts');
      fs.writeFileSync(testFile, 'export class UserService {}', 'utf-8');

      // Wait for watcher notification
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (changeDetected) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 40) { // 2s timeout
            clearInterval(interval);
            reject(new Error('Watch event not detected in nested directory'));
          }
        }, 50);
      });

      assert.strictEqual(changeDetected, true, 'Subtree watcher must detect change in nested directory');
      supervisor.closeWatchersForTesting();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-24: watchDirectorySubtree recursively watches newly created nested subtrees and detects file writes within them', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-watch-new-subtrees-'));

    try {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const supervisor = new WatchSupervisor({ kind: 'project', project: {} as any, filePath: '' }, {});

      let changeDetected = false;
      supervisor.watchDirectorySubtreeForTesting(srcDir, () => {
        changeDetected = true;
      });

      // Small delay to ensure fs.watch is fully armed
      await new Promise((r) => setTimeout(r, 50));

      // Create a brand new deeply nested directory tree after watcher is running
      const newDeepDir = path.join(srcDir, 'modules', 'orders', 'controllers');
      fs.mkdirSync(newDeepDir, { recursive: true });

      // Small delay for directory creation events to settle and watchers to be attached
      await new Promise((r) => setTimeout(r, 100));
      changeDetected = false;

      // Write a file in the deepest newly created leaf directory
      const testFile = path.join(newDeepDir, 'order.controller.ts');
      fs.writeFileSync(testFile, 'export class OrderController {}', 'utf-8');

      // Wait for watcher notification on the newly created leaf file
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (changeDetected) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 40) { // 2s timeout
            clearInterval(interval);
            reject(new Error('Watch event not detected in newly created leaf directory'));
          }
        }, 50);
      });

      assert.strictEqual(changeDetected, true, 'Subtree watcher must detect change in newly created deep leaf directory');
      supervisor.closeWatchersForTesting();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-24: watchDirectorySubtree purges stale watchers on deletion and re-arms on recreation (create -> edit -> delete -> recreate -> edit)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-watch-recreate-'));

    try {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const supervisor = new WatchSupervisor({ kind: 'project', project: {} as any, filePath: '' }, {});

      let changeDetected = false;
      supervisor.watchDirectorySubtreeForTesting(srcDir, () => {
        changeDetected = true;
      });

      await new Promise((r) => setTimeout(r, 50));

      // 1. Create nested subtree
      const nestedDir = path.join(srcDir, 'features', 'billing', 'services');
      fs.mkdirSync(nestedDir, { recursive: true });
      await new Promise((r) => setTimeout(r, 100));

      // 2. Edit 1: write file to leaf
      changeDetected = false;
      const testFile = path.join(nestedDir, 'billing.service.ts');
      fs.writeFileSync(testFile, 'export class BillingServiceV1 {}', 'utf-8');

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (changeDetected) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 40) {
            clearInterval(interval);
            reject(new Error('First write not detected in nested directory'));
          }
        }, 50);
      });
      assert.strictEqual(changeDetected, true, 'First edit must be detected');

      // 3. Delete subtree
      fs.rmSync(path.join(srcDir, 'features'), { recursive: true, force: true });
      await new Promise((r) => setTimeout(r, 150));

      // 4. Recreate identical subtree
      fs.mkdirSync(nestedDir, { recursive: true });
      await new Promise((r) => setTimeout(r, 150));

      // 5. Edit 2: write file to recreated leaf
      changeDetected = false;
      fs.writeFileSync(testFile, 'export class BillingServiceV2 {}', 'utf-8');

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (changeDetected) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 40) {
            clearInterval(interval);
            reject(new Error('Second write not detected after directory recreation'));
          }
        }, 50);
      });
      assert.strictEqual(changeDetected, true, 'Second edit after directory recreation must be detected');

      supervisor.closeWatchersForTesting();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('M-24: rapid delete and recreate cycles without delay purge old instances cleanly and return to baseline handles', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-watch-rapid-'));

    try {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const supervisor = new WatchSupervisor({ kind: 'project', project: {} as any, filePath: '' }, {});

      supervisor.watchDirectorySubtreeForTesting(srcDir, () => {});

      // Baseline: exactly 1 watcher for srcDir
      assert.strictEqual(supervisor.getWatcherCountForTesting(), 1, 'Baseline watcher count should be 1');

      const subtreeRoot = path.join(srcDir, 'nested');
      const deepLeaf = path.join(subtreeRoot, 'a', 'b', 'c');

      // 8 rapid delete/recreate cycles with zero delay
      for (let i = 0; i < 8; i++) {
        if (fs.existsSync(subtreeRoot)) {
          fs.rmSync(subtreeRoot, { recursive: true, force: true });
        }
        fs.mkdirSync(deepLeaf, { recursive: true });
      }

      // Small delay to allow any pending file events to settle
      await new Promise((r) => setTimeout(r, 200));

      // Finally delete the entire subtree
      fs.rmSync(subtreeRoot, { recursive: true, force: true });
      await new Promise((r) => setTimeout(r, 200));

      // After final deletion, all subtree watchers must be purged and count returns to baseline 1
      assert.strictEqual(
        supervisor.getWatcherCountForTesting(),
        1,
        'Watcher count must return to baseline (1) after subtree is removed',
      );

      supervisor.closeWatchersForTesting();
      assert.strictEqual(supervisor.getWatcherCountForTesting(), 0, 'All watchers closed');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
