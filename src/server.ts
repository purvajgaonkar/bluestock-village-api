import express, { Request, Response } from 'express';
import cors from 'cors';
import prisma from './client';

const app = express();

// Standard Middlewares
app.use(cors({
  origin: '*', // Allows your Vercel frontend to talk to this backend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

/**
 * @endpoint GET /api/v1/health
 * @description System health check and data verification
 */
app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    const villageCount = await prisma.village.count();
    res.json({ 
      success: true,
      status: "live", 
      total_villages: villageCount,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ success: false, error: "Database connection failed" });
  }
});

/**
 * @endpoint GET /api/v1/search
 * @description Search villages with full hierarchy (Requirement 6.4)
 */
app.get('/api/v1/search', async (req: Request, res: Response) => {
  const { q } = req.query;

  // Requirement 6.6: Error handling for short queries
  if (!q || String(q).length < 3) {
    return res.status(400).json({ 
      success: false, 
      error_code: "INVALID_QUERY",
      message: "Search query must be at least 3 characters" 
    });
  }

  try {
    const villages = await prisma.village.findMany({
      where: {
        name: { contains: String(q), mode: 'insensitive' }
      },
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      },
      take: 10 // Optimized for performance
    });

    // Requirement 6.5: Response format for dropdowns
    const formattedData = villages.map(v => ({
      value: `village_id_${v.id}`,
      label: v.name,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name,
        country: "India"
      }
    }));

    res.json({ 
      success: true, 
      count: formattedData.length, 
      data: formattedData,
      meta: {
        timestamp: new Date().toISOString(),
        responseTime: "calculated_at_edge" // Placeholder for Vercel metrics
      }
    });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ 
      success: false, 
      error_code: "INTERNAL_ERROR",
      message: "Server-side error during search" 
    });
  }
});

const PORT = process.env.PORT || 3000;
/**
 * @endpoint GET /api/v1/autocomplete
 * @description Fast typeahead suggestions for the search bar (Requirement 6.4)
 */
app.get('/api/v1/autocomplete', async (req: Request, res: Response) => {
  const { q } = req.query;

  if (!q || String(q).length < 2) {
    return res.json({ success: true, data: [] });
  }

  try {
    const suggestions = await prisma.village.findMany({
      where: {
        name: { startsWith: String(q), mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true
      },
      take: 5 // Only 5 suggestions for maximum speed
    });

    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: "Autocomplete failed" });
  }
});
/**
 * @endpoint GET /api/v1/analytics/state-distribution
 * @description Get top 10 states by village count for charts (Requirement 8.1)
 */
app.get('/api/v1/analytics/state-distribution', async (req: Request, res: Response) => {
  try {
    // Using Raw SQL to handle the 4-table JOIN efficiently
    const chartData = await prisma.$queryRaw`
      SELECT s.name, COUNT(v.id)::int as count
      FROM "State" s
      JOIN "District" d ON s.id = d."stateId"
      JOIN "SubDistrict" sd ON d.id = sd."districtId"
      JOIN "Village" v ON sd.id = v."subDistrictId"
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10
    `;

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, error: "Analytics failed" });
  }
});
app.listen(PORT, () => {
  console.log(`
🚀 Server is flying on port ${PORT}
🔗 Health Check: http://localhost:${PORT}/api/v1/health
🔍 Search Test:  http://localhost:${PORT}/api/v1/search?q=mumbai
  `);
});