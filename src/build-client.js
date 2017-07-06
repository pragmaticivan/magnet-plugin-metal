import path from 'path';
import webpack from 'webpack';
import fs from 'fs-extra';

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
    resolve: {
      alias: {
        'metal-component': path.resolve(
          __dirname, '../node_modules/metal-component/'),
        'metal-incremental-dom': path.resolve(
          __dirname, '../node_modules/metal-incremental-dom/'),
        'metal-soy-bundle': path.resolve(
          __dirname, '../node_modules/metal-soy-bundle/'),
      },
    },
    resolveLoader: {
      modules: [
        path.join(__dirname, '../node_modules'),
        'node_modules',
      ],
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: function(modulePath) {
            return /node_modules/.test(modulePath) &&
              !/node_modules\/magnet-plugin-metal\/render\.js/.test(modulePath);
          },
          query: {
            'presets': ['es2015', 'es2017', 'metal-jsx'],
            'plugins': [
              ['transform-runtime', {
                'polyfill': false,
                'regenerator': true,
              }],
            ],
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
  let outputDirectory = path.join(directory, metalDirectory);
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
      resolve(output);
    });
  });
};
