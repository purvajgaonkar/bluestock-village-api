import { useEffect, useState } from 'react'
import axios from 'axios'
import { Search, MapPin, Database, Activity, BarChart3, Globe } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts'

// --- UPDATE THIS TO YOUR LIVE BACKEND URL ---
const API_BASE = "https://bluestock-village-backend.vercel.app";

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const CHART_COLORS = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'];

  // 1. Initial Data Fetch (Health & Analytics)
  useEffect(() => {
    // Fetch General Stats from Production
    axios.get(`${API_BASE}/api/v1/health`)
      .then(res => setHealth(res.data))
      .catch(err => console.error("Health Check Failed:", err))

    // Fetch Analytics for Chart from Production
    axios.get(`${API_BASE}/api/v1/analytics/state-distribution`)
      .then(res => setChartData(res.data.data))
      .catch(err => console.error("Analytics Failed:", err))
  }, [])

  // 2. Debounced Search Logic
  useEffect(() => {
    if (query.length < 3) {
      setResults([])
      return
    }

    const delayDebounceFn = setTimeout(() => {
      setLoading(true)
      axios.get(`${API_BASE}/api/v1/search?q=${query}`)
        .then(res => setResults(res.data.data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8">
      {/* --- HEADER SECTION --- */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <Globe className="text-blue-500" />
            BLUESTOCK <span className="text-blue-500">VILLAGE</span>
          </h1>
          <p className="text-slate-400 mt-1 uppercase text-xs tracking-[0.2em] font-bold">Engineering Phase 2 • Production Ready</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-blue-500/10 p-2 rounded-lg"><Database className="text-blue-500" size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black">Total Villages</p>
              <p className="text-xl font-mono text-white leading-none mt-1">{health?.villageCount?.toLocaleString() || '---'}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="bg-green-500/10 p-2 rounded-lg"><Activity className="text-green-500" size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black">API Node</p>
              <p className="text-xl font-mono text-green-400 leading-none mt-1">{health ? 'STABLE' : 'CONNECTING'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- ANALYTICS SECTION --- */}
      <div className="max-w-6xl mx-auto mb-10 bg-slate-900/50 border border-slate-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Top 10 States by Village Density</h2>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
              <Tooltip 
                cursor={{fill: '#1e293b', opacity: 0.4}}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- SEARCH INTERFACE --- */}
      <div className="max-w-3xl mx-auto mb-12">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={22} />
          <input
            type="text"
            placeholder="Search 564,159 villages by name..."
            className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl py-5 pl-14 pr-6 text-xl focus:outline-none focus:border-blue-500/50 transition-all shadow-2xl text-white placeholder:text-slate-600"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* --- RESULTS GRID --- */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((item, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/40 transition-all hover:bg-slate-900/80 group cursor-default">
            <div className="flex items-start justify-between mb-5">
              <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                <MapPin size={22} />
              </div>
              <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded-full text-slate-500 font-mono tracking-tighter border border-slate-800">
                MDDS: {item.value.split('_').pop()}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{item.label}</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 h-10 overflow-hidden line-clamp-2">
              {item.fullAddress}
            </p>
            
            <div className="pt-5 border-t border-slate-800/50 flex flex-wrap gap-2">
              <span className="text-[10px] bg-slate-950 border border-slate-800 px-2 py-1 rounded-md uppercase tracking-widest text-slate-400">
                {item.hierarchy.district}
              </span>
              <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md uppercase tracking-widest text-blue-400 font-black">
                {item.hierarchy.state}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* --- EMPTY STATE --- */}
      {query.length >= 3 && results.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-900/20 rounded-3xl border-2 border-dashed border-slate-800 max-w-6xl mx-auto">
          <p className="text-xl text-slate-500 font-medium">No results found for "<span className="text-white">{query}</span>"</p>
          <p className="text-sm text-slate-600 mt-2">Try searching for 'Manibeli' or 'Chamba'</p>
        </div>
      )}
    </div>
  )
}

export default App;