const path = require('node:path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Recipe (webpack 5 — no built-in node polyfills):
//   - resolve.fallback `stream: false` so `require('stream')` (pulled in by
//     @solana-program/program-metadata → @iarna/toml, only inside unused TOML
//     paths) resolves to nothing instead of erroring.
//   - ProvidePlugin supplies browser `Buffer`/`process` to the bundled code that
//     references them. webpack 5 already provides `global`.
module.exports = {
    entry: './src/main.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
        clean: true,
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: { stream: false },
    },
    module: {
        rules: [{ test: /\.ts$/, loader: 'ts-loader', options: { transpileOnly: true } }],
    },
    plugins: [
        new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'], process: 'process/browser' }),
        new HtmlWebpackPlugin({ template: './src/index.html' }),
    ],
};
