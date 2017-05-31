import {CancellablePromise} from 'metal-promise';
import {Component} from 'metal-component';
import {globalEval} from 'metal-dom';
import {Router} from 'metal-router';

/**
 * Custom screen for Magnet binds into metal router lifecycle.
 */
class MagnetScreen extends Router.defaultScreen {
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
      return CancellablePromise.resolve(__MAGNET_STATE__);
    }

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
