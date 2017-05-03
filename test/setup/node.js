import chai from 'chai';
import jsdom from 'jsdom';

const {JSDOM} = jsdom;
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;

process.env.NODE_ENV = 'test';

global.chai = chai;

require('babel-core/register');
require('./setup')();
