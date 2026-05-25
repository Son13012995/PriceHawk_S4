require('dotenv').config();

const mysql = require("mysql2");

// Creating a MySQL connection pool
const pool = global._mysqlPool || mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'pricecomparison',
  connectionLimit: 50,
});

if (process.env.NODE_ENV !== "production") {
  global._mysqlPool = pool;
}

/**
 * Execute a parameterized SQL query using a connection from the pool.
 * @param {string} sql - SQL string with ? placeholders
 * @param {any[]} params - Bound parameters corresponding to each ?
 * @returns {Promise<any[]>} Resolves with rows array (SELECT) or ResultSetHeader (INSERT/UPDATE/DELETE)
 */
function query(sql, params) {
  return new Promise((resolve, reject) => {
    // Acquiring a connection from the pool
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.query(sql, params, (queryErr, results) => {
        connection.release(); // Releasing the connection
        console.log("Connected to sql..")
        if (queryErr) {
          return reject(queryErr);
        }

        // Resolve thẳng results — KHÔNG wrap tuple [results, fields]
        // Xem JSDoc trên hàm query() để biết anti-pattern cần tránh
        resolve(results);
      });
    });
  });
}

module.exports = {
  query,
};
