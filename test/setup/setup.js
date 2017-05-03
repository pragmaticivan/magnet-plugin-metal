import http from 'http';

module.exports = function(root) {
  root = root ? root : global;
  root.expect = root.chai.expect;

  beforeEach(() => {
    root.assertAsyncHttpRequest = assertAsyncHttpRequest;
  });
};


/**
 * Assert async http request
 * @param {String} port
 * @param {String} path
 * @param {integer} status
 * @param {String} responseBody
 * @return {Promise}
 */
function assertAsyncHttpRequest({
  port = 3000,
  path = '',
  status = 200,
  responseBody,
  contentType,
}) {
  return new Promise(resolve => {
    http.get(`http://localhost:${port}${path}`, function(res) {
      let rawData = '';
      res.on('data', chunk => (rawData += chunk));
      res.on('end', () => {
        expect(res.statusCode).to.equal(status);
        if (responseBody) {
          expect(responseBody).to.equal(rawData);
        }
        if (contentType) {
          expect(contentType).to.equal(res.headers['content-type']);
        }
        resolve();
      });
    });
  });
}
