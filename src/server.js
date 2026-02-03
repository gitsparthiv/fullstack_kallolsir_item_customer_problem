import 'dotenv/config';
  import { app } from './app.js';
  import { pingDatabase } from './config/database.js';

  const PORT = process.env.PORT || 3000;

  async function startServer() {
    try {
      await pingDatabase();
      console.log('Database connection successful');

      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }

  startServer();