import path from 'path';
import es2015 from 'babel-preset-es2015';
import metalJsx from 'babel-preset-metal-jsx';
import webpack from 'webpack';
import fs from 'fs-extra';
import express from 'express';

let isServingMetalFiles = false;

const serveMetalFilesOnce = (magnet, outputDirectory) => {
  if (!isServingMetalFiles) {
    magnet.getServer()
      .getEngine()
      .use('/.metal', express.static(outputDirectory));
  }
  isServingMetalFiles = true;
};

const metalDirectory = '.magnet/metal';

const buildWebpackConfig = (entry, directory, outputDirectory) => {
  const plugins = [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: 'common.js',
      minChunks: 3,
    }),
  ];

  return {
    context: directory,
    entry: entry,
    output: {
      path: outputDirectory,
      filename: '[name]',
    },
    plugins: plugins,
    resolveLoader: {
      modules: [path.join(__dirname, '../node_modules'), 'node_modules'],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [es2015, metalJsx],
            },
          },
        },
      ],
    },
  };
};

export default (magnet) => {
  const config = magnet.getConfig();
  const metalConfig = config.magnet.pluginsConfig.metal;

  let src = ['**/*.js'];
  if (metalConfig && metalConfig.src) {
    src = metalConfig.src;
  }

  let directory = magnet.getDirectory();
  let outputDirectory = path.join(magnet.getDirectory(), metalDirectory);
  let files = magnet.getFiles({directory, src});

  if (!files.length) {
    return;
  }

  fs.removeSync(outputDirectory);

  let entry = {
    'render.js': path.join(__dirname, '../render.js'),
  };
  files.forEach(file => (entry[file] = file));

  const webpackClientConfig = buildWebpackConfig(
    entry,
    directory,
    outputDirectory
  );

  return new Promise((resolve, reject) => {
    webpack(webpackClientConfig, (err, stats) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      const output = stats.toString({
        colors: true,
        chunks: false,
      });
      serveMetalFilesOnce(magnet, outputDirectory);
      resolve(output);
    });
  });
};
