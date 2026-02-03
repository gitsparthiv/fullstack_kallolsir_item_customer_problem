import mysql from 'mysql2/promise';
export const pool = mysql.createPool({
    host: process.env.DB_HOST, 
    port: Number(process.env.DB_PORT), 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  export async function pingDatabase() {
    // Simple connectivity check used at startup
    const conn = await pool.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }
  }