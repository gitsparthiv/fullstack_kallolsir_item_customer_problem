import { Router } from 'express';
import {
  handleGetItem,
  handleListItems,
  handleCreateItem,
  handlePatchItem,
  handleDeleteItem
} from '../controllers/item.controller.js';

const router = Router();

router.get('/', handleListItems);
router.get('/:ItemID', handleGetItem);
router.post('/', handleCreateItem);
router.patch('/:ItemID', handlePatchItem);
router.delete('/:ItemID', handleDeleteItem);

export default router;
