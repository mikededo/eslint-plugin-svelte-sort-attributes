import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import plugin from './index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const collectTsFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const resolvedPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTsFiles(resolvedPath);
    }

    return resolvedPath.endsWith('.ts') ? [resolvedPath] : [];
  }));

  return files.flat();
};

describe('plugin entry', () => {
  it('exports flat config presets only', () => {
    expect(plugin.configs).toMatchObject({
      'recommended-alphabetical': expect.any(Object),
      'recommended-line-length': expect.any(Object),
      'recommended-natural': expect.any(Object)
    });
    expect((plugin.configs as Record<string, unknown>)['recommended-alphabetical-legacy']).toBeUndefined();
    expect((plugin.configs as Record<string, unknown>)['recommended-line-length-legacy']).toBeUndefined();
    expect((plugin.configs as Record<string, unknown>)['recommended-natural-legacy']).toBeUndefined();
  });
});

describe('typescript-eslint import compatibility', () => {
  it('does not use root @typescript-eslint/utils imports', async () => {
    const rootImportPattern = /^\s*import(?:\s+type)?[\s\S]*?from\s+['"]@typescript-eslint\/utils['"];\s*$/gm;
    const tsFiles = await collectTsFiles(__dirname);
    const offendingImports: string[] = [];

    await Promise.all(
      tsFiles.map(async (filePath) => {
        const content = await readFile(filePath, 'utf8');
        const matches = content.match(rootImportPattern);
        if (matches?.length) {
          offendingImports.push(
            ...matches.map((match) => `${path.relative(__dirname, filePath)}: ${match.trim()}`)
          );
        }
      })
    );

    expect(offendingImports).toEqual([]);
  });
});
