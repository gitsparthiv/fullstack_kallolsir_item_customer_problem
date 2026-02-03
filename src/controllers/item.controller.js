import {
    getItemById,
    listItems,
    createItem,
    patchItemById,
    deleteItemById
  } from '../services/item.service.js';
  
  // GET /api/item/:ItemID
  export async function handleGetItem(req, res, next) {
    try {
      const { ItemID } = req.params;
  
      const row = await getItemById(ItemID);
      if (!row) return res.status(404).json({ message: 'Item not found' });
  
      return res.json(row);
    } catch (err) {
      return next(err);
    }
  }
  
  // GET /api/item
  export async function handleListItems(req, res, next) {
    try {
      const { limit, offset } = req.query;
  
      const rows = await listItems({ limit, offset });
      return res.json({ count: rows.length, data: rows });
    } catch (err) {
      return next(err);
    }
  }
  
  // POST /api/item
  export async function handleCreateItem(req, res, next) {
    try {
      const { ItemDescription, Quantity } = req.body;
  
      const item = await createItem({
        ItemDescription,
        Quantity
      });
  
      return res.status(201).json(item);
    } catch (err) {
      return next(err);
    }
  }
  
  // PATCH /api/item/:ItemID
  export async function handlePatchItem(req, res, next) {
    try {
      const ItemID = Number(req.params.ItemID);
  
      const updated = await patchItemById(ItemID, req.body);
  
      if (!updated) {
        return res
          .status(404)
          .json({ message: 'Item not found or no valid fields sent' });
      }
  
      return res.json({
        message: 'Item updated partially with the field/s given'
      });
    } catch (err) {
      return next(err);
    }
  }
  
  // DELETE /api/item/:ItemID
  export async function handleDeleteItem(req, res, next) {
    try {
      const ItemID = Number(req.params.ItemID);
  
      const deleted = await deleteItemById(ItemID);
  
      if (!deleted) {
        return res.status(404).json({ message: 'Item not found' });
      }
  
      return res.status(200).json({ message: 'Item deleted' });
    } catch (err) {
      return next(err);
    }
  }
  