/**
 * Test helpers for API routes
 * Simulates HTTP requests to API endpoints
 */

/**
 * Create a mock Next.js request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request object
 */
export function createMockRequest(options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    query = {},
  } = options;

  return {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
    query,
  };
}

/**
 * Create a mock Next.js response object
 * @returns {Object} Mock response object
 */
export function createMockResponse() {
  const response = {
    status: 200,
    statusCode: 200,
    headers: {},
    _getStatusCode() {
      return this.statusCode;
    },
    _getData() {
      return this._data;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this._data = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    end() {
      return this;
    },
  };

  return response;
}

/**
 * Helper for testing GET requests
 * @param {Object} req - Mock request
 * @param {Object} res - Mock response
 * @param {Function} handler - API route handler
 */
export async function testGetRequest(req, res, handler) {
  req.method = 'GET';
  await handler(req, res);
  return res;
}

/**
 * Helper for testing POST requests
 * @param {Object} req - Mock request
 * @param {Object} res - Mock response
 * @param {Function} handler - API route handler
 */
export async function testPostRequest(req, res, handler) {
  req.method = 'POST';
  await handler(req, res);
  return res;
}

/**
 * Helper for testing DELETE requests
 * @param {Object} req - Mock request
 * @param {Object} res - Mock response
 * @param {Function} handler - API route handler
 */
export async function testDeleteRequest(req, res, handler) {
  req.method = 'DELETE';
  await handler(req, res);
  return res;
}
