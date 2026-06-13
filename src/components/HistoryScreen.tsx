import React, { useState, useEffect } from 'react';
import { VisitData } from '../types';
import { FileText, Table as TableIcon, MessageSquare, Trash2, RotateCcw, CheckSquare, Square, CloudUpload, LogIn, LogOut } from 'lucide-react';
import { cn, formatDateBR } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signInWithGoogle, logout, syncHistoryToCloud, getHistoryFromCloud } from '../lib/sync';
import { onAuthStateChanged } from 'firebase/auth';

interface Props {
  history: VisitData[];
  setHistory: React.Dispatch<React.SetStateAction<VisitData[]>>;
  onDeleteSelected: (ids: number[]) => void;
  onExportPDF: (records: VisitData[]) => void;
  onExportExcel: (records: VisitData[]) => void;
  onExportWhatsApp: (records: VisitData[]) => void;
  onEdit: (visit: VisitData) => void;
}

export default function HistoryScreen({ history, setHistory, onDeleteSelected, onExportPDF, onExportExcel, onExportWhatsApp, onEdit }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(history.map(h => h.id));
  const clearSelection = () => setSelectedIds([]);

  const getTargetRecords = () => {
    if (selectedIds.length === 0) return history;
    return history.filter(h => selectedIds.includes(h.id));
  };

  const handleSync = async () => {
    if (!user) return;
    try {
      setIsSyncing(true);
      // Upload local history
      await syncHistoryToCloud(history);
      // Fetch combined history
      const cloudHistory = await getHistoryFromCloud();
      
      // Merge unique based on ID
      const merged = [...history, ...cloudHistory].reduce((acc, curr) => {
        if (!acc.find(v => v.id === curr.id)) {
          acc.push(curr);
        } else {
          // If collision, prefer cloud or newer? Prefer cloud.
          const idx = acc.findIndex(v => v.id === curr.id);
          acc[idx] = curr;
        }
        return acc;
      }, [] as VisitData[]);
      
      setHistory(merged);
      alert('Sincronização concluída com sucesso!');
    } catch (e: any) {
      console.error(e);
      alert('Erro na sincronização: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const sortedHistory = [...history].sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime());

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-5">
        <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest text-brand-primary-light bg-brand-primary/10 rounded-full uppercase mb-2">
          Histórico de Registros
        </span>
        <h2 className="text-2xl font-bold">Histórico de Visitas</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Gerencie e exporte os relatórios salvos localmente.
        </p>
      </div>

      <div className="card rounded-xl p-5 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          📤 Exportação em Lote
        </h3>
        
        <div className="bg-[var(--surface-hover)] p-4 rounded-xl border border-[var(--border)] space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-brand-primary-light bg-brand-primary/10 px-2 py-1 rounded">
              {selectedIds.length} selecionados
            </span>
            <div className="flex gap-2">
               <button onClick={selectAll} className="text-[10px] font-bold uppercase text-brand-primary-light hover:underline">Selecionar Tudo</button>
               <span className="text-[var(--border)]">|</span>
               <button onClick={clearSelection} className="text-[10px] font-bold uppercase text-[var(--text-muted)] hover:underline">Limpar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button 
              onClick={() => onExportPDF(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-lg transition-colors"
            >
              <FileText size={16} /> PDF
            </button>
            <button 
              onClick={() => onExportExcel(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 bg-brand-success hover:bg-brand-success-light text-white text-xs font-bold rounded-lg transition-colors"
            >
              <TableIcon size={16} /> Excel
            </button>
            <button 
              onClick={() => onExportWhatsApp(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)] text-xs font-bold rounded-lg transition-colors"
            >
              <MessageSquare size={16} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          ☁️ Nuvem ({user ? user.email : 'Desconectado'})
        </h3>
        {user ? (
          <div className="flex gap-3">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              <CloudUpload size={16} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Histórico'}
            </button>
            <button 
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--border)] text-xs font-bold rounded-lg transition-colors"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        ) : (
          <button 
            onClick={() => signInWithGoogle()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold rounded-lg transition-colors"
          >
            <LogIn size={16} /> Entrar com Google para Sincronizar
          </button>
        )}
      </div>

      <div className="flex justify-between items-center bg-[var(--surface)] p-2 rounded-lg">
        <div className="flex gap-2"></div>
        {isConfirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-danger">Tem certeza?</span>
            <button 
              onClick={() => {
                onDeleteSelected(selectedIds);
                setSelectedIds([]);
                setIsConfirmingDelete(false);
              }}
              className="px-3 py-1 bg-brand-danger text-white text-[10px] font-bold rounded uppercase hover:bg-red-600 transition-colors"
            >
              Sim, Apagar
            </button>
            <button 
              onClick={() => setIsConfirmingDelete(false)}
              className="px-3 py-1 bg-[var(--surface-hover)] text-[var(--text-main)] text-[10px] font-bold rounded uppercase border border-[var(--border)] hover:bg-[var(--border)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsConfirmingDelete(true)}
            disabled={selectedIds.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-brand-danger disabled:opacity-30 transition-colors"
          >
            <Trash2 size={14} /> Apagar Selecionados
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sortedHistory.length === 0 ? (
          <div className="text-center py-20 opacity-30 text-sm font-bold uppercase tracking-widest italic">
            Nenhuma visita registrada
          </div>
        ) : (
          sortedHistory.map(v => (
            <div 
              key={v.id} 
              className={cn(
                "card rounded-xl p-4 transition-all border-l-4 group",
                selectedIds.includes(v.id) ? "border-brand-primary bg-brand-primary/5" : "border-l-transparent"
              )}
            >
              <div className="flex gap-4">
                <button onClick={() => toggleSelection(v.id)} className="mt-1 text-[var(--text-dim)] hover:text-brand-primary transition-colors">
                  {selectedIds.includes(v.id) ? <CheckSquare className="text-brand-primary" size={20} /> : <Square size={20} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-brand-primary-light truncate">{v.producer} — {v.farm}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-[var(--text-muted)] font-medium">
                        <span className="flex items-center gap-1">📅 {formatDateBR(v.date)}</span>
                        {v.batch && <span className="flex items-center gap-1">📦 Lote {v.batch}</span>}
                        <span className="flex items-center gap-1">🐷 {v.totalAnimals} animais</span>
                        <span className="flex items-center gap-1">📉 Score {v.results.score}/100</span>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                      v.results.scoreStatus === 'Excelente' ? 'bg-brand-success/20 text-brand-success-light' : 
                      v.results.scoreStatus === 'Atenção' ? 'bg-brand-warn/20 text-brand-warn' : 
                      'bg-brand-danger/20 text-brand-danger'
                    )}>
                      {v.results.scoreStatus}
                    </span>
                  </div>

                  <div className="flex justify-end mt-2 pt-2 border-t border-[var(--border)] border-dashed">
                    <button 
                      onClick={() => onEdit(v)}
                      className="text-[10px] font-bold uppercase text-brand-primary-light hover:underline bg-brand-primary/5 px-2 py-1 rounded"
                    >
                      Editar Relatório
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 py-2 border-t border-[var(--border)] border-dashed">
                    <HistoryMiniStat label="🫁 Tosse" value={`${v.results.cFreq.toFixed(1)}%`} threshold={5} />
                    <HistoryMiniStat label="🤧 Espirro" value={`${v.results.sFreq.toFixed(1)}%`} threshold={10} />
                    <HistoryMiniStat label="💧 Diar." value={`${v.results.liqFreq.toFixed(1)}%`} threshold={5} />
                    <HistoryMiniStat label="☠️ Mort." value={`${v.results.mortalityRate.toFixed(1)}%`} threshold={v.results.mortalityMeta > 0 ? v.results.mortalityMeta : Infinity} />
                  </div>

                  {v.notes && (
                    <div className="mt-2 text-[10px] text-[var(--text-muted)] p-2 bg-[var(--surface-hover)] rounded border border-[var(--border)] line-clamp-2 italic">
                      “{v.notes}”
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryMiniStat({ label, value, threshold }: { label: string, value: string, threshold: number }) {
  const isAlert = parseFloat(value) >= threshold;
  return (
    <div className="flex flex-col">
       <span className="text-[9px] text-[var(--text-dim)] uppercase font-bold">{label}</span>
       <span className={cn("text-xs font-mono font-bold", isAlert ? "text-brand-danger" : "text-brand-success-light")}>
         {value}
       </span>
    </div>
  );
}
