import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './client.js'; 

dotenv.config();

const app = express();

// --- 1. CORS CONFIGURATION ---
app.use(cors({
  origin: ["https://bluestock-village-ui.vercel.app", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// --- 2. ROUTES ---

// Base Route
app.get('/', (req, res) => {
  res.json({ status: "API is online", engine: "Vercel Serverless" });
});

// Health Route
app.get('/api/v1/health', async (req, res) => {
  try {
    const count = await prisma.village.count();
    res.json({ status: 'healthy', villageCount: count });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Search Route (Requirement 6.4)
app.get('/api/v1/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Query required' });

  try {
    const villages = await prisma.village.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10
    });

    const formatted = villages.map(v => ({
      label: v.name,
      value: `${v.name}_${v.mdds_code}`,
      fullAddress: `${v.name}, ${v.subdistrict}, ${v.district}, ${v.state}`,
      hierarchy: { state: v.state, district: v.district }
    }));

    res.json({ data: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Analytics Route (Requirement 8.1)
app.get('/api/v1/analytics/state-distribution', async (req, res) => {
  try {
    const distribution = await prisma.village.groupBy({
      by: ['state'],
      _count: { _all: true },
      orderBy: { _count: { state: 'desc' } },
      take: 10
    });

    const formatted = distribution.map(d => ({
      name: d.state,
      count: d._count._all
    }));

    res.json({ data: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Analytics failed' });
  }
});

// --- 3. EXPORT & LISTEN ---
export default app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}