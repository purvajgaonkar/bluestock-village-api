import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './client.js'; 

dotenv.config();

const app = express();

// --- 1. MIDDLEWARE ---
app.use(cors({
  origin: ["https://bluestock-village-ui.vercel.app", "http://localhost:5173"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// --- 2. ROUTES ---

// Health Check
app.get('/api/v1/health', async (req, res) => {
  try {
    const count = await prisma.village.count();
    res.json({ status: 'healthy', villageCount: count });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Search Route with Deep Joins
app.get('/api/v1/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Query required' });

  try {
    const villages = await prisma.village.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 15,
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      }
    });

    const formatted = villages.map(v => ({
      label: v.name,
      value: `${v.name}_${v.mddsCode}`,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}`,
      hierarchy: { 
        state: v.subDistrict.district.state.name, 
        district: v.subDistrict.district.name 
      }
    }));

    res.json({ data: formatted });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Analytics Route for Chart
app.get('/api/v1/analytics/state-distribution', async (req, res) => {
  try {
    const states = await prisma.state.findMany({
      select: {
        name: true,
        districts: {
          select: {
            subDistricts: {
              select: {
                _count: {
                  select: { villages: true }
                }
              }
            }
          }
        }
      }
    });

    const formatted = states.map(s => ({
      name: s.name,
      count: s.districts.reduce((acc: number, d: any) => 
        acc + d.subDistricts.reduce((sAcc: number, sd: any) => sAcc + sd._count.villages, 0)
      , 0)
    }));

    const topStates = formatted
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ data: topStates });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: 'Analytics calculation failed' });
  }
});

// Default Route
app.get('/', (req, res) => {
  res.json({ status: "API Online", message: "Use /api/v1/health for status" });
});

// --- 3. EXPORT & START ---
export default app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}