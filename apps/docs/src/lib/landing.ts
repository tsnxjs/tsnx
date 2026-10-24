export const landingExample = `import { WebApplication, Results, body } from '@tsnx/web';

const NewWarehouse = { name: String, capacity: Number };

const builder = WebApplication.createBuilder();
const app = builder.build();

app.mapPost('/warehouses', [body(NewWarehouse)], (warehouse) => {
  return Results.created(warehouse);
})
  .withName('CreateWarehouse')
  .withTags('Inventory')
  .produces(201);

await app.run();`;

export const installCommand = "npm install -g @tsnx/cli@2.0.0-rc.2";

export const workspaceTree = `Acme/
├── Entrypoints/
│   └── Host/
├── Modules/
│   └── Inventory/
├── Shared/
│   └── SharedKernel/
├── .editorconfig
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json`;
