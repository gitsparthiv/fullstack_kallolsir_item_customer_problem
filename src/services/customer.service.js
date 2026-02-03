import { pool } from '../config/database.js';

// Columns safe to expose
const PUBLIC_COLUMNS = 'CustomerID, CustomerDescription, Priority';

export async function getCustomerbyID(CustomerID) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Customer\`
     WHERE CustomerID = ?
     LIMIT 1`,
    [CustomerID]
  );

  return rows[0] || null;
}
export async function listCustomers({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM 092_Customer ORDER BY CustomerID ASC LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );
  return rows;
}
export async function createCustomer({ CustomerDescription, Priority }) {
  const [result] = await pool.query(
    `INSERT INTO \`092_Customer\` (CustomerDescription, Priority)
     VALUES (?, ?)`,
    [CustomerDescription, Priority]
  );

  return {
    CustomerID: result.insertId,
    CustomerDescription,
    Priority
  };
}
export async function patchCustomerById(CustomerID, fields) {
  const allowedFields = ['CustomerDescription', 'Priority'];
  const updates = [];
  const values = [];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) return false;

  values.push(CustomerID);

  const [result] = await pool.query(
    `UPDATE \`092_Customer\`
     SET ${updates.join(', ')}
     WHERE CustomerID = ?`,
    values
  );

  return result.affectedRows > 0;
}
export async function deleteCustomerById(CustomerID) {
  const [result] = await pool.query(
    `DELETE FROM \`092_Customer\` WHERE CustomerID = ?`,
    [CustomerID]
  );

  return result.affectedRows > 0;
}
