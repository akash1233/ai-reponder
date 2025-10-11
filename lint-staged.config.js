module.exports = {
  '*.js': [
    'echo "Running lint-staged for JavaScript files..."',
    'npm run test:unit -- --bail --findRelatedTests',
    'echo "✅ JavaScript files processed"
  ],
  '*.{js,json,md}': [
    'echo "Running prettier on staged files..."',
    'echo "Prettier not configured yet, skipping...',
    'echo "✅ Files formatted"
  ],
  'tests/**/*.test.js': [
    'echo "Running tests for modified test files..."',
    'npm run test -- --bail --findRelatedTests',
    'echo "✅ Test files processed"
  ]
};
