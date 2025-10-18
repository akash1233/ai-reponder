module.exports = {
  files: ['src/**/*.js', 'tests/**/*.js'],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      require: 'readonly',
      module: 'readonly',
      process: 'readonly',
      Buffer: 'readonly',
      __dirname: 'readonly',
      global: 'readonly',
      console: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      jest: 'readonly',
      describe: 'readonly',
      test: 'readonly',
      it: 'readonly',
      expect: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
      afterAll: 'readonly',
      document: 'readonly',
      window: 'readonly',
      navigator: 'readonly',
      localStorage: 'readonly',
      HTMLElement: 'readonly',
      CustomEvent: 'readonly'
    }
  },
  rules: {
    'no-console': 'off', // Allow console statements in this project
    'no-unused-vars': 'warn',
    'no-undef': 'error',
    'prefer-const': 'warn',
    'no-var': 'warn',
    'eqeqeq': 'warn',
    'curly': 'off', // Allow single-line if statements
    'no-trailing-spaces': 'off', // Allow trailing spaces for now
    'eol-last': 'off' // Allow files without newline at end
  }
};
