import React, { useMemo, useState } from 'react';
import { VisitData } from '../types';
import { calculateVisitResults } from '../lib/scoring';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, AlertTriangle, Activity, Wind, Beaker, ChevronDown, Sparkles, Filter, ShieldCheck, Thermometer, X, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface DashboardScreenProps {
  history: VisitData[];
  onViewProducer: (visit: VisitData) => void;
  onViewAllAlerts?: () => void;
  onViewFullAnalysis?: () => void;
}

export default function DashboardScreen({ history, onViewProducer, onViewAllAlerts, onViewFullAnalysis }: DashboardScreenProps) {
  const [period, setPeriod] = useState('Todo o período');
  const [producerFilter, setProducerFilter] = useState('Todos');
  const [farmFilter, setFarmFilter] = useState('Todos');
  const [batchFilter, setBatchFilter] = useState('Todos');
  const [filterMode, setFilterMode] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [selectedProducer, setSelectedProducer] = useState<(VisitData & { trend?: number }) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter and compute trends
  const { latestByProducer, filteredHistory } = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (period === 'Todo o período') days = Infinity;
    else if (period === 'Últimos 7 dias') days = 7;
    else if (period === 'Últimos 15 dias') days = 15;
    else if (period === 'Últimos 30 dias') days = 30;
    else if (period === 'Últimos 90 dias') days = 90;
    
    // Some visits don't have a time, just date strings
    const cutoff = days === Infinity ? new Date(0) : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    let activeHistory = history.filter(v => new Date(v.date) >= cutoff);

    if (producerFilter !== 'Todos') {
      activeHistory = activeHistory.filter(v => v.producer === producerFilter);
    }
    if (farmFilter !== 'Todos') {
      activeHistory = activeHistory.filter(v => v.farm === farmFilter);
    }
    if (batchFilter !== 'Todos') {
      activeHistory = activeHistory.filter(v => v.batch === batchFilter);
    }

    // Group to calculate trends (using full history to find the previous one)
    const producerHistoryMap = new Map<string, VisitData[]>();
    history.forEach(visit => {
      const key = `${visit.producer} - ${visit.farm}`;
      const arr = producerHistoryMap.get(key) || [];
      arr.push(visit);
      producerHistoryMap.set(key, arr);
    });

    const latestMap = new Map<string, VisitData & { trend: number }>();
    activeHistory.forEach(visit => {
      const key = `${visit.producer} - ${visit.farm}`;
      const allVisits = producerHistoryMap.get(key) || [];
      const sorted = [...allVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestVisit = sorted[0];
      const previousVisit = sorted.length > 1 ? sorted[1] : null;
      
      let trend = 0;
      if (previousVisit) {
        const currentScore = latestVisit.results?.score || calculateVisitResults(latestVisit).score;
        const prevScore = previousVisit.results?.score || calculateVisitResults(previousVisit).score;
        trend = currentScore - prevScore;
      }

      latestMap.set(key, { ...latestVisit, trend });
    });

    return { 
      latestByProducer: Array.from(latestMap.values()),
      filteredHistory: activeHistory
    };
  }, [history, period, producerFilter, farmFilter, batchFilter]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const dashboardElement = document.getElementById('executive-dashboard');
      if (dashboardElement) {
        const elementsToHide = dashboardElement.querySelectorAll('button');
        elementsToHide.forEach(el => {
          if (el.textContent === 'Exportar' || el.textContent === 'Limpar' || el.textContent === 'X') {
            (el as HTMLElement).style.opacity = '0';
          }
        });

        const imgData = await toPng(dashboardElement, {
          pixelRatio: 2,
          backgroundColor: '#0F172A',
          skipFonts: false,
        });

        elementsToHide.forEach(el => {
          (el as HTMLElement).style.opacity = '1';
        });

        const pdf = new jsPDF({
          orientation: dashboardElement.offsetWidth > dashboardElement.offsetHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth;
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        pdf.save(`Painel_BI_Sanitario_${dateStr}.pdf`);
      }
    } catch (err) {
      console.error('Failed to export dashboard', err);
      alert('Erro ao gerar exportação: ' + (err instanceof Error ? err.message : 'Erro desconhecido.'));
    } finally {
      setIsExporting(false);
    }
  };

  const kpis = useMemo(() => {
    const total = latestByProducer.length;
    let sumScore = 0;
    let excellent = 0;
    let attention = 0;
    let critical = 0;
    let sumMortality = 0;
    let sumResp = 0;
    let sumEnteric = 0;

    latestByProducer.forEach(v => {
      const r = v.results || calculateVisitResults(v);
      sumScore += r.score;
      sumMortality += r.mortalityRate;
      const respRisk = r.cFreq + r.sFreq;
      sumResp += respRisk;
      const entRisk = r.liqFreq + r.e2p; 
      sumEnteric += entRisk;

      if (r.scoreStatus === 'Excelente') excellent++;
      else if (r.scoreStatus === 'Atenção') attention++;
      else critical++;
    });

    return {
      total,
      activePct: 100, // assuming all active
      avgScore: total ? Math.round(sumScore / total) : 0,
      attentionCount: attention,
      attentionPct: total ? Math.round((attention / total) * 100) : 0,
      criticalCount: critical,
      criticalPct: total ? Math.round((critical / total) * 100) : 0,
      avgMortality: total ? (sumMortality / total).toFixed(2) : '0',
      avgRespRisk: total ? (sumResp / total).toFixed(1) : '0',
      avgEntericRisk: total ? (sumEnteric / total).toFixed(1) : '0',
      excellentCount: excellent,
    };
  }, [latestByProducer]);

  const timelineData = useMemo(() => {
    const byDate = new Map<string, number[]>();
    filteredHistory.forEach(v => {
      const score = v.results?.score || calculateVisitResults(v).score;
      if (!byDate.has(v.date)) byDate.set(v.date, []);
      byDate.get(v.date)!.push(score);
    });

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return sortedDates.map(date => {
      const scores = byDate.get(date)!;
      const avg = Math.round(scores.reduce((acc, curr) => acc + curr, 0) / scores.length);
      return {
        name: date.split('-').reverse().slice(0, 2).join('/'),
        Índice: avg
      };
    });
  }, [filteredHistory]);

  const ranking = useMemo(() => {
    return [...latestByProducer]
      .sort((a, b) => (b.results?.score || 0) - (a.results?.score || 0))
      .map((p, i) => ({
        ...p,
        rank: i + 1
      }));
  }, [latestByProducer]);

  const tableData = useMemo(() => {
    return ranking.filter(p => {
      let matchesStatus = true;
      if (filterMode !== 'Todos') {
        matchesStatus = p.results?.scoreStatus === filterMode;
      }
      let matchesSearch = true;
      if (search) {
        const searchLower = search.toLowerCase();
        matchesSearch = p.producer.toLowerCase().includes(searchLower) || (p.farm || '').toLowerCase().includes(searchLower) || (p.batch || '').toLowerCase().includes(searchLower);
      }
      return matchesStatus && matchesSearch;
    });
  }, [ranking, filterMode, search]);

  const donutData = [
    { name: 'Excelente', value: kpis.excellentCount, color: '#22C55E' },
    { name: 'Atenção', value: kpis.attentionCount, color: '#F59E0B' },
    { name: 'Crítico', value: kpis.criticalCount, color: '#EF4444' },
  ];

  const toggleProducerPanel = (prod: VisitData & { trend?: number }) => {
    setSelectedProducer(prod);
  };

  return (
    <div id="executive-dashboard" className="min-h-screen bg-[#0F172A] text-slate-50 font-sans p-4 md:p-6 pb-20">
      
      {/* Global Header */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-8 bg-[#1E293B] p-4 lg:p-5 rounded-xl border border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-500 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Visão Executiva</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Inteligência Sanitária Global</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-start xl:justify-end gap-3 flex-1 min-w-0">
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#0F172A] border border-slate-700 px-2.5 py-1.5 rounded-lg shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cliente:</span>
              <select 
                value={producerFilter}
                onChange={(e) => setProducerFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer appearance-none pr-5 truncate max-w-[100px]"
              >
                <option>Todos</option>
                {Array.from(new Set(history.map(v => v.producer))).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-slate-400 -ml-4 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 bg-[#0F172A] border border-slate-700 px-2.5 py-1.5 rounded-lg shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prod:</span>
              <select 
                value={farmFilter}
                onChange={(e) => setFarmFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer appearance-none pr-5 truncate max-w-[100px]"
              >
                <option>Todos</option>
                {Array.from(new Set(history.map(v => v.farm).filter(Boolean))).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-slate-400 -ml-4 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 bg-[#0F172A] border border-slate-700 px-2.5 py-1.5 rounded-lg shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lote:</span>
              <select 
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer appearance-none pr-5 truncate max-w-[100px]"
              >
                <option>Todos</option>
                {Array.from(new Set(history.map(v => v.batch).filter(Boolean))).sort().map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={12} className="text-slate-400 -ml-4 pointer-events-none" />
            </div>

            {(producerFilter !== 'Todos' || farmFilter !== 'Todos' || batchFilter !== 'Todos') && (
              <button 
                onClick={() => {
                  setProducerFilter('Todos');
                  setFarmFilter('Todos');
                  setBatchFilter('Todos');
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700 hover:border-slate-500 shrink-0"
              >
                <X size={12} />
                Limpar
              </button>
            )}
          </div>

          <div className="flex bg-[#0F172A] border border-slate-700 rounded-lg p-1 overflow-x-auto hide-scrollbar whitespace-nowrap shrink-0">
            {['Últimos 7 dias', 'Últimos 15 dias', 'Últimos 30 dias', 'Últimos 90 dias', 'Todo o período'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  period === p ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                {p === 'Todo o período' ? 'Todos' : p.replace('Últimos ', '').replace(' dias', 'd')}
              </button>
            ))}
          </div>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-4 py-1.5 h-8 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-50 shrink-0"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download size={14} />
                Exportar
              </>
            )}
          </button>
        </div>
      </header>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <KPICard title="Clientes" val={kpis.total} sub="100% ativos" icon={<Users size={16} />} color="text-green-500" bg="bg-green-500/10" border="border-green-500/20" />
        
        <div className="bg-[#1E293B] border border-slate-700 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Índice Médio</h3>
            <span className="text-[10px] font-bold text-green-500 px-2 py-0.5 bg-green-500/10 rounded">Excelente</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-12 h-12 relative flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-green-500 transition-all duration-1000"
                  strokeDasharray={`${kpis.avgScore}, 100`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold font-mono text-[11px] text-white">
                {kpis.avgScore}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-500">Últimos 30 dias</p>
              <p className="text-[11px] font-mono text-green-500 mt-0.5">↑ 4 pontos</p>
            </div>
          </div>
        </div>

        <KPICard title="Em Atenção" val={kpis.attentionCount} sub={`${kpis.attentionPct}% da rede`} icon={<AlertTriangle size={16} />} color="text-amber-500" bg="bg-amber-500/10" border="border-amber-500/20" />
        <KPICard title="Críticos" val={kpis.criticalCount} sub={`${kpis.criticalPct}% da rede`} icon={<AlertTriangle size={16} />} color="text-red-500" bg="bg-red-500/10" border="border-red-500/20" />
        
        <KPICard title="Mortalidade" val={`${kpis.avgMortality}%`} sub="Meta: < 1,05% ↓0.18%" icon={<Thermometer size={16} />} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
        <KPICard title="Risco Respirat." val={`${kpis.avgRespRisk}%`} sub="Meta: < 5%" icon={<Wind size={16} />} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
        <KPICard title="Risco Entérico" val={`${kpis.avgEntericRisk}%`} sub="Meta: < 5%" icon={<Beaker size={16} />} color="text-orange-500" bg="bg-orange-500/10" border="border-orange-500/20" />
      </div>

      {/* Row 2: Charts & Ranks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Panel 1 */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
            Status Sanitário <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">Tempo Real</span>
          </h2>
          <div className="flex-1 flex items-center justify-between relative pl-2 pr-6">
            <div className="flex-1 flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold">{kpis.total}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Clientes</span>
              </div>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    stroke="none"
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(_, index) => setFilterMode(donutData[index].name)}
                    className="cursor-pointer"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px' }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col gap-4">
              {donutData.map(d => (
                <div key={d.name} className="flex flex-col cursor-pointer transition-transform hover:scale-105" onClick={() => setFilterMode(d.name)}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{d.name}</span>
                  </div>
                  <span className="text-xl font-bold pl-5 leading-none">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Ranking */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Top Ranking Sanitário</h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0F172A]/50 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3 text-[10px] text-slate-400 font-semibold uppercase rounded-l-md">Pos</th>
                  <th className="py-2 px-3 text-[10px] text-slate-400 font-semibold uppercase">Cliente</th>
                  <th className="py-2 px-3 text-[10px] text-slate-400 font-semibold uppercase">Índice</th>
                  <th className="py-2 px-3 text-[10px] text-slate-400 font-semibold uppercase rounded-r-md text-right">Tendência</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => toggleProducerPanel(p)}>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "text-xs font-bold w-5 h-5 flex items-center justify-center rounded",
                        p.rank === 1 ? "bg-amber-500/20 text-amber-500" :
                        p.rank === 2 ? "bg-slate-300/20 text-slate-300" :
                        p.rank === 3 ? "bg-orange-700/20 text-orange-400" : "text-slate-500"
                      )}>{p.rank}</span>
                    </td>
                    <td className="py-2.5 px-3 truncate max-w-[120px]">
                      <div className="font-medium text-slate-200">{p.producer}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{p.farm}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "font-mono",
                        p.results?.scoreStatus === 'Excelente' ? 'text-green-400' :
                        p.results?.scoreStatus === 'Atenção' ? 'text-amber-400' : 'text-red-400'
                      )}>{p.results?.score}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.trend >= 0 ? (
                        <span className="text-green-500 text-xs font-mono">↑{p.trend}</span>
                      ) : (
                        <span className="text-red-500 text-xs font-mono">↓{Math.abs(p.trend)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3: Evolution Line */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex justify-between">
            Evolução do Índice 
            <span className="text-[10px] text-slate-400">{kpis.avgScore} pts atual</span>
          </h2>
          <div className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis domain={['auto', 100]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '8px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Índice" 
                  stroke="#22C55E" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorIndex)" 
                  activeDot={{ r: 6, fill: '#22C55E', stroke: '#0F172A', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Main Table & Sideline */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Smart Table */}
        <div className="flex-1 bg-[#1E293B] border border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#243247]/50">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              Clientes — Visão Geral
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-[#0F172A] p-1 rounded-lg border border-slate-700">
                {['Todos', 'Excelente', 'Atenção', 'Crítico'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilterMode(f)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                      filterMode === f ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Buscar cliente, produtor ou lote..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors text-slate-200 placeholder:text-slate-500 w-full md:w-auto"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0F172A]/80">
                <tr>
                  <th className="py-3 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cliente</th>
                  <th className="py-3 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Índice</th>
                  <th className="py-3 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mortalidade</th>
                  <th className="py-3 px-4 text-[10px] text-blue-400/80 font-bold uppercase tracking-wider">Respiratório</th>
                  <th className="py-3 px-4 text-[10px] text-orange-400/80 font-bold uppercase tracking-wider">Entérico</th>
                  <th className="py-3 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tendência</th>
                  <th className="py-3 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {tableData.map(p => {
                  const r = p.results!;
                  const isCrit = r.scoreStatus === 'Crítico';
                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => toggleProducerPanel(p)}
                      className={cn(
                        "group cursor-pointer transition-colors hover:bg-[#243247]",
                        isCrit ? "bg-red-950/10 hover:bg-red-900/20" : ""
                      )}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {p.producer}
                        <div className="text-[10px] font-normal text-slate-500">{p.farm}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-mono font-bold",
                            r.score >= 85 ? "text-green-500" :
                            r.score >= 70 ? "text-amber-500" : "text-red-500"
                          )}>{r.score}</span>
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              className={cn("h-full rounded-full",
                                r.score >= 85 ? "bg-green-500" :
                                r.score >= 70 ? "bg-amber-500" : "bg-red-500"
                              )} 
                              style={{ width: `${Math.max(10, r.score)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "font-mono",
                          r.mortalityRate > r.mortalityMeta ? "text-red-400 font-semibold" : "text-slate-300"
                        )}>
                          {r.mortalityRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "font-mono",
                          (r.cFreq + r.sFreq) > 5 ? "text-amber-400" : "text-slate-300"
                        )}>
                          {(r.cFreq + r.sFreq).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "font-mono",
                          (r.liqFreq) > 5 ? "text-amber-400" : "text-slate-300"
                        )}>
                          {(r.liqFreq).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-8 flex">
                          <svg className="w-full h-4 sparkline" viewBox="0 0 30 10">
                            {p.trend >= 0 ? (
                              <path d="M0,8 Q10,8 15,4 T30,0" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"/>
                            ) : (
                              <path d="M0,0 Q10,2 15,6 T30,10" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                            )}
                          </svg>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          r.scoreStatus === 'Excelente' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          r.scoreStatus === 'Atenção' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : 
                          "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>{r.scoreStatus}</span>
                      </td>
                    </tr>
                  )
                })}
                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                      Nenhum cliente encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Widgets (AI Insights & Alerts) */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0">
          
          {/* Radar de Risco e Desafios */}
          <div className="bg-gradient-to-b from-[#1E293B] to-[#151e2e] border-t-2 border-t-orange-500 border-x border-x-orange-500/20 border-b border-b-orange-500/20 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.15)] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <h2 className="text-[14px] font-black uppercase tracking-widest text-orange-400 mb-6 flex items-center gap-2 border-b border-orange-500/20 pb-3 relative z-10">
              <AlertTriangle size={18} className="text-orange-500 shrink-0" />
              Radar de Risco Ativo
            </h2>
            <div className="space-y-4">
              {(() => {
                const mortalidadeAlta = latestByProducer.filter(p => p.results!.mortalityRate > p.results!.mortalityMeta);
                const riscoResp = latestByProducer.filter(p => p.results!.cFreq > 2 || p.results!.sFreq > 5);
                const riscoEnterico = latestByProducer.filter(p => p.results!.liqFreq > 2);
                
                return (
                  <>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className={mortalidadeAlta.length > 0 ? "text-amber-500 mt-0.5 shrink-0" : "text-green-500 mt-0.5 shrink-0"} />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          <span className="text-white font-bold">{mortalidadeAlta.length} {mortalidadeAlta.length === 1 ? 'lote apresenta' : 'lotes apresentam'}</span> mortalidade acima da meta.
                        </p>
                        {mortalidadeAlta.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {mortalidadeAlta.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setFarmFilter(p.farm!)}
                                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-1.5 py-0.5 rounded transition-colors text-left"
                              >
                                {p.farm}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Wind size={14} className={riscoResp.length > 0 ? "text-amber-500 mt-0.5 shrink-0" : "text-green-500 mt-0.5 shrink-0"} />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Desafio respiratório detectado em <span className="text-white font-bold">{riscoResp.length} {riscoResp.length === 1 ? 'produtor' : 'produtores'}</span>.
                        </p>
                        {riscoResp.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {riscoResp.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setFarmFilter(p.farm!)}
                                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-1.5 py-0.5 rounded transition-colors text-left"
                              >
                                {p.farm}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Beaker size={14} className={riscoEnterico.length > 0 ? "text-amber-500 mt-0.5 shrink-0" : "text-green-500 mt-0.5 shrink-0"} />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          Desafio entérico agudo detectado em <span className="text-white font-bold">{riscoEnterico.length} {riscoEnterico.length === 1 ? 'produtor' : 'produtores'}</span>.
                        </p>
                        {riscoEnterico.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {riscoEnterico.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setFarmFilter(p.farm!)}
                                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-1.5 py-0.5 rounded transition-colors text-left"
                              >
                                {p.farm}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <button 
              onClick={onViewFullAnalysis}
              className="mt-5 w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold py-2 rounded transition-colors border border-orange-500/20 uppercase tracking-widest"
            >
              Ver relatório completo
            </button>
          </div>

          {/* Critical Alerts */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-5 shadow-lg flex-1">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              Alertas Críticos
            </h2>
            <div className="space-y-3">
              {/* Actual Alerts derived logically */}
              {ranking.filter(p => p.results!.scoreStatus === 'Crítico' || p.results!.mortalityRate > p.results!.mortalityMeta).slice(0, 3).map((p, i) => {
                const isMortality = p.results!.mortalityRate > p.results!.mortalityMeta * 1.5;
                const isCough = p.results!.cFreq > 10;
                const isLiq = p.results!.liqFreq > 5;
                
                let title = 'Risco sanitário detectado';
                let valText = `Índice: ${p.results!.score}`;
                if (isMortality) {
                  title = 'Mortalidade acima da meta';
                  valText = `${p.results!.mortalityRate.toFixed(2)}%`;
                } else if (isCough) {
                  title = 'Tosse acima do limite';
                  valText = `${p.results!.cFreq.toFixed(1)}%`;
                } else if (isLiq) {
                  title = 'Diarreia líquida acima do limite';
                  valText = `${p.results!.liqFreq.toFixed(1)}%`;
                }
                
                const dateText = i === 0 ? 'Agora' : i === 1 ? '2h atrás' : '5h atrás';

                return (
                  <div key={p.id} className="bg-red-950/40 border border-red-900/50 p-3 rounded-lg flex items-start gap-3 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse hidden"></div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-slate-200">🔴 {p.farm || p.producer}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 pb-0.5">{title}</p>
                      <p className="text-xs text-red-400 font-bold font-mono">{valText}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium absolute top-3 right-3">{dateText}</p>
                    </div>
                  </div>
                );
              })}
              {ranking.filter(p => p.results!.scoreStatus === 'Crítico').length === 0 && (
                <div className="text-center py-6">
                  <ShieldCheck size={24} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">Nenhum alerta crítico ativo.</p>
                </div>
              )}
            </div>
            <button 
              onClick={onViewAllAlerts}
              className="mt-4 w-full text-slate-400 hover:text-white text-xs font-bold py-2 transition-colors uppercase tracking-widest"
            >
              Ver Todos
            </button>
          </div>

        </div>
      </div>

      {/* Side Panel for Individual Producer View */}
      <AnimatePresence>
        {selectedProducer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedProducer(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.05, right: 0.8 }}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.x > 100 || velocity.x > 500) {
                    setSelectedProducer(null);
                  }
                }}
                className="w-full max-w-md max-h-[85vh] bg-[#162032] border border-slate-700 shadow-2xl flex flex-col rounded-2xl overflow-hidden pointer-events-auto"
              >
              <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-[#1E293B]">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedProducer.producer}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedProducer.farm} • Fase: {selectedProducer.phase}{selectedProducer.batch ? ` • Lote: ${selectedProducer.batch}` : ''}</p>
                </div>
                <button 
                  onClick={() => setSelectedProducer(null)}
                  className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                <div className="flex items-center gap-4 bg-[#0F172A] p-4 rounded-xl border border-slate-700 cursor-default">
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path
                        className="text-slate-800"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={cn("transition-all duration-1000",
                          selectedProducer.results!.score >= 85 ? "text-green-500" :
                          selectedProducer.results!.score >= 70 ? "text-amber-500" : "text-red-500"
                        )}
                        strokeDasharray={`${selectedProducer.results!.score}, 100`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-bold font-mono text-sm">
                      {selectedProducer.results!.score}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Índice Sanitário</p>
                    <h3 className="text-lg font-bold text-white mt-0.5">{selectedProducer.results!.scoreStatus}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1E293B] border border-slate-700/50 p-3 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Mortalidade</p>
                    <p className="text-xl font-mono text-white leading-none">
                      {selectedProducer.results!.mortalityRate.toFixed(2)}%
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2">Meta: {selectedProducer.results!.mortalityMeta.toFixed(2)}%</p>
                  </div>
                  <div className="bg-[#1E293B] border border-slate-700/50 p-3 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Risco Resp.</p>
                    <p className="text-xl font-mono text-white leading-none">
                      {(selectedProducer.results!.cFreq + selectedProducer.results!.sFreq).toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2">Meta: &lt; 5.0%</p>
                  </div>
                  <div className="bg-[#1E293B] border border-slate-700/50 p-3 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Risco Entérico</p>
                    <p className="text-xl font-mono text-white leading-none">
                      {(selectedProducer.results!.liqFreq).toFixed(1)}%
                    </p>
                    <p className="text-[9px] text-slate-500 mt-2">Diarreia líquida</p>
                  </div>
                  <div className="bg-[#1E293B] border border-slate-700/50 p-3 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Data Aval.</p>
                    <p className="text-sm font-semibold text-white leading-none mt-1">
                      {selectedProducer.date.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>

                <div className="bg-[#1E293B] border border-purple-500/20 p-4 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                  <h3 className="text-xs font-bold text-white flex gap-2 items-center mb-2">
                    <Sparkles size={12} className="text-purple-400" /> Ação Recomendada
                  </h3>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed">
                    {selectedProducer.results!.scoreStatus === 'Crítico' 
                      ? 'Intervenção imediata necessária. Risco severo detectado no lote. Agendar visita presencial do veterinário em até 24h e rever medicação na água.'
                      : selectedProducer.results!.scoreStatus === 'Atenção'
                      ? 'Monitorar evolução nos próximos 3 dias. Possível início de quadro respiratório ou entérico.'
                      : 'Lote dentro dos padrões. Manter rotina normal de ambiência e prevenção.'
                    }
                  </p>
                </div>

              </div>
              
              <div className="p-4 bg-[#1E293B] border-t border-slate-700 flex gap-3">
                <button 
                  onClick={() => onViewProducer(selectedProducer)}
                  className="w-full bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider shadow-lg shadow-brand-primary/20"
                >
                  Ver Relatório
                </button>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function KPICard({ title, val, sub, icon, color, bg, border }: any) {
  return (
    <div className="bg-[#1E293B] border border-slate-700 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-slate-600 transition-colors">
      <div className={cn("inline-flex p-2 rounded-lg mb-3 border", bg, color, border)}>
        {icon}
      </div>
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white font-mono leading-none tracking-tight">{val}</p>
        <p className="text-[10px] font-medium text-slate-500 mt-2 truncate flex items-center gap-1">
          {sub}
        </p>
      </div>
    </div>
  );
}
