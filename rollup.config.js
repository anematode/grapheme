import babel from '@rollup/plugin-babel';

export default {
  input: 'src/main.js',
  output: {
    file: 'build/grapheme.js',
    format: 'umd',
    name: 'Grapheme'
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      "plugins": [
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-nullish-coalescing-operator",
        "@babel/plugin-proposal-optional-chaining",
        "@babel/plugin-proposal-private-methods"
      ],
      presets: [
        ['@babel/preset-env', {
          "targets": {
            "chrome": "58",
            //"ie": "11",
            "safari": "12",
            "edge": "84",
            "opera": "68"
          }
        }]
      ]
    })
  ]
}
