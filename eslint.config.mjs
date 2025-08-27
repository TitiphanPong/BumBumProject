// eslint.config.js
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import eslintParserTs from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: eslintParserTs,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      '@next/next': nextPlugin,
    },
    rules: {
      // ✅ ตัวอย่าง rule
      '@typescript-eslint/no-explicit-any': 'off',
      '@next/next/no-img-element': 'error', // ตัวอย่าง rule ของ Next.js
    },
  },
];

// import eslintPluginTs from '@typescript-eslint/eslint-plugin';
// import eslintParserTs from '@typescript-eslint/parser';

// /** @type {import('eslint').Linter.Config} */
// export default [
//   {
//     files: ['**/*.ts', '**/*.tsx'],
//     languageOptions: {
//       parser: eslintParserTs,
//       parserOptions: {
//         project: './tsconfig.json',
//       },
//     },
//     plugins: {
//       '@typescript-eslint': eslintPluginTs,
//     },
//     rules: {
//       '@typescript-eslint/no-explicit-any': 'off', // ✅ ปิดการเตือนการใช้ any
//     },
//   },
// ];
