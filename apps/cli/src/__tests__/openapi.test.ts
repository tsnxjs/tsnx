import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const CLI_BIN = fileURLToPath(new URL('../index.js', import.meta.url));

describe('@tsnx/cli openapi export command', () => {
  it('displays openapi help with tsnx openapi --help and tsnx openapi export --help', () => {
    const help1 = execFileSync(process.execPath, [CLI_BIN, 'openapi', '--help'], {
      encoding: 'utf-8',
    });
    assert.ok(help1.includes('TSNX OpenAPI Tools'));
    assert.ok(help1.includes('export [output]'));

    const help2 = execFileSync(process.execPath, [CLI_BIN, 'openapi', 'export', '--help'], {
      encoding: 'utf-8',
    });
    assert.ok(help2.includes('TSNX OpenAPI Tools'));
    assert.ok(help2.includes('--output'));
  });

  it('exports OpenAPI specification from live URL with --url flag', async () => {
    const sampleSpec = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            operationId: 'getItems',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const server = http.createServer((req, res) => {
      if (req.url === '/openapi/v1.json') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(sampleSpec));
      } else {
        res.statusCode = 404;
        res.end();
      }
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as any;
    const url = `http://127.0.0.1:${address.port}/openapi/v1.json`;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-openapi-test-'));
    const outputPath = path.join(tmpDir, 'exported.json');

    try {
      const { stdout: output } = await execFileAsync(
        process.execPath,
        [CLI_BIN, 'openapi', 'export', '--url', url, '-o', outputPath],
        { encoding: 'utf-8' },
      );

      assert.ok(output.includes('Successfully exported OpenAPI specification'));
      assert.ok(fs.existsSync(outputPath));

      const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      assert.strictEqual(parsed.info.title, 'Test API');
      assert.ok(parsed.paths['/items']);
    } finally {
      server.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('exports OpenAPI specification from project directory via tsnx openapi export', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsnx-openapi-proj-'));
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ type: 'module' }),
      'utf-8',
    );

    // Link web package dist so project can import '@tsnx/web'
    const webDistPath = fileURLToPath(new URL('../../../../packages/web/dist/index.js', import.meta.url));
    const webDistUrl = pathToFileURL(webDistPath).href;

    fs.writeFileSync(
      path.join(tmpDir, 'sample-api.tsproj'),
      `
schemaVersion: 1
kind: Project
metadata:
  name: sample-api
spec:
  type: webapi
`,
    );

    fs.writeFileSync(
      path.join(distDir, 'main.js'),
      `
import { WebApplication, Results } from '${webDistUrl}';
const builder = WebApplication.createBuilder();
const app = builder.build();
app.mapGet('/v1/orders', () => Results.ok([])).withName('listOrders');
await app.run();
`,
    );

    const outputPath = path.join(tmpDir, 'openapi.json');

    try {
      const { stdout: output } = await execFileAsync(
        process.execPath,
        [CLI_BIN, 'openapi', 'export', '--no-build', '-o', outputPath],
        { cwd: tmpDir, encoding: 'utf-8' },
      );

      assert.ok(output.includes('Successfully exported OpenAPI specification'));
      assert.ok(fs.existsSync(outputPath));

      const doc = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      assert.strictEqual(doc.openapi, '3.1.0');
      assert.ok(doc.paths['/v1/orders']);
      assert.strictEqual(doc.paths['/v1/orders'].get.operationId, 'listOrders');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
