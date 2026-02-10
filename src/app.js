import express from 'express';// Express app = request handler pipeline
  import morgan from 'morgan';// morgan is a logging middleware for Express that logs HTTP requests automatically.logs mne jegulo terminal a dekhae request ale
  import customerRoutes from './routes/customer.routes.js';
  import { errorHandler } from './middlewares/errorHandler.js';
  import orderRoutes from './routes/order.routes.js';
  import itemRoutes from './routes/item.routes.js';


  export const app = express();

  // Middleware
  app.use(morgan('combined'));
  app.use(express.json());
  
// Assessment2: CORS Middleware - Allows the frontend to communicate with the API from a different origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // If the request has an origin, we reflect it back instead of using '*'
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight (OPTIONS) requests//option is the request that is our self made not get, put
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

  // Routes
  app.use('/api/customer', customerRoutes);
  app.use('/api/order', orderRoutes);
  app.use('/api/item', itemRoutes);

  // Error handling
  app.use(errorHandler);
  