import { pool } from '../config/database.js';

// Columns safe to expose
const PUBLIC_COLUMNS = 'OrderId, CustomerID, ItemID, Qty, DiscountPercentage, TotalPrice';

// Get one order by ID(GET request by ID)
export async function getOrderById(OrderId) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Orders\`
     WHERE OrderId = ?
     LIMIT 1`,
    [OrderId]
  );

  return rows[0] || null;
}

// List orders (with pagination)(GET request for all)
export async function listOrders({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Orders\`
     ORDER BY OrderId ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  return rows;
}

// Create a new order(POST request for a new order)
export async function createOrder({ CustomerID, ItemID, Qty,DiscountPercentage }) {
  const connection = await pool.getConnection();

  try {
    // 1️⃣ Start transaction
    await connection.beginTransaction();

    // 2️⃣ Check item stock (lock row)
    const [[item]] = await connection.query(
      `SELECT Quantity, Price
       FROM \`092_Items\`
       WHERE ItemID = ?
       FOR UPDATE`,
      [ItemID]
    );

    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }
  // ✅ FORCE numbers
  const qty = Number(Qty);
  const price = Number(item.Price);
  const discount = Number(DiscountPercentage ?? 0);

  // ✅ VALIDATE numbers
  if (Number.isNaN(qty) || qty <= 0) {
    throw new Error('INVALID_QTY');
  }

  if (Number.isNaN(price)) {
    throw new Error('INVALID_PRICE');
  }

  if (Number.isNaN(discount) || discount < 0 || discount > 100) {
    throw new Error('INVALID_DISCOUNT');
  }


    if (item.Quantity < qty) {
      throw new Error('INSUFFICIENT_STOCK');
    }

// 💰 SAFE calculations
const subtotal = price * qty;
const discountAmount = subtotal * (discount / 100);
const totalPrice = subtotal - discountAmount;

    // 3️⃣ Insert order
    const [result] = await connection.query(
      `INSERT INTO \`092_Orders\` (CustomerID, ItemID, Qty, DiscountPercentage, TotalPrice)
       VALUES (?, ?, ?, ?, ?)`,
      [CustomerID, ItemID, qty, discount, totalPrice]
    );

    // 4️⃣ Reduce item stock
    await connection.query(
      `UPDATE \`092_Items\`
       SET Quantity = Quantity - ?
       WHERE ItemID = ?`,
      [qty, ItemID]
    );

    // 5️⃣ Priority rule
    if (Qty > 10) {
      await connection.query(
        `UPDATE \`092_Customer\`
         SET Priority = true
         WHERE CustomerID = ?`,
        [CustomerID]
      );
    }
    


    // 6️⃣ Commit transaction
    await connection.commit();

    return {
      OrderId: result.insertId,
      CustomerID,
      ItemID,
      Qty: qty,
      DiscountPercentage: discount,
      TotalPrice: totalPrice
    };

  } catch (err) {
    // ❌ Rollback on error
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}


// Patch (partial update) order
export async function patchOrderById(OrderId, fields = {}) {
    const connection = await pool.getConnection();
  
    try {
      await connection.beginTransaction();
  
      // 1️⃣ Get existing order (lock it)
      const [[order]] = await connection.query(
        `SELECT CustomerID, ItemID, Qty
         FROM \`092_Orders\`
         WHERE OrderId = ?
         FOR UPDATE`,
        [OrderId]
      );
  
      if (!order) {
        await connection.rollback();
        return false;
      }
  
      const oldItemID = order.ItemID;
      const oldQty = order.Qty;
  
      const newItemID = fields.ItemID ?? oldItemID;
      const newQty = fields.Qty ?? oldQty;
  
      // 2️⃣ If item changed → restore old stock
      if (newItemID !== oldItemID) {
        await connection.query(
          `UPDATE \`092_Items\`
           SET Quantity = Quantity + ?
           WHERE ItemID = ?`,
          [oldQty, oldItemID]
        );
  
        // check stock for new item
        const [[newItem]] = await connection.query(
          `SELECT Quantity
           FROM \`092_Items\`
           WHERE ItemID = ?
           FOR UPDATE`,
          [newItemID]
        );
  
        if (!newItem || newItem.Quantity < newQty) {
          throw new Error('INSUFFICIENT_STOCK');
        }
  
        await connection.query(
          `UPDATE \`092_Items\`
           SET Quantity = Quantity - ?
           WHERE ItemID = ?`,
          [newQty, newItemID]
        );
      }
      // 3️⃣ Same item → adjust by difference
      else if (newQty !== oldQty) {
        const diff = newQty - oldQty;
  
        if (diff > 0) {
          const [[item]] = await connection.query(
            `SELECT Quantity
             FROM \`092_Items\`
             WHERE ItemID = ?
             FOR UPDATE`,
            [oldItemID]
          );
  
          if (item.Quantity < diff) {
            throw new Error('INSUFFICIENT_STOCK');
          }
  
          await connection.query(
            `UPDATE \`092_Items\`
             SET Quantity = Quantity - ?
             WHERE ItemID = ?`,
            [diff, oldItemID]
          );
        } else {
          // qty reduced → restore stock
          await connection.query(
            `UPDATE \`092_Items\`
             SET Quantity = Quantity + ?
             WHERE ItemID = ?`,
            [Math.abs(diff), oldItemID]
          );
        }
      }
  
      // 4️⃣ Update order itself
      const updates = [];
      const values = [];
  
      if (fields.CustomerID !== undefined) {
        updates.push('CustomerID = ?');
        values.push(fields.CustomerID);
      }
      if (fields.ItemID !== undefined) {
        updates.push('ItemID = ?');
        values.push(fields.ItemID);
      }
      if (fields.Qty !== undefined) {
        updates.push('Qty = ?');
        values.push(fields.Qty);
      }
  
      if (updates.length === 0) {
        await connection.rollback();
        return false;
      }
  
      values.push(OrderId);
  
      await connection.query(
        `UPDATE \`092_Orders\`
         SET ${updates.join(', ')}
         WHERE OrderId = ?`,
        values
      );
  
      // 5️⃣ Priority rule
      if (newQty > 10) {
        await connection.query(
          `UPDATE \`092_Customer\`
           SET Priority = true
           WHERE CustomerID = ?`,
          [order.CustomerID]
        );
      }
  
      await connection.commit();
      return true;
  
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }  

// Delete order by ID
export async function deleteOrderById(OrderId) {
  const [result] = await pool.query(
    `DELETE FROM \`092_Orders\`
     WHERE OrderId = ?`,
    [OrderId]
  );

  return result.affectedRows > 0;
}
