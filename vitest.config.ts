import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './tests/constants.js';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: './tests/global-setup.ts',
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
