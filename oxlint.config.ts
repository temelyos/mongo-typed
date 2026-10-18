import temelyos from '@temelyos/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [temelyos],
	ignorePatterns: ['**/dist/**', '**/scripts/**', 'oxlint.config.ts', 'test.ts'],
	options: { typeAware: true }
});
