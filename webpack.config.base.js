const CopyWebpackPlugin = require('copy-webpack-plugin');
const { lstatSync, readdirSync } = require('fs');
const { join, resolve, basename } = require('path');

const isDirectory = source => lstatSync(source).isDirectory();
const getDirectories = source =>
  readdirSync(source).map(name => join(source, name)).filter(isDirectory);

const EXAMPLES_DIR = './examples';

const entries = getDirectories(EXAMPLES_DIR).reduce((prev, cur) => {
  prev[basename(cur)] = resolve(__dirname, join(cur, 'index.ts'));
  return prev;
}, {});

module.exports = {
  entry: entries,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    filename: '[name].js',
    path: resolve(__dirname, 'docs')
  },
  node: {
    fs: 'empty'
  },
  plugins: [
    new CopyWebpackPlugin([{
      from: 'static',
      to: resolve(__dirname, 'docs', 'static')
    }])
  ]
};