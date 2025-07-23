// functions/init-db.js (example)
const db = require('./db');

async function createUsersTable() {
  const conn = await db.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          line_user_id VARCHAR(64) NOT NULL UNIQUE,
          calling_name VARCHAR(255),
          age INT,
          tone VARCHAR(255),
          personality VARCHAR(255),
          answers JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created or already exists.');
  } catch (err) {
    console.error('Error creating users table:', err);
  } finally {
    conn.release();
  }
}

createUsersTable();
