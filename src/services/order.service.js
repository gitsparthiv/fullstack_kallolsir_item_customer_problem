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


export async function patchOrderById(OrderId, fields = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Get existing order
    const [[order]] = await connection.query(
      `SELECT CustomerID, ItemID, Qty, DiscountPercentage
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
    const newQty = Number(fields.Qty ?? oldQty);
    const newDiscount = Number(
      fields.DiscountPercentage ?? order.DiscountPercentage ?? 0
    );

    if (Number.isNaN(newQty) || newQty <= 0) {
      throw new Error('INVALID_QTY');
    }

    if (Number.isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
      throw new Error('INVALID_DISCOUNT');
    }

    let price;

    // 2️⃣ Fetch price ONCE (always needed for recalculation)
    const [[priceRow]] = await connection.query(
      `SELECT Price
       FROM \`092_Items\`
       WHERE ItemID = ?
       LIMIT 1`,
      [newItemID]
    );

    if (!priceRow) {
      throw new Error('ITEM_NOT_FOUND');
    }

    price = Number(priceRow.Price);

    // 3️⃣ Stock handling ONLY if ItemID or Qty changed
    if (newItemID !== oldItemID) {
      // restore old stock
      await connection.query(
        `UPDATE \`092_Items\`
         SET Quantity = Quantity + ?
         WHERE ItemID = ?`,
        [oldQty, oldItemID]
      );

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
    else if (newQty !== oldQty) {
      const diff = newQty - oldQty;

      const [[item]] = await connection.query(
        `SELECT Quantity
         FROM \`092_Items\`
         WHERE ItemID = ?
         FOR UPDATE`,
        [oldItemID]
      );

      if (diff > 0 && item.Quantity < diff) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      await connection.query(
        `UPDATE \`092_Items\`
         SET Quantity = Quantity - ?
         WHERE ItemID = ?`,
        [diff, oldItemID]
      );
    }

    // 4️⃣ Recalculate price
    const subtotal = price * newQty;
    const discountAmount = subtotal * (newDiscount / 100);
    const totalPrice = subtotal - discountAmount;

    // 5️⃣ Update order
    await connection.query(
      `UPDATE \`092_Orders\`
       SET CustomerID = ?, ItemID = ?, Qty = ?, DiscountPercentage = ?, TotalPrice = ?
       WHERE OrderId = ?`,
      [
        fields.CustomerID ?? order.CustomerID,
        newItemID,
        newQty,
        newDiscount,
        totalPrice,
        OrderId
      ]
    );

    // 6️⃣ Priority rule
    if (newQty > 10) {
      await connection.query(
        `UPDATE \`092_Customer\`
         SET Priority = true
         WHERE CustomerID = ?`,
        [fields.CustomerID ?? order.CustomerID]
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

// ✅ List only discounted orders
export async function listDiscountedOrders({ limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM \`092_Orders\`
     WHERE DiscountPercentage > 0
     ORDER BY OrderId ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset]
  );

  return rows;
}