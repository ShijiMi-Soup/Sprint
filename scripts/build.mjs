import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import process from 'node:process';

import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const shared = {
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/state', '@codemirror/view'],
  logLevel: 'info',
  platform: 'browser',
  sourcemap: watch ? 'inline' : false,
  target: 'es2022',
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
copyFileSync('src/style/styles.css', 'styles.css');

const builds = [
  {
    ...shared,
    entryPoints: ['src/main.ts'],
    format: 'cjs',
    outfile: 'main.js',
  },
  {
    ...shared,
    entryPoints: ['src/index.ts'],
    format: 'esm',
    outfile: 'dist/index.js',
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map((options) => esbuild.context(options)));
  await Promise.all(contexts.map((context) => context.watch()));
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
  execFileSync('npx', ['tsc', '--project', 'tsconfig.build.json'], { stdio: 'inherit' });
}
