import path from 'path';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

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

  webpackConfig.entry = getEntries(webpackConfig, files);
  webpackConfig.externals = [nodeExternals()];
  webpackConfig.module.loaders = getLoaders(webpackConfig, dev);
  webpackConfig.plugins = getPlugins(webpackConfig, dev);
  webpackConfig.target= 'node';

  return webpackConfig;
};

/**
 * @param {!Object} webpackConfig
 * @param {!boolean} dev
 * @return {Array.<Object>}
 */
function getPlugins(webpackConfig, dev) {
  const plugins = [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: 'common.js',
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
function getLoaders(webpackConfig, dev) {
  const loaders = [
    {
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: function(modulePath) {
        return /node_modules/.test(modulePath) &&
          !/node_modules\/magnet-plugin-metal\/render\.js/.test(modulePath) ||
          /\.soy.js$/.test(modulePath);
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
  ];
  return webpackConfig.module.loaders.concat(loaders);
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
