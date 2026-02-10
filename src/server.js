
import 'dotenv/config';//Loads environment variables from .env . Makes process.env.PORT, process.env.DB_URL, etc. available. Runs once, before anything else
  import { app } from './app.js';
  import { pingDatabase } from './config/database.js';

  const PORT = process.env.PORT || 3000;//Reads port from .env If not present → defaults to 3000

  async function startServer() {
    try {
      await pingDatabase();
      console.log('Database connection successful');

      app.listen(PORT, () => {//THIS is where requests start entering. Starts HTTP server on PORT
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }

  startServer();