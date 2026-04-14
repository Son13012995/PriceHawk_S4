import mysql from 'mysql2/promise';

let pool;

/**
 * Create and return test database pool
 */
export async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'testuser',
      password: process.env.DB_PASSWORD || 'testpass',
      database: process.env.DB_NAME || 'pricecomparison_test',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

/**
 * Close database pool
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Execute cleanup SQL - delete test data
 * Run this after each test to reset database state
 */
export async function cleanupDatabase() {
  const connection = await getPool().getConnection();
  try {
    // Disable foreign key checks for cleanup
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Delete from tables in appropriate order
    await connection.execute('DELETE FROM wishlist');
    await connection.execute('DELETE FROM price_alert');
    await connection.execute('DELETE FROM comparison');
    await connection.execute('DELETE FROM product');

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('Database cleanup error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Insert test product data
 */
export async function insertTestProduct(productData = {}) {
  const connection = await getPool().getConnection();
  try {
    const data = {
      name: 'Test Product',
      description: 'Test Description',
      category: 'Test Category',
      price: 100,
      ...productData,
    };

    const [result] = await connection.execute(
      'INSERT INTO product (name, description, category, price) VALUES (?, ?, ?, ?)',
      [data.name, data.description, data.category, data.price]
    );

    return result.insertId;
  } finally {
    connection.release();
  }
}

/**
 * Insert test price alert
 */
export async function insertTestAlert(alertData = {}) {
  const connection = await getPool().getConnection();
  try {
    const data = {
      product_id: 1,
      target_price: 50,
      user_email: 'test@example.com',
      status: 'active',
      ...alertData,
    };

    const [result] = await connection.execute(
      'INSERT INTO price_alert (product_id, target_price, user_email, status) VALUES (?, ?, ?, ?)',
      [data.product_id, data.target_price, data.user_email, data.status]
    );

    return result.insertId;
  } finally {
    connection.release();
  }
}

/**
 * Insert test wishlist item
 */
export async function insertTestWishlistItem(itemData = {}) {
  const connection = await getPool().getConnection();
  try {
    const data = {
      product_id: 1,
      user_id: 'test-user',
      ...itemData,
    };

    const [result] = await connection.execute(
      'INSERT INTO wishlist (product_id, user_id) VALUES (?, ?)',
      [data.product_id, data.user_id]
    );

    return result.insertId;
  } finally {
    connection.release();
  }
}
