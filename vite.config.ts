import solid from '@solidjs/vite-plugin'
import { defineConfig, lazyPlugins } from 'vite-plus'

export default defineConfig({
  lint: {
    categories: {
      correctness: 'error',
      perf: 'error',
      suspicious: 'error',
    },
    env: {
      browser: true,
      builtin: true,
    },
    ignorePatterns: [
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
    jsPlugins: [
      'eslint-plugin-solid',
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
    options: {
      denyWarnings: true,
      reportUnusedDisableDirectives: 'error',
    },
    plugins: [
      'import',
      'jsx-a11y',
      'promise',
      'typescript',
      'unicorn',
      'vitest',
    ],
    rules: {
      'import/no-unassigned-import': [
        'error',
        {
          allow: ['**/*.css'],
        },
      ],
      'solid/components-return-once': 'error',
      'solid/event-handlers': 'error',
      'solid/imports': 'error',
      'solid/jsx-no-duplicate-props': 'error',
      'solid/jsx-no-script-url': 'error',
      'solid/jsx-no-undef': 'error',
      'solid/jsx-uses-vars': 'error',
      'solid/no-destructure': 'error',
      'solid/no-innerhtml': 'error',
      'solid/no-react-deps': 'error',
      'solid/no-react-specific-props': 'error',
      'solid/no-unknown-namespaces': 'error',
      'solid/prefer-for': 'error',
      'solid/reactivity': 'error',
      'solid/self-closing-comp': 'error',
      'solid/style-prop': 'error',
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [],
  },
  build: {
    assetsInlineLimit: 0,
    target: 'es2024',
  },
  plugins: lazyPlugins(() => [solid()]),
})
