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
     maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 16,
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
 { rules: { 'obsidianmd/ui/sentence-case': ['warn', { brands: ['Nextcloud', 'Garmin Coach', 'Garmin', 'Obsidian', 'Markdown'], ignoreWords: ['YYYY-MM-DD'], ignoreRegex: ['^YYYY-MM-DD$'] }] } },
 { files: ['tests/*.mjs'], languageOptions: { globals: globals.node }, rules: { 'obsidianmd/no-nodejs-modules': 'off', 'obsidianmd/no-global-this': 'off' } },
);
