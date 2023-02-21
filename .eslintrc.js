module.exports = {
    env: {
        browser: true,
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'script',
    },
    plugins: ['prettier'],
    rules: {
        'no-var': 'warn',
        'no-unused-vars': 'warn',
        'no-undef': 'off',
        'brace-style': 'warn',
        'prefer-template': 'warn',
        radix: 'warn',
        'space-before-blocks': 'warn',
        'prettier/prettier': 'warn',
    },
}
