import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// IMPORTANT: You MUST use .js extension here even though the file is .ts
import prisma from './client.js'; 

dotenv.config();

const app = express();
app.use(cors({
  origin: ["https://bluestock-village-ui.vercel.app", "http://localhost:5173"], // Add your actual frontend Vercel URL here
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Add a base route so you know the server is up
app.get('/', (req, res) => {
  res.json({ status: "API is online", engine: "Vercel Serverless" });
});

app.get('/api/v1/health', async (req, res) => {
  try {
    const count = await prisma.village.count();
    res.json({ status: 'healthy', villageCount: count });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ... keep your other search routes here ...

// Export for Vercel
export default app;

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}