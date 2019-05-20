module.exports = {
    extends: "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 8,
        "sourceType": "module"
    },
    rules: {
        indent: ['error', 4],
        quotes: ['error', 'single'],
        semi: ['error', 'always'],
        "max-len": [
            'error',
            {
                'code': 130,
                'ignoreTrailingComments': true,
                'ignoreUrls': true,
                'ignoreStrings': true,
                'ignoreTemplateLiterals': true,
                'ignoreRegExpLiterals': true,
            },
          ],
          "no-trailing-spaces": ["error"],
          "no-console": "off",


    },
    env: {
        "browser": true,
        "node": true,
        "es6": true
    },


};