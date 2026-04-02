const path = require("path");
require("dotenv").config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

const mysql = require("mysql2");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: (process.env.DB_USER || "").trim(),
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "priceComparison",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
};

if (!dbConfig.user) {
  console.error(
    "Database config error: DB_USER is empty. Please set DB_USER in .env file."
  );
}

// Creating a MySQL connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Function to execute SQL queries using a connection from the pool.
 * @param {string} sql - The SQL query to be executed.
 * @param {Array} params - An array of parameters to be used in the SQL query.
 * @returns {Promise} - A promise that resolves with the query results or rejects with an error.
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

        resolve(results);
      });
    });
  });
}

module.exports = {
  query,
};
