import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VisitData } from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Search, Filter, Layers, Clock, Activity, 
  ArrowUpRight, ArrowDownRight, Wind, Droplets, Calendar,
  ChevronRight, RefreshCcw, Check, ChevronDown, X, CheckCircle, AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

const calculateHousingDays = (housingDateStr?: string, visitDateStr?: string) => {
  if (!housingDateStr || !visitDateStr) return '?';
  try {
    const parseDate = (dStr: string) => {
      if (!dStr) throw new Error('Invalid');
      const parts = dStr.split('T')[0].split('-');
      if (parts.length < 3) throw new Error('Invalid');
      const [y, m, d] = parts;
      return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    };
    const hd = parseDate(housingDateStr);
    const vd = parseDate(visitDateStr);
    if (isNaN(hd.getTime()) || isNaN(vd.getTime())) return '?';
    const diffTime = vd.getTime() - hd.getTime();
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  } catch(e) {
    return '?';
  }
};

interface Props {
  history: VisitData[];
  onViewDetails: (visit: VisitData) => void;
}

type MetricType = 'score' | 'cough' | 'sneeze' | 'enteric' | 'mortality';
type TimeRange = '7d' | '30d' | '90d' | 'all';

interface MultiSelectProps {
  label: string;
  icon: any;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  formatOption?: (opt: string) => string;
}

function MultiSelect({ label, icon: Icon, options, selected, onChange, placeholder, formatOption }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayOption = (opt: string) => formatOption ? formatOption(opt) : opt;

  const filteredOptions = options.filter(opt => 
    displayOption(opt).toLowerCase().includes(search.toLowerCase()) && opt !== 'Todos' && opt !== 'Todas'
  );

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const isAllSelected = selected.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm transition-all focus:ring-2 focus:ring-brand-primary/20",
          isOpen ? "border-brand-primary ring-2 ring-brand-primary/10" : "hover:border-brand-primary/50"
        )}
      >
        <Icon size={16} className="text-[var(--text-dim)] shrink-0" />
        <div className="flex-1 text-left truncate">
          {isAllSelected ? (
            <span className="text-[var(--text-muted)]">{placeholder}</span>
          ) : (
            <div className="flex gap-1 flex-wrap">
              <span className="font-bold text-brand-primary">{selected.length} selecionado(s)</span>
            </div>
          )}
        </div>
        <ChevronDown size={14} className={cn("text-[var(--text-dim)] transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in duration-150">
          <div className="p-2 border-b border-[var(--border)] mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => { onChange([]); setIsOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors mb-1",
                isAllSelected ? "bg-brand-primary/10 text-brand-primary" : "hover:bg-[var(--surface-hover)]"
              )}
            >
              <span>Todos / Todas</span>
              {isAllSelected && <Check size={14} />}
            </button>
            
            {filteredOptions.map(opt => (
              <button
                key={opt}
                onClick={() => toggleOption(opt)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors",
                  selected.includes(opt) ? "bg-brand-primary/10 text-brand-primary font-bold" : "hover:bg-[var(--surface-hover)]"
                )}
              >
                <span className="truncate">{displayOption(opt)}</span>
                {selected.includes(opt) && <Check size={14} />}
              </button>
            ))}
            
            {filteredOptions.length === 0 && (
              <div className="p-4 text-center text-[10px] text-[var(--text-muted)] uppercase font-bold">
                Nenhum resultado
              </div>
            )}
          </div>
          
          {!isAllSelected && (
            <div className="pt-2 border-t border-[var(--border)] mt-2 flex justify-between">
              <button 
                onClick={() => onChange([])}
                className="text-[9px] font-bold uppercase text-brand-danger px-2 py-1 hover:bg-brand-danger/10 rounded"
              >
                Limpar
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-bold uppercase text-brand-primary px-2 py-1 hover:bg-brand-primary/10 rounded"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisScreen({ history, onViewDetails }: Props) {
  const [selectedProducers, setSelectedProducers] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('analysis_producers');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedFarms, setSelectedFarms] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('analysis_farms');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBatches, setSelectedBatches] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('analysis_batches');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPhases, setSelectedPhases] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('analysis_phases');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('analysis_dates');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(() => {
    return (sessionStorage.getItem('analysis_metric') as MetricType) || 'score';
  });
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    return (sessionStorage.getItem('analysis_timerange') as TimeRange) || 'all';
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    sessionStorage.setItem('analysis_producers', JSON.stringify(selectedProducers));
  }, [selectedProducers]);

  useEffect(() => {
    sessionStorage.setItem('analysis_farms', JSON.stringify(selectedFarms));
  }, [selectedFarms]);

  useEffect(() => {
    sessionStorage.setItem('analysis_batches', JSON.stringify(selectedBatches));
  }, [selectedBatches]);

  useEffect(() => {
    sessionStorage.setItem('analysis_phases', JSON.stringify(selectedPhases));
  }, [selectedPhases]);

  useEffect(() => {
    sessionStorage.setItem('analysis_dates', JSON.stringify(selectedDates));
  }, [selectedDates]);

  useEffect(() => {
    sessionStorage.setItem('analysis_metric', selectedMetric);
  }, [selectedMetric]);

  useEffect(() => {
    sessionStorage.setItem('analysis_timerange', timeRange);
  }, [timeRange]);
  
  // Get unique options based on current selections (Funnel / Cascading effect)
  const availableProducers = useMemo(() => {
    const filtered = history.filter(h => 
      (selectedFarms.length === 0 || selectedFarms.includes(h.farm || '')) &&
      (selectedBatches.length === 0 || selectedBatches.includes(h.batch || '')) &&
      (selectedPhases.length === 0 || selectedPhases.includes(h.phase || ''))
    );
    return Array.from(new Set(filtered.map(h => h.producer).filter(Boolean))) as string[];
  }, [history, selectedFarms, selectedBatches, selectedPhases]);

  const availableFarms = useMemo(() => {
    const filtered = history.filter(h => 
      (selectedProducers.length === 0 || selectedProducers.includes(h.producer || '')) &&
      (selectedBatches.length === 0 || selectedBatches.includes(h.batch || '')) &&
      (selectedPhases.length === 0 || selectedPhases.includes(h.phase || ''))
    );
    return Array.from(new Set(filtered.map(h => h.farm).filter(Boolean))) as string[];
  }, [history, selectedProducers, selectedBatches, selectedPhases]);

  const availableBatches = useMemo(() => {
    const filtered = history.filter(h => 
      (selectedProducers.length === 0 || selectedProducers.includes(h.producer || '')) &&
      (selectedFarms.length === 0 || selectedFarms.includes(h.farm || '')) &&
      (selectedPhases.length === 0 || selectedPhases.includes(h.phase || ''))
    );
    return Array.from(new Set(filtered.map(h => h.batch).filter(Boolean))) as string[];
  }, [history, selectedProducers, selectedFarms, selectedPhases]);

  const availablePhases = useMemo(() => {
    const filtered = history.filter(h => 
      (selectedProducers.length === 0 || selectedProducers.includes(h.producer || '')) &&
      (selectedFarms.length === 0 || selectedFarms.includes(h.farm || '')) &&
      (selectedBatches.length === 0 || selectedBatches.includes(h.batch || ''))
    );
    return Array.from(new Set(filtered.map(h => h.phase).filter(Boolean))) as string[];
  }, [history, selectedProducers, selectedFarms, selectedBatches]);

  const availableDates = useMemo(() => {
    const filtered = history.filter(h => 
      (selectedProducers.length === 0 || selectedProducers.includes(h.producer || '')) &&
      (selectedFarms.length === 0 || selectedFarms.includes(h.farm || '')) &&
      (selectedBatches.length === 0 || selectedBatches.includes(h.batch || '')) &&
      (selectedPhases.length === 0 || selectedPhases.includes(h.phase || ''))
    );
    return Array.from(new Set(filtered.map(h => h.date).filter(Boolean))).sort().reverse() as string[];
  }, [history, selectedProducers, selectedFarms, selectedBatches, selectedPhases]);

  // Auto-reset filters if current selection becomes invalid due to cascading
  useEffect(() => {
    const validProducers = selectedProducers.filter(p => availableProducers.includes(p));
    if (validProducers.length !== selectedProducers.length) {
      // We don't necessarily want to HARD reset if the data just disappeared, 
      // but the funnel logic implies we should only keep possible choices.
      // However, for UX, maybe just leave them or filter them.
      setSelectedProducers(validProducers);
    }
  }, [availableProducers, selectedProducers]);

  useEffect(() => {
    const validFarms = selectedFarms.filter(f => availableFarms.includes(f));
    if (validFarms.length !== selectedFarms.length) {
      setSelectedFarms(validFarms);
    }
  }, [availableFarms, selectedFarms]);

  useEffect(() => {
    const validBatches = selectedBatches.filter(b => availableBatches.includes(b));
    if (validBatches.length !== selectedBatches.length) {
      setSelectedBatches(validBatches);
    }
  }, [availableBatches, selectedBatches]);

  useEffect(() => {
    const validPhases = selectedPhases.filter(p => availablePhases.includes(p));
    if (validPhases.length !== selectedPhases.length) {
      setSelectedPhases(validPhases);
    }
  }, [availablePhases, selectedPhases]);

  useEffect(() => {
    const validDates = selectedDates.filter(d => availableDates.includes(d));
    if (validDates.length !== selectedDates.length) {
      setSelectedDates(validDates);
    }
  }, [availableDates, selectedDates]);

  const filteredHistory = useMemo(() => {
    let base = history.filter(h => {
      const matchProducer = selectedProducers.length === 0 || selectedProducers.includes(h.producer || '');
      const matchFarm = selectedFarms.length === 0 || selectedFarms.includes(h.farm || '');
      const matchBatch = selectedBatches.length === 0 || selectedBatches.includes(h.batch || '');
      const matchPhase = selectedPhases.length === 0 || selectedPhases.includes(h.phase || '');
      const matchDate = selectedDates.length === 0 || selectedDates.includes(h.date || '');
      return matchProducer && matchFarm && matchBatch && matchPhase && matchDate;
    });

    if (timeRange !== 'all') {
      const now = new Date().getTime();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const cutoff = now - (days * 24 * 60 * 60 * 1000);
      base = base.filter(h => new Date(h.date).getTime() >= cutoff);
    }

    return base.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history, selectedProducers, selectedFarms, selectedBatches, selectedPhases, selectedDates, timeRange]);

  const itemsInView = Array.from(new Set(filteredHistory.map(h => `${h.producer} (${h.farm})${h.batch ? ` - ${h.batch}` : ''}`))) as string[];
  const dates = Array.from(new Set(filteredHistory.map(h => h.date))).sort();
  
  const itemsInflections = useMemo(() => {
    const inflections: Record<string, string[]> = {};
    itemsInView.forEach(item => {
      inflections[item] = [];
      const itemVisits = filteredHistory.filter(h => `${h.producer} (${h.farm})${h.batch ? ` - ${h.batch}` : ''}` === item).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      for (let i = 1; i < itemVisits.length; i++) {
        const prev = itemVisits[i - 1];
        const curr = itemVisits[i];
        
        let valPrev = 0, valCurr = 0;
        if (selectedMetric === 'score') { valPrev = prev.results.score; valCurr = curr.results.score; }
        else if (selectedMetric === 'cough') { valPrev = prev.results.cFreq; valCurr = curr.results.cFreq; }
        else if (selectedMetric === 'sneeze') { valPrev = prev.results.sFreq; valCurr = curr.results.sFreq; }
        else if (selectedMetric === 'enteric') { valPrev = prev.results.liqFreq; valCurr = curr.results.liqFreq; }
        else if (selectedMetric === 'mortality') { valPrev = prev.results.mortalityRate; valCurr = curr.results.mortalityRate; }
        
        // Define inflection: significant drop in score or spike in problems
        const isInflection = (selectedMetric === 'score') 
           ? (valCurr - valPrev <= -5) 
           : (valCurr - valPrev >= (selectedMetric === 'mortality' ? 0.3 : 4));
        
        if (isInflection) {
          inflections[item].push(curr.date);
        }
      }
    });
    return inflections;
  }, [filteredHistory, itemsInView, selectedMetric]);

  const chartData = dates.map(date => {
    const entry: any = { date };
    itemsInView.forEach(item => {
      const visit = filteredHistory.find(h => h.date === date && `${h.producer} (${h.farm})${h.batch ? ` - ${h.batch}` : ''}` === item);
      if (visit) {
        const key = item;
        if (selectedMetric === 'score') entry[key] = visit.results.score;
        else if (selectedMetric === 'cough') entry[key] = visit.results.cFreq;
        else if (selectedMetric === 'sneeze') entry[key] = visit.results.sFreq;
        else if (selectedMetric === 'enteric') entry[key] = visit.results.liqFreq;
        else if (selectedMetric === 'mortality') entry[key] = visit.results.mortalityRate;
        entry[`${key}_visit`] = visit; 
        entry[`${key}_isInflection`] = itemsInflections[item].includes(date);
      }
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-xl shadow-lg text-xs min-w-[200px]">
          <p className="font-bold border-b border-[var(--border)] pb-2 mb-2 text-[var(--text-main)]">{label.split('-').reverse().slice(0, 2).join('/')}</p>
          {payload.map((entry: any, index: number) => {
            const visit: VisitData = entry.payload[`${entry.dataKey}_visit`];
            const isInflection = entry.payload[`${entry.dataKey}_isInflection`];
            if (!visit) return null;
            return (
              <div key={index} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 font-bold mb-1" style={{ color: entry.color }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </div>
                <div className="pl-4 space-y-1 text-[10px] text-[var(--text-muted)]">
                  <p><span className="font-semibold text-[var(--text-main)]">Fase:</span> {visit.phase}{visit.batch ? ` / Lote: ${visit.batch}` : ''}</p>
                  <p><span className="font-semibold text-[var(--text-main)]">Produtor:</span> {visit.farm}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1 bg-[var(--bg)] p-1.5 rounded">
                    <p>Score: <span className="font-mono text-[var(--text-main)] font-bold">{visit.results.score.toFixed(0)}</span></p>
                    <p>Tosse: <span className="font-mono text-brand-warn font-bold">{visit.results.cFreq.toFixed(1)}%</span></p>
                    <p>Espirro: <span className="font-mono text-brand-danger font-bold">{visit.results.sFreq.toFixed(1)}%</span></p>
                    <p>Entérico: <span className="font-mono text-brand-warn font-bold">{visit.results.liqFreq.toFixed(1)}%</span></p>
                  </div>
                  {isInflection && (
                    <div className="mt-1 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-1 rounded font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                      ⚠️ Alerta de Inflexão
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return null;
    const scores = filteredHistory.map(h => h.results.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const best = Math.max(...scores);
    const critical = filteredHistory.filter(h => h.results.score < 70).length;
    
    // Trend calculation
    const midIdx = Math.floor(filteredHistory.length / 2);
    const firstHalf = filteredHistory.slice(0, midIdx);
    const secondHalf = filteredHistory.slice(midIdx);
    const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, h) => s + h.results.score, 0) / firstHalf.length : avg;
    const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, h) => s + h.results.score, 0) / secondHalf.length : avg;
    const trend = secondAvg - firstAvg;

    return { avg, best, critical, trend };
  }, [filteredHistory]);

  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const metrics: { id: MetricType; label: string; icon: any; color: string }[] = [
    { id: 'score', label: 'Escore Global', icon: Activity, color: 'brand-primary' },
    { id: 'cough', label: 'Índice Tosse', icon: Wind, color: 'brand-warn' },
    { id: 'sneeze', label: 'Índice Espirro', icon: Wind, color: 'brand-danger' },
    { id: 'enteric', label: 'Diarreia (E3)', icon: Droplets, color: 'brand-danger' },
    { id: 'mortality', label: 'Mortalidade', icon: TrendingUp, color: 'brand-danger' },
  ];

  const resetFilters = () => {
    setSelectedProducers([]);
    setSelectedFarms([]);
    setSelectedPhases([]);
    setSelectedDates([]);
    setTimeRange('all');
    setSelectedMetric('score');
  };

  const scoreDistribution = useMemo(() => {
    const dist = [
      { name: 'Crítico (<70)', value: 0, fill: '#f43f5e' },
      { name: 'Atenção (70-84)', value: 0, fill: '#f59e0b' },
      { name: 'Excelente (85+)', value: 0, fill: '#10b981' }
    ];
    filteredHistory.forEach(h => {
      if (h.results.score < 70) dist[0].value++;
      else if (h.results.score < 85) dist[1].value++;
      else dist[2].value++;
    });
    return dist;
  }, [filteredHistory]);

  const topVariations = useMemo(() => {
    const groups: Record<string, VisitData[]> = {};
    history.forEach(h => {
      const key = `${h.producer}-${h.farm}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });

    const variations = [];
    for (const key in groups) {
      const visits = groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (visits.length > 1) {
        const last = visits[visits.length - 1];
        const prev = visits[visits.length - 2];
        const diff = last.results.score - prev.results.score;
        if (Math.abs(diff) >= 3) {
          variations.push({ producer: last.producer, farm: last.farm, diff, current: last.results.score });
        }
      }
    }
    return variations.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 4);
  }, [history]);

  const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, dataKey, value } = props;
    if (value === null || value === undefined) return null;
    const isInflection = payload[`${dataKey}_isInflection`];
    if (isInflection) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="var(--surface)" stroke="#ef4444" strokeWidth={3} />
          <circle cx={cx} cy={cy} r={2} fill="#ef4444" />
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill="var(--surface)" stroke={stroke} strokeWidth={2} />;
  };

  const CustomActiveDot = (props: any) => {
    const { cx, cy, stroke, payload, dataKey } = props;
    const isInflection = payload[`${dataKey}_isInflection`];
    if (isInflection) {
      return (
         <circle cx={cx} cy={cy} r={8} fill="#ef4444" stroke="var(--surface)" strokeWidth={2} />
      );
    }
    return <circle cx={cx} cy={cy} r={7} fill={stroke} stroke="var(--surface)" strokeWidth={2} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-brand-primary">Evolução e Tendências</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Análise aprofundada de histórico e predição de desvios sanitários.
          </p>
        </div>
        <button 
          onClick={resetFilters}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg text-xs font-bold uppercase transition-all hover:border-brand-primary"
        >
          <RefreshCcw size={14} /> Redefinir Vista
        </button>
      </div>

      {/* Filters Hub */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <MultiSelect 
            label="Clientes"
            icon={Search}
            options={availableProducers}
            selected={selectedProducers}
            onChange={setSelectedProducers}
            placeholder="Todos Clientes"
          />

          <MultiSelect 
            label="Produtores"
            icon={Layers}
            options={availableFarms}
            selected={selectedFarms}
            onChange={setSelectedFarms}
            placeholder="Todos Produtores"
          />

          <MultiSelect 
            label="Lotes"
            icon={Layers}
            options={availableBatches}
            selected={selectedBatches}
            onChange={setSelectedBatches}
            placeholder="Todos Lotes"
          />

          <MultiSelect 
            label="Fases"
            icon={Layers}
            options={availablePhases}
            selected={selectedPhases}
            onChange={setSelectedPhases}
            placeholder="Todas Fases"
          />

          <MultiSelect 
            label="Datas"
            icon={Calendar}
            options={availableDates}
            selected={selectedDates}
            onChange={setSelectedDates}
            placeholder="Todas as Datas exatas"
            formatOption={(opt) => opt.split('-').reverse().join('/')}
          />

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" size={16} />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-xl text-sm appearance-none focus:outline-none cursor-pointer"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Todo histórico</option>
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[var(--text-dim)] pointer-events-none" size={16} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-2">
            {metrics.map(m => {
              const Icon = m.icon;
              const isSelected = selectedMetric === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMetric(m.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border",
                    isSelected 
                      ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20 scale-105" 
                      : "bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-muted)] hover:border-brand-primary"
                  )}
                >
                  <Icon size={14} />
                  {m.label}
                </button>
              )
            })}
          </div>

          <div className="flex bg-[var(--bg)] rounded-xl p-1 border border-[var(--border)] gap-1">
             <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                viewMode === 'grid' ? "bg-brand-primary text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              )}
             >
               Grid
             </button>
             <button 
              onClick={() => setViewMode('table')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                viewMode === 'table' ? "bg-brand-primary text-white" : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              )}
             >
               Tabela
             </button>
          </div>
        </div>
      </div>

      {/* KPI Overview and Variations */}
      <div className="space-y-4">
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card py-4 px-5 group hover:border-brand-primary transition-all duration-300 flex flex-col justify-between relative overflow-hidden hover:bg-gradient-to-br hover:from-[var(--brand-primary)]/5 hover:to-transparent hover:shadow-md">
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Escore Médio Real</p>
                 </div>
                 <div className="p-2 bg-[var(--surface-hover)] text-brand-primary rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                    <Activity size={16} />
                 </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                <p className="text-3xl font-bold font-mono tracking-tighter leading-none">{stats.avg.toFixed(1)}</p>
                <div className={cn(
                  "flex items-center text-[10px] font-bold px-2 py-1 rounded-md border",
                  stats.trend > 0 ? "bg-brand-success/10 text-brand-success border-brand-success/20" : stats.trend < 0 ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                )}>
                  {stats.trend > 0 ? <ArrowUpRight size={12} className="mr-0.5" /> : stats.trend < 0 ? <ArrowDownRight size={12} className="mr-0.5" /> : null}
                  {Math.abs(stats.trend).toFixed(1)}
                </div>
              </div>
            </div>
            
            <div className="card py-4 px-5 group hover:border-brand-primary transition-all duration-300 flex flex-col justify-between relative overflow-hidden hover:bg-gradient-to-br hover:from-[var(--brand-primary)]/5 hover:to-transparent hover:shadow-md">
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Volume Analisado</p>
                 </div>
                 <div className="p-2 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-lg group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                    <Layers size={16} />
                 </div>
              </div>
              <div className="mt-4 text-right">
                 <p className="text-3xl font-bold font-mono tracking-tighter leading-none">{filteredHistory.length}</p>
                 <div className="w-full h-1.5 bg-[var(--surface-hover)] rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full relative" style={{ width: '100%' }}></div>
                 </div>
              </div>
            </div>

            <div className="card py-4 px-5 group hover:border-brand-success transition-all duration-300 flex flex-col justify-between relative overflow-hidden hover:bg-gradient-to-br hover:from-brand-success/5 hover:to-transparent shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <p className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Meta (Score)</p>
                 </div>
                 <div className="p-2 bg-brand-success/10 text-brand-success rounded-lg group-hover:bg-brand-success group-hover:text-white transition-colors duration-300">
                    <CheckCircle size={16} />
                 </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                 <p className="text-3xl font-bold font-mono tracking-tighter leading-none">85.0</p>
                 <p className="text-[10px] text-brand-success font-bold uppercase tracking-widest bg-brand-success/10 px-2 py-1 rounded">Excelência</p>
              </div>
            </div>

            <div className="card py-4 px-5 bg-brand-danger/5 border-brand-danger/20 group hover:border-brand-danger transition-all duration-300 flex flex-col justify-between relative overflow-hidden hover:bg-gradient-to-br hover:from-brand-danger/10 hover:to-transparent shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start">
                 <div className="flex flex-col gap-1">
                   <p className="text-[10px] font-bold text-brand-danger uppercase tracking-wider">Lotes em Alerta</p>
                 </div>
                 <div className="p-2 bg-brand-danger/20 text-brand-danger rounded-lg group-hover:bg-brand-danger group-hover:text-white transition-colors duration-300">
                    <AlertTriangle size={16} />
                 </div>
              </div>
              <div className="flex items-end justify-between mt-4">
                 <p className="text-3xl font-bold font-mono tracking-tighter text-brand-danger leading-none">{stats.critical}</p>
                 <p className="text-[10px] text-brand-danger/80 font-bold uppercase tracking-widest border border-brand-danger/20 px-2 py-1 rounded whitespace-nowrap">Escore &lt; 70</p>
              </div>
            </div>
          </div>
        )}

        {topVariations.length > 0 && (
          <div className="card pt-4 pb-3 px-5 border shadow-sm">
             <div className="flex items-center gap-2 mb-4">
                <Layers size={14} className="text-brand-primary" />
                <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Desvios Sanitários Recentes (Análise IA)</span>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {topVariations.map((v, i) => (
                   <div key={i} className="flex items-center justify-between pb-3 sm:pb-0 border-b border-[var(--border)] sm:border-0 last:border-0">
                      <div className="min-w-0 pr-3">
                        <p className="text-[11px] font-bold text-[var(--text-main)] uppercase truncate leading-tight">{v.producer}</p>
                        <p className="text-[9px] text-[var(--text-muted)] uppercase truncate mt-0.5">{v.farm}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                         <span className="text-lg font-bold font-mono text-[var(--text-main)] leading-none">{v.current.toFixed(0)}</span>
                         <div className={cn(
                            "flex items-center text-[10px] font-bold mt-1 px-1 rounded",
                            v.diff > 0 ? "text-brand-success bg-brand-success/10" : "text-brand-danger bg-brand-danger/10"
                         )}>
                            {v.diff > 0 ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
                            {Math.abs(v.diff).toFixed(1)}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Optimized Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card rounded-2xl p-6 overflow-hidden col-span-1 xl:col-span-2 shadow-sm">
          <div className="flex justify-between items-start mb-10">
             <div>
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Activity className="text-brand-primary" size={18} />
                  Evolução Comparativa
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5">
                  Exibindo: {metrics.find(m => m.id === selectedMetric)?.label}
                </p>
             </div>
             <div className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1 bg-[var(--surface-hover)] rounded-full border border-[var(--border)]">
               {chartData.length} avaliações
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10} 
                    tick={{ fill: 'var(--text-muted)' }}
                    tickFormatter={(val) => val.split('-').reverse().slice(0, 2).join('/')}
                    dy={10}
                  />
                  <YAxis 
                    domain={
                      selectedMetric === 'score' 
                        ? [0, 100] 
                        : selectedMetric === 'sneeze'
                          ? [0, (dataMax: number) => Math.max(dataMax * 1.15, 15)]
                          : [0, (dataMax: number) => Math.max(dataMax * 1.15, 10)]
                    } 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={10} 
                    tick={{ fill: 'var(--text-muted)' }} 
                    tickCount={6}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Legend iconType="circle" align="right" verticalAlign="top" wrapperStyle={{ fontSize: '10px', paddingBottom: '30px' }} />
                  
                  {selectedMetric === 'score' && (
                    <ReferenceLine y={85} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'right', value: 'Meta', fill: '#10b981', fontSize: 10 }} />
                  )}
                  {selectedMetric === 'cough' && (
                    <ReferenceLine y={5} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: 'Limite', fill: '#f43f5e', fontSize: 10 }} />
                  )}
                  {selectedMetric === 'sneeze' && (
                    <ReferenceLine y={10} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: 'Limite', fill: '#f43f5e', fontSize: 10 }} />
                  )}
                  {selectedMetric === 'enteric' && (
                    <ReferenceLine y={5} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: 'Limite', fill: '#f43f5e', fontSize: 10 }} />
                  )}

                  {itemsInView.map((item, i) => (
                    <Line 
                      key={item} 
                      type="monotone" 
                      dataKey={item} 
                      name={item}
                      stroke={colors[i % colors.length]} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: colors[i % colors.length] }}
                      connectNulls
                      animationDuration={800}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex flex-col items-center justify-center text-[var(--text-dim)] border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--bg)]/50 font-medium">
              <Filter size={32} className="mb-4 opacity-20 text-brand-primary" />
              <p className="text-sm">Nenhum dado com os filtros atuais.</p>
              <button onClick={resetFilters} className="mt-4 text-brand-primary text-xs font-bold px-4 py-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors">Limpar Filtros</button>
            </div>
          )}
        </div>

        <div className="card rounded-2xl p-6 overflow-hidden col-span-1 border-t-4 border-t-brand-primary xl:border-t-0 xl:border-l-4 xl:border-l-brand-primary shadow-sm bg-gradient-to-b from-[var(--surface)] to-[var(--bg)]/10">
          <div className="flex justify-between items-start mb-6">
             <div>
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Activity className="text-brand-primary" size={18} />
                  Distribuição (Escore Geral)
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5">
                  Proporção do Histórico Filtrado
                </p>
             </div>
          </div>
          <div className="h-[250px]">
            {filteredHistory.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={scoreDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {scoreDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontSize: '10px', borderRadius: '8px' }} 
                        itemStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                     />
                     <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  </PieChart>
               </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Sem dados</div>
            )}
          </div>
          <div className="mt-4 text-[9px] font-medium text-center text-[var(--text-muted)] uppercase tracking-widest">Painel Desempenho Sanitário</div>
        </div>
      </div>

      {/* Enhanced Batch Grid or Table View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHistory.slice().reverse().map((latest) => {
            const pVisits = history.filter(h => h.producer === latest.producer && h.date <= latest.date);
            const previous = pVisits.length > 1 ? pVisits[pVisits.length - 2] : null;
            const diff = previous ? latest.results.score - previous.results.score : 0;

            return (
              <div key={latest.id} className="p-5 bg-[var(--surface)] rounded-2xl border border-[var(--border)] hover:border-brand-primary hover:shadow-lg transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{latest.producer || 'Sem Nome'}</p>
                    <p className="text-[10px] text-[var(--text-dim)] uppercase font-medium mb-1">{latest.farm || 'Produtor N/A'}{latest.batch ? ` • Lote: ${latest.batch}` : ''}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold">
                         <Layers size={10} /> {(latest.phase || '').split(' ')[0]}
                      </span>
                      <span className="text-[var(--border)] text-[8px]">|</span>
                      <span className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-bold">
                         <Clock size={10} /> {calculateHousingDays(latest.housingDate, latest.date)}d
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-0.5">
                      <p className="text-[9px] text-[var(--text-muted)]">Ração: <span className="font-semibold text-[var(--text-main)]">{latest.feed || 'Não informado'}</span></p>
                      <p className="text-[9px] text-[var(--text-muted)]">Medicam.: <span className="font-semibold text-[var(--text-main)]">{latest.meds || 'Não informado'}</span></p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight",
                    latest.results.score >= 85 ? "bg-brand-success/10 text-brand-success" :
                    latest.results.score >= 70 ? "bg-brand-warn/10 text-brand-warn" :
                    "bg-brand-danger/10 text-brand-danger"
                  )}>
                    {latest.results.scoreStatus}
                  </div>
                </div>

                <div className="flex items-end justify-between mt-6 relative z-10">
                  <div>
                    <p className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-tighter opacity-70">Última Avaliação</p>
                    <p className="text-4xl font-bold font-mono tracking-tighter leading-none mt-1">{latest.results.score.toFixed(0)}</p>
                  </div>
                  {previous && (
                    <div className={cn(
                      "flex flex-col items-end",
                      diff > 0 ? "text-brand-success" : diff < 0 ? "text-brand-danger" : "text-[var(--text-muted)]"
                    )}>
                      <div className="flex items-center gap-0.5 text-xs font-black">
                        {diff > 0 ? <ArrowUpRight size={16} /> : diff < 0 ? <ArrowDownRight size={16} /> : null}
                        {diff === 0 ? '=' : Math.abs(diff).toFixed(0)}
                      </div>
                      <span className="text-[8px] uppercase font-bold opacity-60">Evolução</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-5 border-t border-[var(--border)] border-dashed grid grid-cols-4 gap-2 relative z-10">
                  <div className="bg-[var(--bg)]/50 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Tosse</p>
                    <p className={cn("text-xs font-mono font-bold mt-0.5", latest.results.cFreq > 5 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                      {latest.results.cFreq.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-[var(--bg)]/50 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Espirro</p>
                    <p className={cn("text-xs font-mono font-bold mt-0.5", latest.results.sFreq > 10 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                      {latest.results.sFreq.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-[var(--bg)]/50 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Entérico</p>
                    <p className={cn("text-xs font-mono font-bold mt-0.5", latest.results.liqFreq > 5 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                      {latest.results.liqFreq.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-[var(--bg)]/50 p-2 rounded-xl text-center">
                    <p className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Mortal.</p>
                    <p className={cn("text-xs font-mono font-bold mt-0.5", latest.results.mortalityRate > latest.results.mortalityMeta && latest.results.mortalityMeta > 0 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                      {latest.results.mortalityRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Cliente / Prod. / Lote</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Fase / Idade</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Score</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Tosse</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Espirro</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Entérico</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Mortal.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredHistory.slice().reverse().map((latest) => {
                  return (
                    <tr key={latest.id} className="hover:bg-[var(--surface-hover)] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-brand-primary">{latest.producer || 'Sem Nome'}</p>
                        <p className="text-[10px] text-[var(--text-dim)] uppercase font-medium">{latest.farm || 'Fazenda N/A'}{latest.batch ? ` • Lote: ${latest.batch}` : ''}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-[var(--text-main)]">{latest.phase}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{calculateHousingDays(latest.housingDate, latest.date)} dias de alojamento</p>
                        <div className="mt-1">
                          <p className="text-[9px] text-[var(--text-muted)]">Ração: <span className="font-semibold text-[var(--text-main)]">{latest.feed || 'Não informado'}</span></p>
                          <p className="text-[9px] text-[var(--text-muted)]">Medicam.: <span className="font-semibold text-[var(--text-main)]">{latest.meds || 'Não informado'}</span></p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-block px-3 py-1 rounded-full text-xs font-black font-mono",
                          latest.results.score >= 85 ? "bg-brand-success/10 text-brand-success" :
                          latest.results.score >= 70 ? "bg-brand-warn/10 text-brand-warn" :
                          "bg-brand-danger/10 text-brand-danger"
                        )}>
                          {latest.results.score.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className={cn("text-xs font-bold", latest.results.cFreq > 5 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                          {latest.results.cFreq.toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <p className={cn("text-xs font-bold", latest.results.sFreq > 10 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                          {latest.results.sFreq.toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <p className={cn("text-xs font-bold", latest.results.liqFreq > 5 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                          {latest.results.liqFreq.toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <p className={cn("text-xs font-bold", latest.results.mortalityRate > latest.results.mortalityMeta && latest.results.mortalityMeta > 0 ? "text-brand-danger" : "text-[var(--text-main)]")}>
                          {latest.results.mortalityRate.toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onViewDetails(latest)}
                          className="text-[10px] font-bold text-brand-primary hover:underline uppercase"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

