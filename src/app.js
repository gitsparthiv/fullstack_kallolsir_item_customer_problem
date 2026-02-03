import express from 'express';// Express app = request handler pipeline
  import morgan from 'morgan';// morgan is a logging middleware for Express that logs HTTP requests automatically.
  import customerRoutes from './routes/customer.routes.js';
  import { errorHandler } from './middlewares/errorHandler.js';
  import orderRoutes from './routes/order.routes.js';
  import itemRoutes from './routes/item.routes.js';


  export const app = express();

  // Middleware
  app.use(morgan('combined'));
  app.use(express.json());
  

  // Routes
  app.use('/api/customer', customerRoutes);
  app.use('/api/order', orderRoutes);
  app.use('/api/item', itemRoutes);

  // Error handling
  app.use(errorHandler);
  