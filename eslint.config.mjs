import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig(
  { ignores: ['dist/**', 'main.js', 'node_modules/**', 'jest.config.cjs'] },
  ...obsidianmd.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs']
        }
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'obsidianmd/ui/sentence-case': ['warn', {
        enforceCamelCaseLower: true,
        ignoreWords: ['Sprint', 'Codex', 'Code'],
        ignoreRegex: ['\\.claude']
      }]
    }
  }
);
