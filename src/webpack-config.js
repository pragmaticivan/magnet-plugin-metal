import babelPresetEnv from 'babel-preset-env';
import babelPresetJsx from 'babel-preset-metal-jsx';
import path from 'path';
import webpack from 'webpack';

export default (webpackConfig, magnet) => {
  const config = magnet.getConfig();
  const metalConfig = config.magnet.pluginsConfig.metal;
  const dev = config.magnet.dev;

  let src = ['**/*.js'];
  if (metalConfig && metalConfig.src) {
    src = metalConfig.src;
  }

  const directory = magnet.getDirectory();
  const files = magnet.getFiles({directory, src});

  if (!files.length) {
    return webpackConfig;
  }

  prepareMagnetConfig(webpackConfig, files, dev);

  return webpackConfig;
};

/**
 * Modifies the provided webpackConfig reference.
 * @param {!Object} webpackConfig
 * @param {!Array} files
 * @param {!boolean} dev
 */
function prepareMagnetConfig(webpackConfig, files, dev) {
  webpackConfig.entry = getEntries(webpackConfig, files);
  webpackConfig.module.rules = getRules(webpackConfig, dev);
  webpackConfig.plugins = getPlugins(webpackConfig, dev);
}

/**
 * @param {!Object} webpackConfig
 * @param {!boolean} dev
 * @return {Array.<Object>}
 */
function getPlugins(webpackConfig, dev) {
  const plugins = [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: 'metal/common.js',
      minChunks: 3,
    }),
  ];
  if (!dev) {
    plugins.push(new webpack.optimize.UglifyJsPlugin({
      mangle: {
        keep_fnames: true,
      },
      output: {
        comments: false,
      },
      compress: {
        keep_fnames: true,
        warnings: false,
      },
    }));
  }
  return webpackConfig.plugins.concat(plugins);
}

/**
 * @param {!Object} webpackConfig
 * @param {!boolean} dev
 * @return {Array.<Object>}
 */
function getRules(webpackConfig, dev) {
  const rules = [
    {
      test: /\.js$/,
      exclude: function(modulePath) {
        return /node_modules/.test(modulePath) &&
          !/node_modules\/magnet-plugin-metal\/render\.js/.test(modulePath);
      },
      use: [
        {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            cacheDirectory: true,
            presets: [babelPresetEnv , babelPresetJsx],
            plugins: ['transform-runtime'],
          },
        },
      ],
    },
  ];
  return webpackConfig.module.rules.concat(rules);
}

/**
 * @param {!Object} webpackConfig
 * @param {!Array} files
 * @return {Object}
 */
function getEntries(webpackConfig, files) {
  const entries = webpackConfig.entry;
  entries['metal/render.js'] = path.join(__dirname, '../render.js');

  files.forEach(file => {
    const entryName = path.join('metal', file);
    if (!entries[entryName]) {
      entries[entryName] = file;
    }
  });
  return entries;
}
