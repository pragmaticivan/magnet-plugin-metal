import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import jsdom from 'jsdom';
const {JSDOM} = jsdom;
const dom = new JSDOM();
global.document = dom.window.document;
global.window = dom.window;

process.env.NODE_ENV = 'test';

global.chai = chai;
global.sinon = sinon;
global.chai.use(sinonChai);

require('babel-core/register');
require('./setup')();
