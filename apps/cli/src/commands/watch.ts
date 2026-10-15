import { spawn, ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BuildService } from '@tsnx/build';
import { TsProject, TsWorkspace } from '@tsnx/core';
import { findContext, TsdkContext } from '../discovery.js';

export interface WatchOptions {
  runApp?: boolean;
  appArgs?: string[];
  forceWorkspace?: boolean;
}

export class WatchSupervisor {
  private isBuilding = false;
  private dirty = false;
  private manifestDirty = false;
  private childProcess?: ChildProcess;
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer?: NodeJS.Timeout;
  private context: TsdkContext;
  private readonly options: WatchOptions;
  private buildGeneration = 0;

  constructor(context: TsdkContext, options: WatchOptions = {}) {
    this.context = context;
    this.options = options;
  }

  public async start(): Promise<void> {
    const targetName =
      this.context.kind === 'workspace'
        ? `workspace "${this.context.workspace.name}"`
        : `project "${this.context.project.name}"`;
    console.log(`[TSNX Watch] Initializing watcher for ${targetName}...`);

    // 1. Initial build & run
    await this.triggerBuild();

    // 2. Setup file watchers
    this.setupWatchers();

    // 3. Keep process open
    return new Promise<void>((resolve) => {
      const shutdown = async () => {
        console.log(`\n[TSNX Watch] Stopping watchers and shutting down...`);
        this.closeWatchers();
        await this.stopChildProcess();
        resolve();
      };

      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });
  }

  private collectWatchDirectories(): { dirs: string[]; manifests: string[] } {
    const dirs: string[] = [];
    const manifests: string[] = [];

    const isWorkspace = this.context.kind === 'workspace' || this.options.forceWorkspace;
    const targetWorkspace: TsWorkspace | undefined =
      this.context.kind === 'workspace'
        ? this.context.workspace
        : this.context.parentWorkspace;

    const projects: readonly TsProject[] =
      isWorkspace && targetWorkspace
        ? targetWorkspace.projects
        : this.context.kind === 'project'
        ? [this.context.project]
        : [];

    if (this.context.kind === 'workspace') {
      manifests.push(this.context.workspace.filePath);
    } else if (this.context.parentWorkspace) {
      manifests.push(this.context.parentWorkspace.filePath);
    }

    for (const proj of projects) {
      manifests.push(proj.filePath);
      const pkgJson = path.join(proj.directory, 'package.json');
      if (fs.existsSync(pkgJson)) {
        manifests.push(pkgJson);
      }
      const srcDir = path.resolve(proj.directory, proj.manifest.spec.source?.root ?? 'src');
      if (fs.existsSync(srcDir)) {
        dirs.push(srcDir);
      }
    }

    return { dirs: Array.from(new Set(dirs)), manifests: Array.from(new Set(manifests)) };
  }

  private setupWatchers(): void {
    this.closeWatchers();
    const { dirs, manifests } = this.collectWatchDirectories();

    const onFileChanged = (isManifest: boolean) => {
      // Invalidate buildGeneration immediately on any new file or manifest change
      this.buildGeneration++;
      if (isManifest) {
        this.manifestDirty = true;
      }
      this.dirty = true;
      this.scheduleBuild();
    };

    // Watch source directories
    for (const dir of dirs) {
      this.watchDirectoryRecursive(dir, onFileChanged);
    }

    // Watch manifest files
    for (const manifestPath of manifests) {
      try {
        const watcher = fs.watch(manifestPath, () => {
          onFileChanged(true);
        });
        this.watchers.push(watcher);
      } catch {
        // ignore if deleted
      }
    }
  }

  private watchDirectoryRecursive(dir: string, onFileChanged: (isManifest: boolean) => void): void {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
        if (filename && !filename.includes('.git') && !filename.includes('dist') && !filename.includes('node_modules')) {
          onFileChanged(false);
        }
      });
      this.watchers.push(watcher);
    } catch {
      // Fallback for systems without recursive watch (e.g. Linux on Node < 19)
      this.watchDirectorySubtree(dir, onFileChanged);
    }
  }

  private watchDirectorySubtree(dir: string, onFileChanged: (isManifest: boolean) => void): void {
    const dirWatchers = new Map<string, fs.FSWatcher>();

    const removeWatcherFromList = (w: fs.FSWatcher) => {
      let idx: number;
      while ((idx = this.watchers.indexOf(w)) !== -1) {
        this.watchers.splice(idx, 1);
      }
    };

    const removeWatcherSubtree = (deletedPath: string) => {
      for (const [watchedPath, watcher] of Array.from(dirWatchers.entries())) {
        if (watchedPath === deletedPath || watchedPath.startsWith(deletedPath + path.sep)) {
          watcher.removeAllListeners();
          try {
            watcher.close();
          } catch {}
          if (dirWatchers.get(watchedPath) === watcher) {
            dirWatchers.delete(watchedPath);
          }
          removeWatcherFromList(watcher);
        }
      }
    };

    const addWatcher = (subDir: string) => {
      // If we already have a watcher for this path, close and replace it to avoid stale handles
      const existing = dirWatchers.get(subDir);
      if (existing) {
        existing.removeAllListeners();
        try {
          existing.close();
        } catch {}
        if (dirWatchers.get(subDir) === existing) {
          dirWatchers.delete(subDir);
        }
        removeWatcherFromList(existing);
      }

      try {
        const watcher = fs.watch(subDir, (_event, filename) => {
          if (filename) {
            const fullPath = path.join(subDir, filename);
            if (!filename.includes('.git') && !filename.includes('dist') && !filename.includes('node_modules')) {
              try {
                if (fs.existsSync(fullPath)) {
                  if (fs.statSync(fullPath).isDirectory()) {
                    // A new or recreated subdirectory was created, recursively walk and watch it
                    walk(fullPath);
                  }
                } else {
                  // Path was deleted or renamed away; clean up stale watchers on this path or its subtree
                  removeWatcherSubtree(fullPath);
                }
              } catch {
                removeWatcherSubtree(fullPath);
              }
              onFileChanged(false);
            }
          } else {
            if (!fs.existsSync(subDir)) {
              removeWatcherSubtree(subDir);
            }
            onFileChanged(false);
          }
        });

        watcher.on('error', () => {
          if (dirWatchers.get(subDir) === watcher) {
            removeWatcherSubtree(subDir);
          }
        });
        watcher.on('close', () => {
          if (dirWatchers.get(subDir) === watcher) {
            dirWatchers.delete(subDir);
          }
          removeWatcherFromList(watcher);
        });

        dirWatchers.set(subDir, watcher);
        this.watchers.push(watcher);
      } catch {}
    };

    const walk = (currentDir: string) => {
      addWatcher(currentDir);
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.isDirectory() &&
            entry.name !== '.git' &&
            entry.name !== 'node_modules' &&
            entry.name !== 'dist'
          ) {
            walk(path.join(currentDir, entry.name));
          }
        }
      } catch {}
    };

    walk(dir);
  }

  private closeWatchers(): void {
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {}
    }
    this.watchers = [];
  }

  private scheduleBuild(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.triggerBuild();
    }, 150);
  }

  private async triggerBuild(): Promise<void> {
    if (this.isBuilding) {
      this.dirty = true;
      return;
    }

    this.isBuilding = true;
    this.dirty = false;

    try {
      // 1. If manifest changed, reload graph and update watched paths
      if (this.manifestDirty) {
        this.manifestDirty = false;
        const currentDir =
          this.context.kind === 'project'
            ? this.context.project.directory
            : this.context.workspace.directory;
        const reloadedContext = findContext(currentDir, this.options.forceWorkspace);
        if (reloadedContext) {
          this.context = reloadedContext;
          this.setupWatchers();
        }
      }

      console.log(`\n[TSNX Watch] Change detected. Compiling...`);

      // 2. Perform incremental compilation using existing BuildService
      const isWorkspace = this.context.kind === 'workspace' || this.options.forceWorkspace;
      const targetWorkspace =
        this.context.kind === 'workspace'
          ? this.context.workspace
          : this.context.parentWorkspace;

      if (isWorkspace && targetWorkspace) {
        await BuildService.buildWorkspace(targetWorkspace);
      } else if (this.context.kind === 'project') {
        await BuildService.buildProject(this.context.project, {}, this.context.parentWorkspace);
      }

      console.log(`✔ [TSNX Watch] Compilation succeeded.`);

      // 3. Restart application if requested (and this is an executable project)
      if (this.options.runApp && this.context.kind === 'project') {
        const generation = ++this.buildGeneration;
        await this.restartChildProcess(generation);
      }
    } catch (err: unknown) {
      console.error(`\n✖ [TSNX Watch] Compilation failed:`);
      console.error(err instanceof Error ? err.message : err);

      // Stop previous child process on build failure so developer doesn't run stale binary
      this.buildGeneration++;
      await this.stopChildProcess();
      console.log(`[TSNX Watch] Waiting for fixes before restarting...`);
    } finally {
      this.isBuilding = false;

      // 4. Single-flight serialized queue: if dirty flag was set while building, run next build
      if (this.dirty) {
        this.scheduleBuild();
      }
    }
  }

  public setChildProcessForTesting(child: ChildProcess): void {
    this.childProcess = child;
  }

  public async stopChildProcess(killTimeoutMs: number = 2000): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    const child = this.childProcess;
    this.childProcess = undefined;

    return new Promise<void>((resolve) => {
      let isExited = child.exitCode !== null || child.signalCode !== null;
      if (isExited) {
        return resolve();
      }

      let timeout: NodeJS.Timeout | undefined;
      let forceKillTimeout: NodeJS.Timeout | undefined;

      const onExit = () => {
        if (!isExited) {
          isExited = true;
          if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
          }
          if (forceKillTimeout) {
            clearTimeout(forceKillTimeout);
            forceKillTimeout = undefined;
          }
          resolve();
        }
      };

      child.once('exit', onExit);
      child.once('close', onExit);

      // 1. Try graceful SIGTERM
      try {
        child.kill('SIGTERM');
      } catch {
        // Child might have already exited
      }

      // 2. Fallback to SIGKILL if child ignores SIGTERM after killTimeoutMs
      timeout = setTimeout(() => {
        if (!isExited) {
          try {
            child.kill('SIGKILL');
          } catch {
            // Child might have already exited
          }
          // Safety fallback: ensure promise resolves even if exit event doesn't fire
          forceKillTimeout = setTimeout(() => {
            onExit();
          }, 500);
          forceKillTimeout.unref();
        }
      }, killTimeoutMs);
    });
  }

  private async restartChildProcess(generation: number): Promise<void> {
    await this.stopChildProcess();

    // Generation guard: if another build or failure occurred while stopping previous process, abort restart!
    if (generation !== this.buildGeneration) {
      return;
    }

    if (this.context.kind !== 'project') {
      return;
    }

    const project = this.context.project;
    const sourceRoot = project.manifest.spec.source?.root ?? 'src';
    const sourceEntry = project.manifest.spec.source?.entry ?? path.join(sourceRoot, 'main.ts');
    const absSourceRoot = path.resolve(project.directory, sourceRoot);
    const absSourceEntry = path.resolve(project.directory, sourceEntry);
    const relFromRoot = path.relative(absSourceRoot, absSourceEntry);
    const relJs = relFromRoot.replace(/\.tsx?$/, '.js');

    let entryJsPath = path.resolve(project.directory, 'dist', relJs);
    if (!fs.existsSync(entryJsPath)) {
      const fallbackMain = path.resolve(project.directory, 'dist', 'main.js');
      if (fs.existsSync(fallbackMain)) {
        entryJsPath = fallbackMain;
      } else {
        return;
      }
    }

    // Final generation guard immediately before spawn
    if (generation !== this.buildGeneration) {
      return;
    }

    console.log(`[TSNX Watch] Starting application...`);

    const child = spawn(process.execPath, [entryJsPath, ...(this.options.appArgs ?? [])], {
      cwd: project.directory,
      stdio: 'inherit',
      env: { ...process.env },
    });

    this.childProcess = child;

    child.on('error', (err) => {
      console.error(`[TSNX Watch] Error executing process:`, err);
    });
  }

  watchDirectorySubtreeForTesting(dir: string, onFileChanged: (isManifest: boolean) => void): void {
    this.watchDirectorySubtree(dir, onFileChanged);
  }

  closeWatchersForTesting(): void {
    this.closeWatchers();
  }

  getWatcherCountForTesting(): number {
    return this.watchers.length;
  }
}

export async function runWatchCommand(
  context: TsdkContext,
  options: WatchOptions = {},
): Promise<number> {
  const supervisor = new WatchSupervisor(context, options);
  await supervisor.start();
  return 0;
}
