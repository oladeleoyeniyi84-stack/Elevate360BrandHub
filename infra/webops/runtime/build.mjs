import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
mkdirSync('infra/webops/runtime/generated', { recursive: true });
for (const name of ['networkGuard', 'phase3GatewayPolicy', 'pinnedHttpsTransport']) {
  const source = readFileSync(`server/webops/${name}.ts`, 'utf8');
  const output = stripTypeScriptTypes(source).replace(/from "\.\/([^"]+)"/g, 'from "./$1.mjs"');
  writeFileSync(`infra/webops/runtime/generated/${name}.mjs`, output);
}
