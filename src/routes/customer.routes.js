import { Router } from 'express';
  import { handleGetCustomer, handleListCustomers } from '../controllers/customer.controller.js';
  import { handleCreateCustomer } from '../controllers/customer.controller.js';
  const router = Router();

  router.get('/', handleListCustomers);
  router.get('/:CustomerID', handleGetCustomer);
  router.post('/', handleCreateCustomer);
  import { handlePatchCustomer } from '../controllers/customer.controller.js';
  router.patch('/:CustomerID', handlePatchCustomer);
  export default router;
  import { handleDeleteCustomer } from '../controllers/customer.controller.js';
  router.delete('/:CustomerID', handleDeleteCustomer);
