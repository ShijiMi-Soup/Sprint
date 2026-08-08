import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function TypeScriptFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    return statSync(path).isDirectory() ? TypeScriptFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('domain architecture', () => {
  it('does not depend on Obsidian or AI integrations', () => {
    for (const file of TypeScriptFiles(join(process.cwd(), 'src/domain'))) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from ['"]obsidian['"]/);
      expect(source).not.toMatch(/claudian|openai|anthropic|personality/i);
    }
  });
});
