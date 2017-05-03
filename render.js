import {Component} from 'metal-component';
import {ComponentRegistry} from 'metal-component';

window.__MAGNET_METAL_RENDER__ = function(componentName, initialState) {
  if (!document.body.firstChild) {
    document.body.insertAdjacentHTML('afterbegin', '<div></div>');
  }
  initialState = initialState || {};
  initialState.element = document.body.firstChild;
  return Component.render(
    ComponentRegistry.getConstructor(componentName), initialState);
};
