import { Router } from 'express';
import {
  handleGetOrder,
  handleListOrders,
  handleCreateOrder,
  handlePatchOrder,
  handleDeleteOrder
} from '../controllers/order.controller.js';

const router = Router();

router.get('/', handleListOrders);
router.get('/:OrderId', handleGetOrder);
router.post('/', handleCreateOrder);
router.patch('/:OrderId', handlePatchOrder);
router.delete('/:OrderId', handleDeleteOrder);

export default router;
