import {
    getCustomerbyID,
    listCustomers,
    createCustomer
  } from '../services/customer.service.js';
  
  export async function handleGetCustomer(req, res, next) {
    try {
      const { CustomerID } = req.params;
  
      const row = await getCustomerbyID(CustomerID);
      if (!row) return res.status(404).json({ message: 'Customer not found' });
  
      return res.json(row);
    } catch (err) {
      return next(err);
    }
  }
  
  export async function handleListCustomers(req, res, next) {
    try {
      const { limit, offset } = req.query;
  
      const rows = await listCustomers({ limit, offset });
      return res.json({ count: rows.length, data: rows });
    } catch (err) {
      return next(err);
    }
  }
  
  export async function handleCreateCustomer(req, res, next) {
    try {
      const { CustomerDescription, Priority } = req.body;
  
      const customer = await createCustomer({
        CustomerDescription,
        Priority
      });
  
      return res.status(201).json(customer);
    } catch (err) {
      return next(err);
    }
  }
  import { patchCustomerById } from '../services/customer.service.js';

export async function handlePatchCustomer(req, res, next) {
  try {
    const CustomerID = Number(req.params.CustomerID);

    const updated = await patchCustomerById(CustomerID, req.body);

    if (!updated) {
      return res
        .status(404)
        .json({ message: 'Customer not found or no valid fields sent' });
    }

    return res.json({
      message: 'Customer updated partially with the field/s given'
    });
  } catch (err) {
    return next(err);
  }
}
import { deleteCustomerById } from '../services/customer.service.js';

export async function handleDeleteCustomer(req, res, next) {
  try {
    const CustomerID = Number(req.params.CustomerID);

    const deleted = await deleteCustomerById(CustomerID);

    if (!deleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.status(200).json({ message: 'Customer deleted' });
  } catch (err) {
    return next(err);
  }
}
