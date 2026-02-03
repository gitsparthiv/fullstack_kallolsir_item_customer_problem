import { pool } from '../config/database.js';

// Columns safe to expose
const PUBLIC_COLUMNS = 'ItemID, ItemDescription, Quantity';

// Get one item by ID
export async function getItemById(ItemID) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Items\`
     WHERE ItemID = ?
     LIMIT 1`,
    [ItemID]
  );

  return rows[0] || null;
}

// List items (with pagination)
export async function listItems({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Items\`
     ORDER BY ItemID ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  return rows;
}

// Create a new item (manual stock entry)
export async function createItem({ ItemDescription, Qty }) {
  const [result] = await pool.query(
    `INSERT INTO \`092_Items\` (ItemDescription, Qty)
     VALUES (?, ?)`,
    [ItemDescription, Qty]
  );

  return {
    ItemID: result.insertId,
    ItemDescription,
    Qty
  };
}

// Patch (partial update) item
export async function patchItemById(ItemID, fields = {}) {
  const allowedFields = ['ItemDescription', 'Quantity'];
  const updates = [];
  const values = [];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) return false;

  values.push(ItemID);

  const [result] = await pool.query(
    `UPDATE \`092_Items\`
     SET ${updates.join(', ')}
     WHERE ItemID = ?`,
    values
  );

  return result.affectedRows > 0;
}

// Delete item by ID
export async function deleteItemById(ItemID) {
  const [result] = await pool.query(
    `DELETE FROM \`092_Items\`
     WHERE ItemID = ?`,
    [ItemID]
  );

  return result.affectedRows > 0;
}
