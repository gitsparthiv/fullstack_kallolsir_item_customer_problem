import {
    getOrderById,
    listOrders,
    createOrder,
    patchOrderById,
    deleteOrderById
  } from '../services/order.service.js';
  
  // GET /api/order/:OrderId
  export async function handleGetOrder(req, res, next) {
    try {
      const { OrderId } = req.params;
  
      const row = await getOrderById(OrderId);
      if (!row) return res.status(404).json({ message: 'Order not found' });
  
      return res.json(row);
    } catch (err) {
      return next(err);
    }
  }
  
  // GET /api/order
  export async function handleListOrders(req, res, next) {
    try {
      const { limit, offset } = req.query;
  
      const rows = await listOrders({ limit, offset });
      return res.json({ count: rows.length, data: rows });
    } catch (err) {
      return next(err);
    }
  }
  
  // POST /api/order
  export async function handleCreateOrder(req, res, next) {
    try {
      const { CustomerID, ItemID, Qty } = req.body;
  
      const order = await createOrder({
        CustomerID,
        ItemID,
        Qty
      });
  
      return res.status(201).json(order);
    } catch (err) {
      return next(err);
    }
  }
  
  // PATCH /api/order/:OrderId
  export async function handlePatchOrder(req, res, next) {
    try {
      const OrderId = Number(req.params.OrderId);
  
      const { CustomerID, ItemID, Qty } = req.body;
  
      const updated = await patchOrderById(OrderId, {
        CustomerID,
        ItemID,
        Qty
      });
  
      if (!updated) {
        return res
          .status(404)
          .json({ message: 'Order not found or no valid fields sent' });
      }
  
      return res.json({
        message: 'Order updated partially with the field/s given'
      });
    } catch (err) {
      return next(err);
    }
  }
  
  // DELETE /api/order/:OrderId
  export async function handleDeleteOrder(req, res, next) {
    try {
      const OrderId = Number(req.params.OrderId);
  
      const deleted = await deleteOrderById(OrderId);
  
      if (!deleted) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      return res.status(200).json({ message: 'Order deleted' });
    } catch (err) {
      return next(err);
    }
  }
  