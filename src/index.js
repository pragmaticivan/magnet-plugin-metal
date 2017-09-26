import {assertDefAndNotNull, assertString} from 'metal-assertions';
import {isDefAndNotNull, isFunction, isObject, isString} from 'metal';
import {core} from 'metal';
import ESAPI from 'node-esapi';
import metalJsx from 'babel-preset-metal-jsx';
import Component from 'metal-component';
import buildSoy from './build-soy';
import configClientBuild from './config-client-build';
import start from './start';
import nodePath from 'path';

const defaultLayout = (req, content, initialState) =>
  `<html><head></head><body>${content}</body></html>`;
const encoder = ESAPI.encoder();

const routes = [];

export default {
  babelPresets() {
    return [metalJsx];
  },

  async start(magnet) {
    await start(magnet);
  },

  async build(magnet) {
    await buildSoy(magnet);
  },

  async configClientBuild(webpackConfig, magnet) {
    return await configClientBuild(webpackConfig, magnet);
  },

  test(module, filename, magnet) {
    return isObject(module.route)
      && Component.isComponentCtor(module.default) === true;
  },

  register(module, filename, magnet) {
    const config = magnet.getConfig();
    const metalConfig = config.magnet.pluginsConfig.metal;

    let formatFilename = core.identityFunction;
    if (metalConfig && metalConfig.filename) {
      formatFilename = metalConfig.filename;
    }

    let path = module.route.path;
    let method = module.route.method || 'get';
    let type = module.route.type || 'html';
    let page = module.default.name;
    let fileshort = filename.substring(magnet.getServerDistDirectory().length);

    assertString(
      method,
      `Route configuration method must be a string, ` + `check ${fileshort}.`
    );
    assertDefAndNotNull(
      path,
      `Route configuration path must be specified, ` + `check ${fileshort}.`
    );

    registerRoute({path, page});

    let app = magnet.getServer().getEngine();

    app[method.toLowerCase()](path, async (req, res, next) => {
      try {
        if (!res.headersSent) {
          const getInitialState = module.default.getInitialState;
          const renderLayout = module.default.renderLayout || defaultLayout;

          let data = {};
          if (isFunction(getInitialState)) {
            data = await getInitialState(req, res, magnet) || {};
          }

          data.__MAGNET_PAGE__ = module.default.name;
          data.__MAGNET_PAGE_SOURCE__ = formatFilename(
            nodePath.join('/.metal/', fileshort));

          if (isContentTypeJson(req) || isXPJAX(req)) {
            res.set('Cache-Control',
                'no-cache, max-age=0, private, must-revalidate, no-store')
              .json(data);
          } else {
            const layout = await renderLayout(
              req,
              renderToString(module.default, data),
              data
            );

            res
              .type(type)
              .send(
                enhanceLayout(
                  renderLayoutToString(layout), data, formatFilename)
                );
          }
        }
      } catch (error) {
        next(error);
      }
    });
  },
};

/**
 * Asserts layout content has "<body></body>".
 * @param {string} layoutContent
 */
function assertLayoutContainsBody(layoutContent) {
  if (layoutContent.toLowerCase().indexOf('<body') === -1 ||
      layoutContent.toLowerCase().indexOf('</body>') === -1) {
    throw new Error('Error. Page layout does not contain <body></body>".');
  }
}

/**
 * Enhances layout adding doctype and scripts necessary for rendering page.
 * @param {!string} layoutContent
 * @param {!Object} data
 * @param {!Function} formatFilename
 * @return {string}
 */
function enhanceLayout(layoutContent, data, formatFilename) {
  assertLayoutContainsBody(layoutContent);

  const encodedPageSource = encoder.encodeForHTMLAttribute(
    data.__MAGNET_PAGE_SOURCE__
  );
  const encodedMagnetState = encoder.encodeForJavaScript(JSON.stringify(data));
  const encodedMagnetRoutes = encoder.encodeForJavaScript(
    JSON.stringify(routes)
  );

  layoutContent = layoutContent
    .replace(/(<body\b[^>]*>)/i, '$1<div id="__magnet">')
    .replace('</body>',
      `</div>` +
      `<script src="${formatFilename('/.metal/common.js')}"></script>` +
      `<script src="${formatFilename('/.metal/render.js')}"></script>` +
      `<script src="${encodedPageSource}"></script>` +
      `<script>` +
      `__MAGNET_STATE__=JSON.parse('${encodedMagnetState}');` +
      `__MAGNET_ROUTES__=JSON.parse('${encodedMagnetRoutes}');` +
      `document.addEventListener("DOMContentLoaded", function(e) {` +
        `__MAGNET_ROUTES__.forEach(` +
          `function(r) {__MAGNET_REGISTER_PAGE__(r.path, r.page)});` +
        `__MAGNET_ROUTER__.dispatch();` +
      `});` +
      `</script></body>`);

  return `<!DOCTYPE html>${layoutContent}`;
}

/**
 * Renders incremental dom based components to string.
 * @param {Class} ctor
 * @param {Object} data
 * @return {string}
 */
function renderToString(ctor, data) {
  return Component.renderToString(ctor, data);
}

/**
 * Renders incremental dom based layouts to string.
 * @param {function|string} fnOrString
 * @return {string}
 */
function renderLayoutToString(fnOrString) {
  if (isString(fnOrString)) {
    return fnOrString;
  }
  try {
    const element = {};
    IncrementalDOM.patch(element, () => fnOrString);
    return element.innerHTML;
  } catch (error) {
    throw new Error(
      `Metal.js layout type defined in this route cannot be rendered ` +
        `from the server, only String or JSX layouts are supported.`
    );
  }
}

/**
 * Registers route.
 * @param {object} route
 */
function registerRoute(route) {
  if (isRegex(route.path)) {
    route.path = `regex:${route.path.toString()}`;
  }
  routes.push(route);
}

/**
 * Tests if value is regex.
 * @param {*} value
 * @return {boolean}
 */
function isRegex(value) {
  return Object.prototype.toString.call(value) === '[object RegExp]';
}

/**
 * Checks if request content type is application/json.
 * @param {Object} req
 * @return {boolean}
 */
function isContentTypeJson(req) {
  const contentType = req.get('content-type') || '';
  return contentType.toLowerCase().indexOf('application/json') === 0;
}

/**
 * Checks if request contains X-PJAX header.
 * @param {Object} req
 * @return {boolean}
 */
function isXPJAX(req) {
  return isDefAndNotNull(req.get('X-PJAX'));
}
