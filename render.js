import {CancellablePromise} from 'metal-promise';
import {ComponentRegistry} from 'metal-component';
import {Component} from 'metal-component';
import {globalEval} from 'metal-dom';
import {Router} from 'metal-router';

/**
 * Custom screen for Magnet binds into metal router lifecycle.
 */
class MagnetScreen extends Router.defaultScreen {
  /**
   * @param {string} page Page constructor name.
   * @return {?Component}
   */
  getPageComponentConstructor(page) {
    const component = ComponentRegistry.components_[page];
    if (component) {
      return component;
    }
    return null;
  }

  /**
   * @inheritDoc
   */
  flip() {
    const deferred = super.flip();
    __MAGNET_STATE__ = Router.getActiveState();
    return deferred;
  }

  /**
   * @inheritDoc
   */
  load(path) {
    const firstRender = Router.getActiveComponent() === null;

    if (firstRender) {
      const firstRenderState = __MAGNET_STATE__;
      this.router.lastPath = path;
      this.router.lastLoadedState = firstRenderState;
      return CancellablePromise.resolve(firstRenderState);
    }

    return super.load(path)
      .then(async () => {
        const data = this.maybeParseLastLoadedStateAsJson();
        const page = this.getPageComponentConstructor(data.__MAGNET_PAGE__);
        if (!page) {
          await this.prefetch(data.__MAGNET_PAGE_SOURCE__);
        }
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
 * Returns active component.
 * @type {Router}
 */
window.__MAGNET_COMPONENT__ = function() {
  return Router.getActiveComponent();
}

/**
 * Register page route and component name.
 * @param {!*} path
 * @param {!string} component
 * @return {Router} The route for the registered component.
 */
window.__MAGNET_REGISTER_PAGE__ = function(
    path,
    component,
  ) {
  const config = {
    component,
    element: '#__magnet > :not(script)',
    fetch: true,
    fetchTimeout: 120000,
    path: normalizePath(path),
  };
  return Component.render(Router, config, '#__magnet');
};

/**
 * Returns internal router instance.
 * @type {Router}
 */
window.__MAGNET_ROUTER__ = Router.router();

/**
 * Normalize path. Supports evaluation of "regex:" prefixed paths.
 * @param {string} path
 * @return {string|RegExp}
 */
function normalizePath(path) {
  if (path.indexOf('regex:') === 0) {
    let value = path.substring(6);
    let pattern = value.substring(1, value.lastIndexOf('/'));
    let flags = value.substring(value.lastIndexOf('/') + 1);
    return new RegExp(pattern, flags);
  }
  return path;
}

// Events ----------------------------------------------------------------------

__MAGNET_ROUTER__.on('endNavigate', (data) => {
  // Redirects in case of request error
  if (data.error) {
    if (data.error.requestError) {
      window.location.href = data.path;
    }
    return;
  }
});

__MAGNET_ROUTER__.on('startNavigate', (data) => {
  // Clear router cache after for submission
  if (data.form) {
    __MAGNET_ROUTER__.clearScreensCache();
  }
});
