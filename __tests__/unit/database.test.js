import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Database Query Function', () => {
  let mockConnection;
  let mockPool;

  beforeEach(() => {
    // Create mock connection
    mockConnection = {
      query: vi.fn(),
      release: vi.fn(),
    };

    // Create mock pool
    mockPool = {
      getConnection: vi.fn(),
    };

    // Mock environment
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.DB_NAME = 'pricecomparison_test';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const createQueryFunction = () => {
    return (sql, params) => {
      return new Promise((resolve, reject) => {
        mockPool.getConnection((err, connection) => {
          if (err) return reject(err);

          connection.query(sql, params, (queryErr, results) => {
            connection.release();
            if (queryErr) return reject(queryErr);
            resolve(results);
          });
        });
      });
    };
  };

  it('should successfully execute a SELECT query', async () => {
    const mockResults = [{ id: 1, name: 'Product' }];

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(null, mockResults);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();
    const results = await queryFunction('SELECT * FROM product WHERE id = ?', [1]);

    expect(results).toEqual(mockResults);
    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('should reject promise when connection fails', async () => {
    const connectionError = new Error('Connection failed');

    mockPool.getConnection.mockImplementation((callback) => {
      callback(connectionError);
    });

    const queryFunction = createQueryFunction();

    await expect(
      queryFunction('SELECT * FROM product', [])
    ).rejects.toEqual(connectionError);
  });

  it('should reject promise when query fails', async () => {
    const queryError = new Error('Query failed');

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(queryError);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();

    await expect(
      queryFunction('SELECT * FROM product WHERE id = ?', [1])
    ).rejects.toEqual(queryError);

    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('should always release connection even when error occurs', async () => {
    const queryError = new Error('Query error');

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(queryError);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();

    try {
      await queryFunction('SELECT * FROM product', []);
    } catch (error) {
      // Expected
    }

    expect(mockConnection.release).toHaveBeenCalled();
  });

  it('should handle INSERT queries and return insertId', async () => {
    const mockResult = { insertId: 42, affectedRows: 1 };

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(null, mockResult);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();
    const result = await queryFunction('INSERT INTO product (name, price) VALUES (?, ?)', ['Product', 99.99]);

    expect(result).toEqual(mockResult);
    expect(result.insertId).toBe(42);
  });

  it('should handle UPDATE queries', async () => {
    const mockResult = { affectedRows: 1, changedRows: 1 };

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(null, mockResult);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();
    const result = await queryFunction('UPDATE product SET price = ? WHERE id = ?', [149.99, 1]);

    expect(result.affectedRows).toBe(1);
    expect(result.changedRows).toBe(1);
  });

  it('should handle DELETE queries', async () => {
    const mockResult = { affectedRows: 2 };

    mockPool.getConnection.mockImplementation((callback) => {
      mockConnection.query.mockImplementation((sql, params, queryCallback) => {
        queryCallback(null, mockResult);
      });
      callback(null, mockConnection);
    });

    const queryFunction = createQueryFunction();
    const result = await queryFunction('DELETE FROM product WHERE category = ?', ['old']);

    expect(result.affectedRows).toBe(2);
  });
});
