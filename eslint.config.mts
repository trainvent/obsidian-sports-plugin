import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json', 'tests/*.mjs'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
 { rules: { 'obsidianmd/ui/sentence-case': ['warn', { brands: ['Garmin', 'Obsidian', 'Markdown'], ignoreWords: ['YYYY-MM-DD'], ignoreRegex: ['^YYYY-MM-DD$'] }] } },
 // Obsidian desktop plugins load built-ins through CommonJS, after a desktop guard.
 { files: ['src/workbook/local-file.ts'], languageOptions: { globals: { require: 'readonly' } }, rules: { '@typescript-eslint/no-require-imports': ['error', { allow: ['^(os|path|fs)$'] }] } },
 { files: ['tests/*.mjs'], languageOptions: { globals: globals.node }, rules: { 'obsidianmd/no-nodejs-modules': 'off', 'obsidianmd/no-global-this': 'off' } },
);
