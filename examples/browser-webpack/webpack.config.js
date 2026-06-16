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
    module: {
        rules: [{ loader: 'ts-loader', options: { transpileOnly: true }, test: /\.ts$/ }],
    },
    output: {
        clean: true,
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new webpack.ProvidePlugin({ Buffer: ['buffer', 'Buffer'], process: 'process/browser' }),
        new HtmlWebpackPlugin({ template: './src/index.html' }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: { stream: false },
    },
};
