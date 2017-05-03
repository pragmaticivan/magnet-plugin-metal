import {assertDefAndNotNull, assertString} from 'metal-assertions';
import {isFunction, isObject, isString} from 'metal';
import metalJsx from 'babel-preset-metal-jsx';
import Component from 'metal-component';
import buildSoy from './build-soy';

const defaultLayout = async (req, content, initialState) =>
  `
<html>
<head>
  <meta charset="UTF-8"/>
</head>
<body>
  ${content}
</body>
</html>`;

export default {
  babelPresets() {
    return [metalJsx];
  },

  async build(magnet) {
    await buildSoy(magnet);
  },

  test(module, filename, magnet) {
    return isObject(module.route) && Component.isComponentCtor(module.default);
  },

  register(module, filename, magnet) {
    let path = module.route.path;
    let method = module.route.method || 'get';
    let type = module.route.type || 'html';
    let fileshort = filename.substring(magnet.getServerDistDirectory().length);

    assertString(
      method,
      `Route configuration method must be a string, ` + `check ${fileshort}.`
    );
    assertDefAndNotNull(
      path,
      `Route configuration path must be specified, ` + `check ${fileshort}.`
    );

    let app = magnet.getServer().getEngine();

    app[method.toLowerCase()](path, async (req, res, next) => {
      try {
        if (!res.headersSent) {
          const getInitialState = module.default.getInitialState;
          const renderLayout = module.default.renderLayout || defaultLayout;
          let data;
          if (isFunction(getInitialState)) {
            data = await getInitialState(req);
          }
          if (isContentTypeJson(req)) {
            res.json(data);
          } else {
            const layout = await renderLayout(
              req,
              renderToString(module.default, data),
              data
            );

            res
              .type(type)
              .send('<!DOCTYPE html>' + renderLayoutToString(layout));
          }
        }
      } catch (error) {
        next(error);
      }
    });
  },
};

/**
 * Render incremental dom based components to string.
 * @param {Class} ctor
 * @param {Object} data
 * @return {string}
 */
function renderToString(ctor, data) {
  return Component.renderToString(ctor, data);
}

/**
 * Render incremental dom based layouts to string.
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
 * Check if request content type is application/json.
 * @param {Object} req
 * @return {boolean}
 */
function isContentTypeJson(req) {
  const contentType = req.get('content-type') || '';
  return contentType.toLowerCase().indexOf('application/json') === 0;
}
