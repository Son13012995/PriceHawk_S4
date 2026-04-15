import mysql from 'mysql2/promise';

let pool;

/**
 * Create and return test database pool
 */
export function getPool() {
  if (!pool) {
    const config = {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      database: process.env.DB_NAME || 'pricecomparison',
      port: parseInt(process.env.DB_PORT || '3307'),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    };
    
    console.log('Initializing DB pool with config:', { 
      ...config, 
      password: '***' 
    });
    
    pool = mysql.createPool(config);
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
      brand: 'Test Brand',
      current_price: 100,
      ...productData,
    };

    const [result] = await connection.execute(
      'INSERT INTO product (name, description, brand, current_price) VALUES (?, ?, ?, ?)',
      [data.name, data.description, data.brand, data.current_price]
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
      user_id: 1,
      target_price: 50,
      status: 'active',
      ...alertData,
    };

    const [result] = await connection.execute(
      'INSERT INTO price_alert (product_id, user_id, target_price, status) VALUES (?, ?, ?, ?)',
      [data.product_id, data.user_id, data.target_price, data.status]
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
