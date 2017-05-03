import Magnet from 'magnet';
import path from 'path';
import pluginMetal from '../../src/index';
import Component from 'metal-component';
import {JSXComponent} from 'metal-jsx';

describe('pluginMetal', () => {
  describe('.test', () => {
    it('should return true if module is a metal soy component', function() {
      const mod = {};
      mod.route = {};

      class SoyExample extends Component {
        static async getInitialState(req) {
          return req.query;
        }
      }

      mod.default = SoyExample;

      expect(pluginMetal.test(mod, null, null)).to.be.true;
    });

    it('should return true if module is a metal jsx component', function() {
      const mod = {};
      mod.route = {};

      class JsxExample extends JSXComponent {
        static async getInitialState(req) {
          return req.query;
        }

        render() {
          return <div>
            <h1>Hello {this.props.attr}!</h1>
            <a href="/page1">Navigate</a>
          </div>
        }
      };

      mod.default = JsxExample;

      expect(pluginMetal.test(mod, null, null)).to.be.true;
    });

    it('should return false if module is not a metal component', function() {
      const mod = {};
      mod.route = {};
      mod.default = () => {};

      expect(pluginMetal.test(mod, null, null)).to.be.false;
    });
  });

  describe('.register', () => {
    const directory = `${process.cwd()}/test/fixtures/empty`;

    it('should throw exception if route method is not string', () => {
      const magnet = new Magnet({directory});
      const mod = {
        route: {
          path: '/fn',
          method: 1,
        },
      };
      mod.default = function() {};
      expect(function() {
        pluginMetal.register(
          mod,
          path.join(magnet.getServerDistDirectory(), 'filename.js'),
          magnet
        );
      }).to.throw(
        Error,
        'Route configuration method must be a string, check /filename.js.'
      );
    });

    it('should throw an error if route configuration path is null', () => {
      const magnet = new Magnet({directory});
      const mod = {
        route: {
          path: null,
        },
      };
      mod.default = function() {};
      expect(function() {
        pluginMetal.register(
          mod,
          path.join(magnet.getServerDistDirectory(), 'filename.js'),
          magnet
        );
      }).to.throw(
        Error,
        'Route configuration path must be specified, check /filename.js.'
      );
    });

    it('should throw an error if route configuration path is undefined', () => {
      const magnet = new Magnet({directory});
      const mod = {
        route: {},
      };
      mod.default = function() {};
      expect(function() {
        pluginMetal.register(
          mod,
          path.join(magnet.getServerDistDirectory(), 'filename.js'),
          magnet
        );
      }).to.throw(
        Error,
        'Route configuration path must be specified, check /filename.js.'
      );
    });
  });
});
