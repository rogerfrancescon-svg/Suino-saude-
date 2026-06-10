import React, { useMemo, useState } from 'react';
import { VisitData, Phase } from '../types';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ZAxis, Cell
} from 'recharts';
import { Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  history: VisitData[];
}

export default function OrganogramaScreen({ history }: Props) {
  const [selectedPhase, setSelectedPhase] = useState<Phase | 'Todas'>('Todas');

  // Obter apenas as visitas mais recentes (lotes em andamento) para cada combinação Produtor+Granja+Lote
  const todosLotesEmAndamento = useMemo(() => {
    const map = new Map<string, VisitData>();
    history.forEach(h => {
      const key = `${h.producer}-${h.farm}-${h.batch || ''}`;
      const existing = map.get(key);
      if (!existing || new Date(h.date) > new Date(existing.date)) {
        map.set(key, h);
      }
    });
    
    return Array.from(map.values())
      .map(d => {
        let ageDays = 0;
        if (d.housingDate && d.date) {
            const [y1, m1, d1] = d.housingDate.split('-').map(Number);
            const [y2, m2, d2] = d.date.split('-').map(Number);
            if (y1 && y2) {
            const time1 = Date.UTC(y1, m1 - 1, d1);
            const time2 = Date.UTC(y2, m2 - 1, d2);
            ageDays = Math.max(0, Math.round((time2 - time1) / (1000 * 60 * 60 * 24)));
            }
        }
        return {
            ...d,
            ageDays,
            label: `${d.producer} - ${d.farm}${d.batch ? ` Lote: ${d.batch}` : ''}`,
            shortLabel: d.farm || d.producer,
            score: d.results.score,
        };
      })
      .sort((a, b) => a.ageDays - b.ageDays); // Sort chronologically by age
  }, [history]);

  const lotesEmAndamento = useMemo(() => {
    if (selectedPhase === 'Todas') return todosLotesEmAndamento;
    return todosLotesEmAndamento.filter(lote => lote.phase === selectedPhase);
  }, [todosLotesEmAndamento, selectedPhase]);

  if (todosLotesEmAndamento.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <Layers size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-bold uppercase tracking-wider">Nenhum lote em andamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animation-fade-in pb-10">
      <header className="mb-6">
        <h2 className="text-2xl font-black text-[var(--text-main)] mb-1">Organograma Sanitário</h2>
        <p className="text-sm text-[var(--text-dim)] font-medium">Lotes em Andamento mapeados por Idade e Fase de Ração.</p>
      </header>
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedPhase('Todas')}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-bold transition-colors border",
            selectedPhase === 'Todas' ? "bg-brand-primary text-white border-brand-primary" : "bg-transparent text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
          )}
        >
          Todas
        </button>
        {["Creche (leitões desmamados)", "Terminação", "Reprodução (matriz/cachaço)"].map(phase => (
          <button
            key={phase}
            onClick={() => setSelectedPhase(phase as Phase)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-colors border",
              selectedPhase === phase ? "bg-brand-primary text-white border-brand-primary" : "bg-transparent text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {phase.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-xl shadow-black/5">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-[var(--text-dim)] flex items-center gap-2">
            <Layers size={16} /> Mapa de Lotes: Idade vs. Score
        </h3>
        
        <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="var(--border)" />
                <XAxis 
                    type="number" 
                    dataKey="ageDays" 
                    name="Idade" 
                    unit=" dias"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    domain={[-5, (dataMax: number) => dataMax + 10]}
                />
                <YAxis 
                    type="number" 
                    dataKey="score" 
                    name="Score" 
                    domain={[0, 100]}
                    tickCount={6}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                />
                <ZAxis type="number" range={[400, 400]} />
                <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-[var(--surface)] border border-[var(--border)] p-4 rounded-xl shadow-xl backdrop-blur-md">
                                    <p className="font-bold text-sm text-[var(--text-main)] mb-1">{data.label}</p>
                                    <p className="text-xs text-[var(--text-dim)] mb-1">Fase: <span className="font-semibold text-[var(--text-main)]">{data.phase}</span></p>
                                    <p className="text-xs text-[var(--text-dim)] mb-1">Ração: <span className="font-semibold text-[var(--text-main)]">{data.feed || 'ND'}</span></p>
                                    <p className="text-xs text-[var(--text-dim)] mb-2">Idade: <span className="font-semibold text-[var(--text-main)]">{data.ageDays} dias</span></p>
                                    <p className="text-xs text-[var(--text-dim)] mb-1">Medic.: <span className="font-semibold text-[var(--text-main)]">{data.meds || 'Nenhuma'}</span></p>
                                    <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between">
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Score</span>
                                        <span className={cn(
                                            "text-sm font-black",
                                            data.score >= 85 ? "text-brand-success" : data.score >= 70 ? "text-brand-warning" : "text-brand-danger"
                                        )}>{Math.round(data.score)}/100</span>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    }}
                />
                <Scatter name="Lotes" data={lotesEmAndamento}>
                    {lotesEmAndamento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 85 ? '#2ea043' : entry.score >= 70 ? '#d29922' : '#da3633'} />
                    ))}
                    <LabelList 
                        dataKey="shortLabel" 
                        position="top" 
                        offset={15} 
                        fill="var(--text-main)" 
                        fontSize={10} 
                        fontWeight="bold" 
                    />
                </Scatter>
            </ScatterChart>
            </ResponsiveContainer>
        </div>
      </div>
      
      {/* Tabela Complementar */}
      <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-xl shadow-black/5 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-[var(--bg)]/50 border-b border-[var(--border)]">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Cliente / Produtor / Lote</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Idade</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Fase & Ração</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider">Medicação</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-[var(--text-dim)] tracking-wider text-center">Score San.</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
                {lotesEmAndamento.map((lote) => (
                    <tr key={lote.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                        <td className="px-6 py-4">
                            <p className="text-sm font-bold text-brand-primary">{lote.producer || 'Sem Nome'}</p>
                            <p className="text-[10px] text-[var(--text-dim)] uppercase font-medium">{lote.farm || 'N/A'}{lote.batch ? ` • LOTE ${lote.batch}` : ''}</p>
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black">
                                {lote.ageDays} dias
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-xs font-bold text-[var(--text-main)] mb-0.5">{lote.phase}</p>
                            {lote.feed && <p className="text-[10px] text-[var(--text-muted)] font-mono">{lote.feed}</p>}
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-xs text-[var(--text-muted)] max-w-[200px] truncate" title={lote.meds}>
                                {lote.meds || '-'}
                            </p>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className={cn(
                                "inline-block px-3 py-1 rounded-full text-xs font-black font-mono",
                                lote.score >= 85 ? "bg-brand-success/10 text-brand-success" :
                                lote.score >= 70 ? "bg-brand-warning/10 text-brand-warning" : "bg-brand-danger/10 text-brand-danger"
                            )}>
                                {Math.round(lote.score)}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
