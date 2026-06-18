import React, { useState, useEffect } from 'react';
import { VisitData } from '../types';
import { FileText, Table as TableIcon, MessageSquare, Trash2, CheckSquare, Square, Download, Upload, AlertCircle, CloudUpload, CloudDownload, LogOut, LogIn, ExternalLink, X, Copy } from 'lucide-react';
import { cn, formatDateBR, calculateHousingDays } from '../lib/utils';
import { exportBackupToExcel, importBackupFromExcel } from '../lib/exports';
import { googleSignIn, initAuth, logout, syncHistoryToSheets, fetchHistoryFromSheets, getOnlineSpreadsheetUrl } from '../lib/syncOAuth';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  history: VisitData[];
  setHistory: React.Dispatch<React.SetStateAction<VisitData[]>>;
  onDeleteSelected: (ids: number[]) => void;
  onExportPDF: (records: VisitData[]) => void;
  onExportExcel: (records: VisitData[]) => void;
  onExportWhatsApp: (records: VisitData[]) => void;
  onExportCompiledPDF: (records: VisitData[]) => Promise<string>;
  onEdit: (visit: VisitData) => void;
}

export default function HistoryScreen({ history, setHistory, onDeleteSelected, onExportPDF, onExportExcel, onExportWhatsApp, onExportCompiledPDF, onEdit }: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [isOnlineSyncing, setIsOnlineSyncing] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [compiledPreviewRecords, setCompiledPreviewRecords] = useState<VisitData[] | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const fetchUrl = async () => {
    try {
      const url = await getOnlineSpreadsheetUrl();
      setSheetUrl(url);
    } catch {
      setSheetUrl(null);
    }
  };

  useEffect(() => {
    const unsub = initAuth(
      (u) => { setNeedsAuth(false); setUser(u); fetchUrl(); },
      () => { setNeedsAuth(true); setUser(null); setSheetUrl(null); }
    );
    return () => unsub();
  }, []);

  const handleOnlineLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        fetchUrl();
      }
    } catch (e: any) {
      setImportError('Erro ao fazer login: ' + (e.message || String(e)));
    }
  };

  const handleOnlineSync = async () => {
    try {
      setIsOnlineSyncing(true);
      setImportError(null);
      // 1. fetch remote history
      const remoteHistory = await fetchHistoryFromSheets();
      
      // 2. merge with local
      const merged = [...history, ...remoteHistory].reduce((acc, curr) => {
        if (!acc.find(v => v.id === curr.id)) {
          acc.push(curr);
        } else {
          // preserve the latest one based on some heuristic, or just prefer remote
          const idx = acc.findIndex(v => v.id === curr.id);
          acc[idx] = curr;
        }
        return acc;
      }, [] as VisitData[]);

      setHistory(merged);

      // 3. sync the merged result back up
      await syncHistoryToSheets(merged);
      
      alert('Sincronização online concluída com sucesso!');
      fetchUrl();
    } catch (e: any) {
      console.error(e);
      setImportError('Erro de sincronização: ' + (e.message || String(e)));
    } finally {
      setIsOnlineSyncing(false);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedIds(history.map(h => h.id));
  const clearSelection = () => setSelectedIds([]);

  const getTargetRecords = () => {
    if (selectedIds.length === 0) return history;
    return history.filter(h => selectedIds.includes(h.id));
  };

  const handlePreviewCompiledReport = async () => {
    try {
      const records = getTargetRecords();
      if (records.length === 0) {
        alert("Selecione pelo menos um registro para gerar o relatório.");
        return;
      }
      setCompiledPreviewRecords(records);
    } catch (err) {
      console.error('Error generating preview:', err);
      alert('Erro ao gerar relatório: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const downloadCompiledReport = async () => {
    if (!compiledPreviewRecords) return;
    try {
      setIsExportingPDF(true);
      const url = await onExportCompiledPDF(compiledPreviewRecords);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relatorio_Descritivo_Compilado_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading pdf:', err);
      alert('Erro ao baixar PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const copyCompiledReportToClipboard = async () => {
    if (!compiledPreviewRecords) return;
    
    let textToCopy = 'SUINO SAÚDE - RELATÓRIO DESCRITIVO COMPILADO\n';
    textToCopy += `Data de Geração: ${new Date().toLocaleDateString('pt-BR')}\n\n`;

    compiledPreviewRecords.forEach((record, index) => {
      const scoreStatus = record.results?.scoreStatus || 'Desconhecido';
      const score = record.results?.score || 0;
      
      let ageStr = 'Não informada';
      if (record.housingDate && record.date) {
        const days = calculateHousingDays(record.housingDate, record.date);
        if (days !== '?') ageStr = `${days} dias`;
      }

      const observationText = record.notes && record.notes.trim() ? record.notes.trim() : "Nenhuma observação registrada para este lote.";

      textToCopy += `--- Lote ${index + 1} ---\n`;
      textToCopy += `Cliente: ${record.producer}\n`;
      textToCopy += `Produtor: ${record.farm}\n`;
      textToCopy += `Lote: ${record.batch || 'N/I'} | Data: ${formatDateBR(record.date)} | Fase: ${record.phase || 'N/I'}\n`;
      textToCopy += `Índice Sanitário: ${score}/100 (${scoreStatus})\n`;
      textToCopy += `Idade do Lote: ${ageStr}\n`;
      textToCopy += `Efetivo: ${record.totalAnimals} animais\n`;
      textToCopy += `Respiratório (Tosses/Espirros): ${record.results?.cFreq.toFixed(1)}% (Meta: 5%) / ${record.results?.sFreq.toFixed(1)}% (Meta: 10%)\n`;
      textToCopy += `Entérico (Diarreia Líquida): ${record.results?.liqFreq.toFixed(1)}% (Meta: 5%)\n`;
      textToCopy += `Mortalidade: ${record.results?.mortalityRate.toFixed(1)}% (Meta: ${record.results?.mortalityMeta.toFixed(1)}%)\n`;
      textToCopy += `Ambiência (Temp/Umid/CO2): ${record.temp ? record.temp + '°C' : 'N/I'} / ${record.humidity ? record.humidity + '%' : 'N/I'} / ${record.co2 ? record.co2 + 'ppm' : 'N/I'}\n`;
      textToCopy += `Ração Atual: ${record.feed || 'Não informada'}\n`;
      textToCopy += `Observações: ${observationText}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(textToCopy);
      alert('Informações copiadas para a área de transferência!');
    } catch (err) {
      console.error('Falha ao copiar:', err);
      alert('Falha ao tentar copiar o texto.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsImporting(true);
      setImportError(null);
      const importedHistory = await importBackupFromExcel(file);
      
      if (importedHistory.length === 0) {
        alert('Nenhum registro encontrado no arquivo de backup.');
        return;
      }

      // Merge unique based on ID
      const merged = [...history, ...importedHistory].reduce((acc, curr) => {
        if (!acc.find(v => v.id === curr.id)) {
          acc.push(curr);
        } else {
          const idx = acc.findIndex(v => v.id === curr.id);
          acc[idx] = curr;
        }
        return acc;
      }, [] as VisitData[]);

      setHistory(merged);
      alert(`Sincronização concluída com sucesso! ${importedHistory.length} registros sincronizados/carregados.`);
    } catch (err: any) {
      console.error('Failed to import backup:', err);
      setImportError('Falha ao importar planilha de backup: certifique-se de usar uma planilha gerada pelo aplicativo.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
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
          <div className="mb-4">
            <button 
              onClick={handlePreviewCompiledReport}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <FileText size={16} /> 
              Relatório Descritivo
            </button>
          </div>

          <div className="flex justify-between items-center bg-[var(--surface-color)] p-2 rounded-lg border border-[var(--border)]">
            <span className="text-xs font-bold text-brand-primary-light bg-brand-primary/10 px-3 py-1.5 rounded-md">
              {selectedIds.length} lotes selecionados
            </span>
            <div className="flex gap-2">
               <button onClick={selectAll} className="text-xs font-bold uppercase text-brand-primary-light hover:underline px-2">Todos</button>
               <span className="text-[var(--border)]">|</span>
               <button onClick={clearSelection} className="text-xs font-bold uppercase text-[var(--text-muted)] hover:underline px-2">Limpar</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button 
              onClick={() => onExportPDF(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <FileText size={16} /> Ficha Analítica (PDF)
            </button>
            <button 
              onClick={() => onExportExcel(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 bg-brand-success hover:bg-brand-success-light text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <TableIcon size={16} /> Exportar Excel
            </button>
            <button 
              onClick={() => onExportWhatsApp(getTargetRecords())}
              className="flex items-center justify-center gap-2 py-2.5 border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface-color)] bg-[var(--surface-input)] text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <MessageSquare size={16} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          ☁️ Backup Online (Planilha Google)
        </h3>
        
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Sincronize todo o seu histórico diretamente do aplicativo para o seu Google Drive. Um arquivo chamado <strong>SuinoSaude_Backup_Online</strong> será criado e gerenciado automaticamente pelo aplicativo.
        </p>

        {importError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-500 font-medium flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {needsAuth || !user ? (
          <button 
            onClick={handleOnlineLogin}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-bold rounded-lg transition-colors"
          >
            <LogIn size={16} /> Entrar com Google para Sincronizar
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
              <span className="text-xs font-medium text-[var(--text-main)]">Conectado como: <strong>{user.email}</strong></span>
              <button 
                onClick={() => logout()}
                className="text-[10px] font-bold text-brand-primary hover:underline"
              >
                Desconectar
              </button>
            </div>
            
            <button 
              onClick={handleOnlineSync}
              disabled={isOnlineSyncing}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold rounded-lg transition-colors cursor-pointer",
                isOnlineSyncing && "opacity-50 pointer-events-none"
              )}
            >
              <CloudUpload size={16} /> {isOnlineSyncing ? 'Sincronizando...' : 'Sincronizar com Planilha Online'}
            </button>
            {sheetUrl && (
              <a 
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 border border-brand-primary text-brand-primary hover:bg-brand-primary/10 text-xs font-bold rounded-lg transition-colors"
              >
                <ExternalLink size={16} /> Acessar Planilha
              </a>
            )}
          </div>
        )}
      </div>

      <div className="card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          📊 Sincronização por Planilha (Backup Offline)
        </h3>
        
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Exporte um backup completo com todos os parâmetros ou envie um arquivo (.xlsx) para mesclar e sincronizar os registros.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-muted)]">Salvar Estado Atual</span>
            <button 
              onClick={() => exportBackupToExcel(history)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--surface-hover)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download size={16} /> Baixar Arquivo .xlsx
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[var(--text-muted)]">Restaurar e Mesclar Backup</span>
            <label 
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-[var(--border)] hover:bg-[var(--surface-hover)] hover:border-brand-primary text-[var(--text-main)] text-xs font-bold rounded-lg transition-all cursor-pointer text-center",
                isImporting && "opacity-50 pointer-events-none"
              )}
            >
              <Upload size={16} /> 
              <span>{isImporting ? 'Enviando...' : 'Carregar Arquivo .xlsx'}</span>
              <input 
                type="file" 
                accept=".xlsx" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
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

      {/* Preview Modal */}
      <AnimatePresence>
        {compiledPreviewRecords && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--surface-color)] border border-[var(--border)] rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--surface-input)]">
                <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="text-indigo-500" />
                  Pré-visualização do Relatório ({compiledPreviewRecords.length} lotes)
                </h2>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={copyCompiledReportToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-hover)] border border-[var(--border)] hover:bg-[var(--border)] text-[var(--text-main)] text-sm font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <Copy size={16} /> Copiar Texto
                  </button>
                  <button 
                    onClick={downloadCompiledReport}
                    disabled={isExportingPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50"
                  >
                    <Download size={16} /> {isExportingPDF ? 'Gerando PDF...' : 'Baixar PDF'}
                  </button>
                  <button 
                    onClick={() => setCompiledPreviewRecords(null)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-color)] p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="text-center mb-8 border-b border-[var(--border)] pb-6">
                  <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">SUINO SAÚDE</h1>
                  <h2 className="text-lg font-semibold text-[var(--text-muted)] mt-1">RELATÓRIO DESCRITIVO COMPILADO</h2>
                  <p className="text-sm text-[var(--text-muted)] mt-2">Data de Geração: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {compiledPreviewRecords.map((record, index) => {
                  const scoreStatus = record.results?.scoreStatus || 'Desconhecido';
                  const score = record.results?.score || 0;
                  
                  let ageStr = 'Não informada';
                  if (record.housingDate && record.date) {
                    const days = calculateHousingDays(record.housingDate, record.date);
                    if (days !== '?') ageStr = `${days} dias`;
                  }

                  const observationText = record.notes && record.notes.trim() ? record.notes.trim() : "Nenhuma observação registrada para este lote.";

                  return (
                    <div key={record.id} className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl p-5 mb-4 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between mb-4 pb-4 border-b border-[var(--border)]">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                            Lote {index + 1}
                          </h3>
                          <p className="text-lg font-bold text-[var(--text-main)]">{record.producer} - {record.farm}</p>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            Lote: <span className="font-semibold text-slate-300">{record.batch || 'N/I'}</span> | 
                            Data: <span className="font-semibold text-slate-300">{formatDateBR(record.date)}</span> | 
                            Fase: <span className="font-semibold text-slate-300">{record.phase || 'N/I'}</span>
                          </p>
                        </div>
                        <div className="mt-3 md:mt-0 md:text-right flex flex-col md:items-end justify-center">
                           <span className={cn(
                             "px-3 py-1 text-xs font-bold uppercase rounded-full mb-2",
                             scoreStatus === 'Excelente' ? 'bg-green-500/20 text-green-400' :
                             scoreStatus === 'Atenção' ? 'bg-amber-500/20 text-amber-400' :
                             'bg-red-500/20 text-red-400'
                           )}>
                             {scoreStatus}
                           </span>
                           <span className="text-xl font-black text-[var(--text-main)]">{score}<span className="text-sm font-normal text-[var(--text-muted)]">/100</span></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Idade do Lote</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">{ageStr}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Efetivo</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">{record.totalAnimals} animais</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Mortalidade</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">
                            {record.results?.mortalityRate.toFixed(1)}% 
                            <span className="text-xs font-normal text-[var(--text-muted)] ml-1">
                              (Meta: {record.results?.mortalityMeta.toFixed(1)}%)
                            </span>
                          </p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Ração Atual</p>
                          <p className="text-sm font-semibold text-[var(--text-main)] truncate" title={record.feed || 'N/I'}>{record.feed || 'N/I'}</p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)] col-span-2 md:col-span-2">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Ambiência (T/U/CO2)</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">
                            {record.temp ? record.temp + '°C' : 'N/I'} / {record.humidity ? record.humidity + '%' : 'N/I'} / {record.co2 ? record.co2 + 'ppm' : 'N/I'}
                          </p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Tosses / Espirros</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">
                            {record.results?.cFreq.toFixed(1)}% <span className="text-xs font-normal text-[var(--text-muted)] ml-0.5">(Meta: 5%)</span> / {record.results?.sFreq.toFixed(1)}% <span className="text-xs font-normal text-[var(--text-muted)] ml-0.5">(Meta: 10%)</span>
                          </p>
                        </div>
                        <div className="bg-[var(--surface-color)] p-3 rounded-lg border border-[var(--border)]">
                          <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold mb-1">Diarreia Líquida</p>
                          <p className="text-sm font-semibold text-[var(--text-main)]">
                            {record.results?.liqFreq.toFixed(1)}% <span className="text-xs font-normal text-[var(--text-muted)] ml-1">(Meta: 5%)</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-input)] p-4 rounded-lg border border-[var(--border)]">
                        <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Observações / Notas do Lote</h4>
                        <p className="text-sm text-[var(--text-main)] leading-relaxed italic">
                          {observationText}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
