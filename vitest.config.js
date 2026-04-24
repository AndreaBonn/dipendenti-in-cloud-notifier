import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: [
        'src/time-utils.js',
        'src/shared/validation.js',
        'src/background/storage-helpers.js',
        'src/background/schedule-manager.js',
        'src/background/icon-manager.js',
        'src/background/notification-manager.js',
        'src/background/sound-manager.js',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
});
