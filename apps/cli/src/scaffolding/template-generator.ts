import * as fs from 'node:fs';
import * as path from 'node:path';
import { derivePackageName, toKebabCase, VERSION } from '@tsnx/core';

export type TemplateType = 'console' | 'library' | 'webapi';

export interface CreateProjectOptions {
  name: string;
  template: TemplateType;
  targetDir?: string;
  scope?: string;
  workspaceName?: string;
}

export { toKebabCase };

export class TemplateGenerator {
  static createProject(options: CreateProjectOptions): string {
    const { name, template } = options;

    let projectDir: string;
    if (options.targetDir) {
      const resolvedTarget = path.resolve(process.cwd(), options.targetDir);
      const base = path.basename(resolvedTarget).toLowerCase();
      const nameLower = name.toLowerCase();
      if (base === nameLower || nameLower.endsWith('.' + base) || nameLower.endsWith('-' + base)) {
        projectDir = resolvedTarget;
      } else {
        projectDir = path.join(resolvedTarget, name);
      }
    } else {
      projectDir = path.resolve(process.cwd(), name);
    }

    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir);
      if (files.length > 0) {
        throw new Error(`Directory "${projectDir}" already exists and is not empty.`);
      }
    } else {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const srcDir = path.join(projectDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Derive package identity
    const pkgName = derivePackageName(name, options.scope, options.workspaceName);

    // 1. Native tsconfig.json (Project References compatible)
    const tsconfigJson: Record<string, any> = {
      compilerOptions: {
        composite: true,
        ...(template === 'library'
          ? {
              declaration: true,
              declarationMap: true,
            }
          : {}),
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        target: 'ES2022',
        rootDir: 'src',
        outDir: 'dist',
        strict: true,
        skipLibCheck: true,
        types: ['node'],
      },
      include: ['src/**/*.ts'],
      references: [],
    };
    fs.writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify(tsconfigJson, null, 2) + '\n',
      'utf-8',
    );

    if (template === 'console') {
      // package.json
      const pkgJson = {
        name: pkgName,
        version: '0.1.0',
        type: 'module',
        main: './dist/main.js',
        tsnx: {
          name,
          type: 'console',
        },
        devDependencies: {
          '@types/node': '^22.13.9',
        },
      };
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify(pkgJson, null, 2) + '\n',
        'utf-8',
      );

      // src/main.ts
      const mainTsContent = `console.log('Hello from ${name}!');
`;
      fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTsContent, 'utf-8');
    } else if (template === 'library') {
      // package.json
      const pkgJson = {
        name: pkgName,
        version: '0.1.0',
        type: 'module',
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        exports: {
          '.': {
            types: './dist/index.d.ts',
            import: './dist/index.js',
            default: './dist/index.js',
          },
        },
        tsnx: {
          name,
          type: 'library',
        },
        devDependencies: {
          '@types/node': '^22.13.9',
        },
      };
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify(pkgJson, null, 2) + '\n',
        'utf-8',
      );

      // src/index.ts
      const indexTsContent = `export function add(a: number, b: number): number {
  return a + b;
}
`;
      fs.writeFileSync(path.join(srcDir, 'index.ts'), indexTsContent, 'utf-8');
    } else if (template === 'webapi') {
      // package.json
      const pkgJson = {
        name: pkgName,
        version: '0.1.0',
        type: 'module',
        main: './dist/main.js',
        tsnx: {
          name,
          type: 'webapi',
        },
        dependencies: {
          '@tsnx/web': `^${VERSION}`,
        },
        devDependencies: {
          '@types/node': '^22.13.9',
        },
      };
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify(pkgJson, null, 2) + '\n',
        'utf-8',
      );

      // src/main.ts
      const mainTsContent = `import process from 'node:process';
import { WebApplication, Results } from '@tsnx/web';

const builder = WebApplication.createBuilder(process.argv.slice(2));

// Configure server (reads PORT environment variable or defaults to 3000)
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
builder.configureServer({ port, host: '0.0.0.0' });

const app = builder.build();

app.mapGet('/', () => {
  return Results.json({ message: 'Welcome to ${name} API!' });
});

app.mapGet('/health', () => {
  return Results.json({ status: 'ok', timestamp: new Date().toISOString() });
});

await app.run();
`;
      fs.writeFileSync(path.join(srcDir, 'main.ts'), mainTsContent, 'utf-8');
    } else {
      throw new Error(`Unsupported template "${template}". Supported templates: console, library, webapi.`);
    }

    return projectDir;
  }
}
