module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/renderer/overlay.html',
    '!src/renderer/index.html',
    '!src/renderer/styles.css'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 15000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/(main|ai-service|text-monitor|suggestion-overlay|integration).test.js']
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/renderer.test.js']
    }
  ]
};
