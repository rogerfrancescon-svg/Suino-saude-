import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { VisitData } from '../types';
import { 
  ComposedChart, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ReferenceLine, LabelList
} from 'recharts';
import { ShieldCheck, AlertTriangle, XCircle, BarChart3, TrendingUp, PieChart as PieChartIcon, ChevronDown, ChevronUp, Share2, ImageIcon, FileText, CheckCircle, Activity, AirVent } from 'lucide-react';
import { cn } from '../lib/utils';
import { exportToPDF } from '../lib/exports';

interface Props {
  data: Partial<VisitData>;
  results: any;
  onPrev: () => void;
  onSave: () => void;
  onClear: () => void;
  history: VisitData[];
  isReadOnly?: boolean;
}

export default function SummaryScreen({ data, results, onPrev, onSave, onClear, history, isReadOnly }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const barData = [
    { name: 'Tosse', value: results.cFreq, threshold: 5 },
    { name: 'Espirro', value: results.sFreq, threshold: 10 },
    { name: 'Diarreia', value: results.liqFreq, threshold: 5 },
    { name: 'Mortal.', value: results.mortalityRate, threshold: results.mortalityMeta > 0 ? results.mortalityMeta : 0 },
  ];

  const pieData = [
    { name: 'Escore 1', value: results.e1p, color: '#10b981' },
    { name: 'Escore 2', value: results.e2p, color: '#f59e0b' },
    { name: 'Escore 3', value: results.e3p, color: '#f43f5e' },
  ];

  const alerts = [];
  if (results.cFreq >= 5) alerts.push({ level: 'warn', msg: `Tosses: ${results.cFreq.toFixed(1)}% — Limiar Pneumonia.` });
  if (results.sFreq >= 10) alerts.push({ level: 'danger', msg: `Espirros: ${results.sFreq.toFixed(1)}% — Sugestivo Rinite Atrófica.` });
  if (results.liqFreq > 5) alerts.push({ level: 'danger', msg: `Diarreia Líquida: ${results.liqFreq.toFixed(1)}% — Alerta sanitário.` });
  if (results.mortalityMeta > 0 && results.mortalityRate > results.mortalityMeta) {
    alerts.push({ level: 'danger', msg: `Mortalidade: ${results.mortalityRate.toFixed(1)}% — Acima da meta proporcional (${results.mortalityMeta.toFixed(1)}%).` });
  }
  if (Number(data.co2) > 2500) alerts.push({ level: 'warn', msg: `CO2 Elevado: ${data.co2} ppm — Verifique ventilação.` });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      // Construct a complete VisitData object from data and results
      const exportableRecord: VisitData = {
        id: data.id || Date.now(),
        date: data.date || '',
        producer: data.producer || '',
        farm: data.farm || '',
        batch: data.batch || '',
        phase: data.phase || ('' as any),
        feed: data.feed || '',
        meds: data.meds || '',
        housingDate: data.housingDate || '',
        mortality: data.mortality || 0,
        totalAnimals: data.totalAnimals || 0,
        temp: data.temp || '',
        humidity: data.humidity || '',
        co2: data.co2 || '',
        duration: data.duration || 'Curta (1–5 dias)',
        counts: data.counts || { cough: 0, sneeze: 0, e2: 0, e3: 0 },
        results: results,
        notes: data.notes || '',
        images: data.images || []
      };
      
      exportToPDF([exportableRecord]);
    } catch (e) {
      console.error('Export error:', e);
      if (typeof window !== 'undefined' && window.alert) {
         window.alert('Erro ao gerar relatorio. Tente novamente.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div id="summary-export-target" className="space-y-6 p-4 -m-4 rounded-xl bg-[var(--bg)]">
        <div className="border-b border-[var(--border)] pb-5 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest text-brand-primary-light bg-brand-primary/10 rounded-full uppercase mb-2">
              Resumo Geral da Visita
            </span>
            <h2 className="text-2xl font-bold">Painel de Resumo</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Visão consolidada do cenário sanitário da visita atual.
            </p>
          </div>
          {isReadOnly && (
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-hover)] border border-[var(--border)] text-sm font-bold rounded-lg hover:bg-brand-primary/10 hover:text-brand-primary transition-colors disabled:opacity-50"
            >
              <Share2 size={16} /> 
              {isExporting ? 'Processando...' : 'Exportar PDF'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2 px-1">
          📋 Informações do Lote
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Identificação */}
          <div className="card rounded-xl p-5 space-y-4 text-sm text-[var(--text-main)] select-text">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-primary border-b border-[var(--border)] pb-2 mb-3">Identificação</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Produtor / Granja</p>
                <p className="font-medium">{data.producer || '-'} {data.farm ? `— ${data.farm}` : ''}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Data da Visita</p>
                <p className="font-medium">{data.date ? new Date(data.date).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Fase de Produção</p>
                <p className="font-medium">{data.phase || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Lote / Galpão</p>
                <p className="font-medium">{data.batch || '-'}</p>
              </div>
            </div>
          </div>

          {/* Dados Produtivos */}
          <div className="card rounded-xl p-5 space-y-4 text-sm text-[var(--text-main)] select-text">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-primary border-b border-[var(--border)] pb-2 mb-3">Dados Produtivos</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Animais Alojados</p>
                <p className="font-medium">{data.totalAnimals || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Data de Alojamento</p>
                <p className="font-medium">{data.housingDate ? new Date(data.housingDate).toLocaleDateString('pt-BR') : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Mortalidade Atual</p>
                <p className="font-medium text-brand-danger">{data.mortality || '0'} ({results.mortalityRate?.toFixed(2) || '0.00'}%)</p>
              </div>
            </div>
          </div>

          {/* Nutrição e Medicamentos */}
          <div className="card rounded-xl p-5 space-y-4 text-sm text-[var(--text-main)] select-text">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-primary border-b border-[var(--border)] pb-2 mb-3">Nutrição & Medicamentos</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Ração / Água</p>
                <p className="font-medium">{data.feed || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Medicamentos (Via ração/água)</p>
                <p className="font-medium">{data.meds || '-'}</p>
              </div>
            </div>
          </div>

          {/* Ambiente e Sinais Clínicos Básicos */}
          <div className="card rounded-xl p-5 space-y-4 text-sm text-[var(--text-main)] select-text">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-primary border-b border-[var(--border)] pb-2 mb-3">Ambiente & Sinais Clínicos</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Temperatura</p>
                <p className="font-medium">{data.temp ? `${data.temp}°C` : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Umidade</p>
                <p className="font-medium">{data.humidity ? `${data.humidity}%` : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Tosse / Baias</p>
                <p className="font-medium">{data.counts?.cough || 0}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold">Espirro / Baias</p>
                <p className="font-medium">{data.counts?.sneeze || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
           <div className={cn("p-5 rounded-2xl relative overflow-hidden flex flex-col justify-center border", 
               results.score >= 85 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : 
               results.score >= 70 ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" : 
               "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400")}>
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldCheck size={80} />
              </div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-1 opacity-80 z-10">Índice Geral de Sanidade (Score)</p>
              <div className="flex items-baseline gap-2 z-10 mb-2">
                 <span className="text-5xl font-black leading-none tracking-tighter">{results.score}</span>
                 <span className="text-lg font-bold opacity-60">/100</span>
              </div>
              <div className={cn("mt-1 inline-block px-3 py-1 rounded-full z-10 border self-start", 
                  results.score >= 85 ? "bg-emerald-500/20 border-emerald-500/30" : 
                  results.score >= 70 ? "bg-amber-500/20 border-amber-500/30" : 
                  "bg-rose-500/20 border-rose-500/30")}>
                 <span className="text-xs font-black tracking-widest uppercase">{results.scoreStatus}</span>
              </div>
           </div>
        </div>

        <div className="flex flex-col gap-4">
           {data.temp && (
             <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl flex items-center gap-4">
               <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl"><Activity size={24} /></div>
               <div>
                 <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Temperatura</p>
                 <p className="text-xl font-black">{data.temp}°C</p>
               </div>
             </div>
           )}
           {data.co2 && (
             <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl flex items-center gap-4">
               <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-xl"><AirVent size={24} /></div>
               <div>
                 <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Concentração CO2</p>
                 <p className="text-xl font-black">{data.co2} ppm</p>
               </div>
             </div>
           )}
           {!data.temp && !data.co2 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl flex-1 flex flex-col items-center justify-center text-center opacity-60">
                 <AirVent size={24} className="mb-2" />
                 <p className="text-[10px] font-bold uppercase tracking-wider">Sem dados ambientais</p>
              </div>
           )}
        </div>
      </div>

      <div className="card rounded-xl p-6 border-l-4 border-l-brand-primary">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
            🏅 Pontuação do Produtor: {results.score}/100
          </h3>
          <button 
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-[10px] font-bold text-brand-primary uppercase hover:underline"
          >
            {showBreakdown ? <><ChevronUp size={14} /> Ocultar Cálculos</> : <><ChevronDown size={14} /> Mostrar Cálculos</>}
          </button>
        </div>
        
        <div className="space-y-4">
           {results.score >= 85 ? (
             <Alert variant="success" icon={<ShieldCheck />} title="Excelente" desc="Cenário sanitário sob controle." />
           ) : results.score >= 70 ? (
             <Alert variant="warn" icon={<AlertTriangle />} title="Atenção" desc="Monitorar pontos de alerta." />
           ) : (
             <Alert variant="danger" icon={<XCircle />} title="Crítico" desc="Intervenção sanitária necessária." />
           )}
        </div>

        {showBreakdown && results.scoreBreakdown && (
          <div className="mt-4 p-4 bg-[var(--bg)] rounded-lg text-xs space-y-2 border border-[var(--border)] overflow-hidden animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold border-b border-[var(--border)] pb-2 mb-2 text-[var(--text-muted)] uppercase tracking-wider">Base de Cálculos (Score)</h4>
            <div className="flex justify-between border-b border-[var(--border)] border-dashed pb-1">
              <span>Nota Base Inicial</span>
              <span className="font-mono font-bold">100 pts</span>
            </div>
            
            {results.scoreBreakdown.coughDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-danger">
                  <span>Penalidade: Tosse ({results.cFreq.toFixed(1)}%)</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.coughDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.coughDesc}</span>
              </div>
            )}
            {results.scoreBreakdown.sneezeDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-danger">
                  <span>Penalidade: Espirros ({results.sFreq.toFixed(1)}%)</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.sneezeDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.sneezeDesc}</span>
              </div>
            )}
            {results.scoreBreakdown.entericDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-danger">
                  <span>Penalidade: Escores Fecais Altos</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.entericDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.entericDesc}</span>
              </div>
            )}
            {results.scoreBreakdown.mortalityDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-danger">
                  <span>Penalidade: Mortalidade ({results.mortalityRate.toFixed(1)}%)</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.mortalityDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.mortalityDesc}</span>
              </div>
            )}
            {results.scoreBreakdown.environmentDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-warn">
                  <span>Penalidade: Qualidade do Ar/Ambiente</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.environmentDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.environmentDesc}</span>
              </div>
            )}
            {results.scoreBreakdown.historicDeduction > 0 && (
              <div className="flex flex-col border-b border-[var(--border)] border-dashed pb-2">
                <div className="flex justify-between text-brand-warn">
                  <span>Penalidade: Duração Longa do Quadro</span>
                  <span className="font-mono font-bold">- {results.scoreBreakdown.historicDeduction.toFixed(0)} pts</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{results.scoreBreakdown.historicDesc}</span>
              </div>
            )}

            <div className="flex justify-between font-bold pt-2 text-[var(--text-main)] text-sm">
              <span>Nota Final Calculada</span>
              <span className="font-mono">{results.score} pts</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-primary-light" />
            FREQUÊNCIAS VS. LIMIARES (%)
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                 <YAxis 
                   domain={[0, (dataMax: number) => Math.max(dataMax * 1.4, 15)]}
                    tickCount={6}
                    axisLine={false} 
                   tickLine={false} 
                   fontSize={11} 
                   tick={{ fill: 'var(--text-muted)' }} 
                 />
                 <Tooltip 
                   cursor={{ fill: 'var(--surface-hover)' }} 
                   content={({ active, payload, label }) => {
                     if (active && payload && payload.length) {
                       const data = payload[0].payload;
                       return (
                         <div className="bg-[var(--surface)] border border-[var(--border)] p-2 rounded shadow-xl text-xs">
                           <p className="font-bold mb-1">{label}</p>
                           <p>Registrado: {data.value.toFixed(2)}%</p>
                           {data.threshold > 0 && <p className="text-[var(--text-muted)] mt-1">Meta/Limiar: {data.threshold.toFixed(2)}%</p>}
                         </div>
                       );
                     }
                     return null;
                   }} 
                 />
                 <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="value" position="top" offset={10} fontSize={10} fill="var(--text-main)" fontWeight="bold" formatter={(v: number) => `${v.toFixed(1)}%`} />
                     {barData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.value >= entry.threshold && entry.threshold > 0 ? '#f43f5e' : '#14b8a6'} />
                     ))}
                 </Bar>
                 <Scatter dataKey="threshold" fill="#0ea5e9" shape="star" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-2">
             <PieChartIcon className="w-4 h-4 text-brand-success-light" />
             DISTRIBUIÇÃO ESCORES FECAIS (%)
          </h4>
          <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                   <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                   >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Pie>
                   <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', fontSize: '12px' }} />
                   <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase text-[var(--text-muted)]">🚨 Resumo de Alertas Sanitários</h4>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={cn("p-2 px-3 rounded-lg text-xs font-medium border", a.level === 'danger' ? "bg-brand-danger/10 border-brand-danger/30 text-brand-danger" : "bg-brand-warn/10 border-brand-warn/30 text-brand-warn")}>
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div className="card rounded-xl p-5 space-y-3 border-l-4 border-l-brand-primary">
          <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-2">
            📝 Observações da Visita
          </h4>
          <div className="p-4 bg-[var(--bg)]/50 rounded-lg border border-[var(--border)] text-sm text-[var(--text-main)] italic whitespace-pre-wrap">
            {data.notes}
          </div>
        </div>
      )}
      </div>

      {/* Removed Hidden Dashboard for image export */}

      <div className="flex flex-wrap gap-4 pt-4">
        {isReadOnly ? (
          <button onClick={onPrev} className="flex-1 px-6 py-3 bg-[var(--surface-hover)] border border-[var(--border)] font-bold rounded-lg transition-colors">
            ← Voltar para Análise
          </button>
        ) : (
          <>
            <button onClick={onPrev} className="px-6 py-3 bg-[var(--surface-hover)] border border-[var(--border)] font-bold rounded-lg transition-colors">
              ← Editar Dados
            </button>
            {isConfirmingClear ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-danger">Limpar tudo?</span>
                <button 
                  onClick={() => {
                    onClear();
                    setIsConfirmingClear(false);
                  }}
                  className="px-4 py-3 bg-brand-danger text-white font-bold rounded-lg"
                >
                  Sim
                </button>
                <button 
                  onClick={() => setIsConfirmingClear(false)}
                  className="px-4 py-3 border border-[var(--border)] font-bold rounded-lg"
                >
                  Não
                </button>
              </div>
            ) : (
              <button onClick={() => setIsConfirmingClear(true)} className="px-6 py-3 border border-brand-danger text-brand-danger hover:bg-brand-danger/10 font-bold rounded-lg transition-colors">
                🧹 Limpar
              </button>
            )}
            <button onClick={onSave} className="flex-1 md:flex-none px-12 py-3 bg-brand-primary hover:bg-brand-primary-light text-white font-bold rounded-lg shadow-xl shadow-brand-primary/20">
              {data.id ? '💾 Atualizar Relatório' : '💾 Salvar Visita Local'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, threshold, isScore, scoreStatus, subtitle }: any) {
  const isAlert = !isScore && threshold !== undefined && parseFloat(value) >= threshold;
  
  return (
    <div className="card rounded-xl p-4 flex items-center gap-4">
      <div className={cn("p-3 rounded-xl", isAlert ? "bg-brand-danger/10 text-brand-danger" : "bg-brand-primary/10 text-brand-primary-light")}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[22px] font-mono font-extrabold leading-none">{value}</div>
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-tight mt-1 truncate">{label}</div>
        {subtitle && <div className={cn("text-[9px] font-bold uppercase", scoreStatus === 'Excelente' ? 'text-brand-success-light' : scoreStatus === 'Atenção' ? 'text-brand-warn' : 'text-brand-danger')}>{subtitle}</div>}
      </div>
      {!isScore && (
        <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-bold uppercase self-start", isAlert ? "bg-brand-danger/20 text-brand-danger" : "bg-brand-success/20 text-brand-success-light")}>
          {isAlert ? '⚠️ Alerta' : '✓ OK'}
        </div>
      )}
    </div>
  );
}

function Alert({ variant, icon, title, desc }: { variant: 'success' | 'warn' | 'danger', icon: React.ReactNode, title: string, desc: string }) {
  const styles = {
    success: 'bg-brand-success/10 border-brand-success/40 text-brand-success-light',
    warn: 'bg-brand-warn/10 border-brand-warn/40 text-brand-warn',
    danger: 'bg-brand-danger/10 border-brand-danger/40 text-brand-danger',
  };

  return (
    <div className={cn("flex gap-3 p-4 border rounded-lg", styles[variant])}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs opacity-80">{desc}</div>
      </div>
    </div>
  );
}
