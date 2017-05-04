import {ComponentRegistry} from 'metal-component';
import {Component} from 'metal-component';
import {Router} from 'metal-router';
import {globalEval} from 'metal-dom';

/**
 * Custom screen for Magnet binds into metal router lifecycle.
 */
class MagnetScreen extends Router.defaultScreen {
  /**
   * @inheritDoc
   */
  flip() {
    const deferred = super.flip();
    __MAGNET_STATE__ = Router.activeState;
    return deferred;
  }

  /**
   * @inheritDoc
   */
  load(path) {
    return super.load(path)
      .then(async () => {
        const data = this.maybeParseLastLoadedStateAsJson();
        const src = data.__MAGNET_PAGE_SOURCE__;
        const page = data.__MAGNET_PAGE__;
        await this.prefetch(src);
        this.router.component = page;
        return data;
      });
  }

  /**
   * Prefetches script "src" and evaluates it. Relevant to preload pages.
   * @param {string} src
   * @return {Promise}
   */
  prefetch(src) {
    return new Promise((resolve) => {
      globalEval.runFile(src, resolve);
    });
  }
}

Router.defaultScreen = MagnetScreen;

/**
 * Render Metal.js component from component name. Sets component element as
 * the "document.body.firstChild", relevant to start pacthing the entire body
 * with the page contents.
 * @param {string} componentName
 * @param {Object} initialState
 * @return {Component} The rendered component.
 */
window.__MAGNET_RENDER__ = function(componentName, initialState) {
  if (!document.body.firstChild) {
    document.body.insertAdjacentHTML('afterbegin', '<div></div>');
  }
  initialState = initialState || {};
  initialState.element = document.body.firstChild;
  return Component.render(
    ComponentRegistry.getConstructor(componentName), initialState);
};

/**
 * Register page route and component name.
 * @param {!*} path
 * @param {!string} componentName
 * @param {?object=} config
 * @return {Router} The route for the registered component.
 */
window.__MAGNET_REGISTER_PAGE__ = function(
    path,
    componentName,
    config = {
      element: 'body :first-child',
      fetch: true,
      fetchTimeout: 120000,
    }
  ) {
  config.path = normalizePath(path);
  config.component = componentName;
  return Component.render(Router, config);
};

/**
 * Normalize path. Supports evaluation of "regex:" prefixed paths.
 * @param {string} path
 * @return {string|RegExp}
 */
function normalizePath(path) {
  if (path.indexOf('regex:') === 0) {
    let value = path.substring(6);
    let pattern = value.substring(0, value.lastIndexOf('/') + 1);
    let flags = value.substring(value.lastIndexOf('/') + 1);
    return new RegExp(pattern, flags);
  }
  return path;
}
