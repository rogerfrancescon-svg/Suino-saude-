/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, AirVent, Activity, Beaker, BarChart3, History, 
  Moon, Sun, Menu, X, CheckCircle, AlertCircle, TrendingUp, Layers, LayoutDashboard
} from 'lucide-react';
import { VisitData, Phase, Duration } from './types';
import { cn } from './lib/utils';
import { calculateVisitResults } from './lib/scoring';
import { exportToPDF, exportToExcel, exportToWhatsApp, generateCompiledReportPDFBlob } from './lib/exports';

// Import Screens
import RegistrationScreen from './components/RegistrationScreen';
import EnvironmentScreen from './components/EnvironmentScreen';
import AssessmentScreen from './components/AssessmentScreen';
import SummaryScreen from './components/SummaryScreen';
import HistoryScreen from './components/HistoryScreen';
import AnalysisScreen from './components/AnalysisScreen';
import OrganogramaScreen from './components/OrganogramaScreen';
import DashboardScreen from './components/DashboardScreen';
import PwaPrompt from './components/PwaPrompt';

import { getSeededVisits } from './lib/seed';

const INITIAL_VISIT: Partial<VisitData> = {
  date: new Date().toISOString().split('T')[0],
  counts: { cough: 0, sneeze: 0, e2: 0, e3: 0 },
  duration: 'Insignificante (< 24h)',
  phase: '',
  totalAnimals: 0,
  notes: ''
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState(() => {
    const saved = localStorage.getItem('suinosaude_screen');
    return saved ? parseInt(saved) : 0;
  });
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const normalizeVisit = (v: any): Partial<VisitData> => {
    const counts = v.counts || {};
    const normalized: any = {
      ...INITIAL_VISIT,
      ...v,
      counts: {
        cough: counts.cough ?? (counts.c1 !== undefined ? (counts.c1 + counts.c2 + counts.c3) / 3 : 0),
        sneeze: counts.sneeze ?? (counts.s1 !== undefined ? (counts.s1 + counts.s2 + counts.s3) / 3 : 0),
        e2: counts.e2 ?? 0,
        e3: counts.e3 ?? 0,
      }
    };
    
    // Recalculate results to ensure they match current logic
    normalized.results = calculateVisitResults(normalized);
    
    return normalized as Partial<VisitData>;
  };

  const handleNextTab = () => {
    if (activeScreen < 6) setActiveScreen(prev => prev + 1);
  };

  const handlePrevTab = () => {
    if (activeScreen > 1) setActiveScreen(prev => prev - 1);
  };

  const [currentVisit, setCurrentVisit] = useState<Partial<VisitData>>(() => {
    try {
      const saved = localStorage.getItem('suinosaude_draft');
      if (saved) return normalizeVisit(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to parse draft from localStorage', e);
    }
    return INITIAL_VISIT;
  });
  const [history, setHistory] = useState<VisitData[]>(() => {
    let parsedHistory: any[] = [];
    try {
      const saved = localStorage.getItem('suinosaude_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsedHistory = parsed.map(normalizeVisit);
        }
      }
    } catch (e) {
      console.warn('Failed to parse history from localStorage', e);
    }
    
    // Cleanup old mock seeds if they exist
    const hasOldSeeds = parsedHistory.some((h: any) => 
      (h.producer === 'Pastre' && h.farm === 'Luiz Forquezato') ||
      (h.producer === 'Eládio') ||
      (h.producer === 'Pastre' && h.farm === 'Jarnei tonielli') ||
      (h.producer === 'Pastre' && h.farm === 'Laudir galante') ||
      (h.producer === 'Pastre' && h.farm === 'Tanamara kif') ||
      (h.producer === 'Pastre' && h.farm === 'Jones gemi') ||
      (h.producer === 'Pastre' && h.farm === 'Delcio renoso') ||
      (h.producer === 'Pastre' && h.farm === 'Roni Zanella') ||
      (h.producer === 'Pastre' && h.farm === 'Valdecir forchesato') ||
      (h.producer === 'Pastre' && h.farm === 'Jose trojan')
    );
    
    if (hasOldSeeds) {
      parsedHistory = parsedHistory.filter((h: any) => h.id < 1716940800000 || h.id > 1716940800017);
    }

    // Auto-seed data if not present (expecting 18 seeded records)
    const seededCount = parsedHistory.filter((h: any) => h.id >= 1716940800000 && h.id <= 1716940800017).length;
    if (seededCount < 18) {
      // Remove any previously seeded data and insert the complete dataset
      parsedHistory = [
        ...parsedHistory.filter((h: any) => h.id < 1716940800000 || h.id > 1716940800017), 
        ...getSeededVisits()
      ];
    }

    // Migrate correct housing dates for Pastre
    const housingDateFixes: Record<string, string> = {
      "Luiz Forchezatto": "2026-04-07",
      "Jarlei Toniello": "2026-02-10",
      "Eladio Cumerlato": "2026-03-11",
      "Laudir Galante": "2026-04-14",
      "Violar Ferrari": "2026-03-30",
      "Tanamara Kirst": "2026-05-04",
      "Jones Gemi": "2026-04-07",
      "Wanderlei Richit": "2026-03-23",
      "Delcio Renosto": "2026-03-27",
      "Delcio Renostro": "2026-03-27",
      "Roni José Zanela": "2026-05-05",
      "Gilmar Miglioretto": "2026-05-28",
      "Altivo Dani": "2026-04-21",
      "Valdecir Forchezato": "2026-03-02",
      "Valdecir Forchezatto": "2026-03-02",
      "José Trojan": "2026-05-11",
      "Jose Trojan": "2026-05-11",
      "Jose trojan": "2026-05-11",
      "José Trojan Neto": "2026-05-11",
      "Gilar Zanella": "2026-05-05"
    };

    parsedHistory = parsedHistory.map((h: any) => {
      let isChanged = false;
      if (h.producer === 'Pastre' && h.farm) {
        let mappedDate = housingDateFixes[h.farm];
        if (!mappedDate) {
          const match = Object.entries(housingDateFixes).find(([k]) => k.toLowerCase() === h.farm.toLowerCase());
          if (match) mappedDate = match[1];
        }
        if (mappedDate && h.housingDate !== mappedDate) {
          h.housingDate = mappedDate;
          isChanged = true;
        }
      }
      if (isChanged) {
        h.results = calculateVisitResults(h);
      }
      return h;
    });

    return parsedHistory;
  });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('suinosaude_draft', JSON.stringify(currentVisit));
    } catch (e) {
      console.error('Failed to save draft to localStorage', e);
      if (toast?.msg !== 'Erro de armazenamento cheio!') {
         showToast('Erro de armazenamento cheio!', 'error');
      }
    }
  }, [currentVisit]);

  useEffect(() => {
    try {
      localStorage.setItem('suinosaude_history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
      if (toast?.msg !== 'Erro ao salvar histórico! Fotos grandes demais.') {
         showToast('Erro ao salvar histórico! Fotos grandes demais.', 'error');
      }
    }
  }, [history]);

  useEffect(() => {
    localStorage.setItem('suinosaude_screen', activeScreen.toString());
  }, [activeScreen]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  // Handlers
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prompt if a visit is in progress (some data exists)
      if (currentVisit.producer || currentVisit.totalAnimals || currentVisit.date) {
        e.preventDefault();
        e.returnValue = ''; // Standard behavior for modern browsers to show the native prompt
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentVisit]);

  const handleUpdateField = (field: keyof VisitData, value: any) => {
    setCurrentVisit(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateCount = (key: keyof VisitData['counts'], delta: number) => {
    setCurrentVisit(prev => ({
      ...prev,
      counts: {
        ...prev.counts!,
        [key]: Math.max(0, (prev.counts?.[key] || 0) + delta)
      }
    }));
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveVisit = () => {
    if (!currentVisit.totalAnimals) return showToast('Preencha os dados básicos.', 'error');
    
    const results = calculateVisitResults(currentVisit);
    const isEdit = currentVisit.id !== undefined && currentVisit.id !== 0;
    
    const visitToSave: VisitData = {
      ...(currentVisit as VisitData),
      id: isEdit ? currentVisit.id! : Date.now(),
      results
    };

    if (isEdit) {
      setHistory(prev => prev.map(h => h.id === visitToSave.id ? visitToSave : h));
      showToast('Relatório atualizado com sucesso!');
    } else {
      setHistory(prev => [...prev, visitToSave]);
      showToast('Visita salva com sucesso!');
    }
    
    setCurrentVisit(INITIAL_VISIT);
    setActiveScreen(5); // Adjusted to skip merged step
  };

  const clearDraft = () => {
    setCurrentVisit(INITIAL_VISIT);
    setActiveScreen(1);
    showToast('Dados limpos.');
  };

  const deleteHistory = (ids: number[]) => {
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));
    showToast('Registros removidos.');
  };

  const results = calculateVisitResults(currentVisit);

  const navItems = [
    { id: 0, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 1, label: 'Cadastro', icon: <ClipboardList size={18} /> },
    { id: 2, label: 'Ambiente', icon: <AirVent size={18} /> },
    { id: 3, label: 'Clínica', icon: <Activity size={18} />, hasAlert: results.cFreq >= 10 || results.sFreq >= 15 || results.liqFreq > 15 },
    { id: 4, label: 'Resumo', icon: <CheckCircle size={18} /> },
    { id: 5, label: 'Análise', icon: <TrendingUp size={18} /> },
    { id: 6, label: 'Histórico', icon: <History size={18} /> },
  ];

  const handleEditVisit = (visit: VisitData) => {
    setCurrentVisit(normalizeVisit(visit));
    setActiveScreen(1);
    showToast('Relatório carregado para edição!', 'success');
  };

  const [viewingVisit, setViewingVisit] = useState<VisitData | null>(null);
  const [returnScreen, setReturnScreen] = useState(5);

  const handleViewVisitDetails = (visit: VisitData, fromScreen: number = 5) => {
    setViewingVisit(normalizeVisit(visit));
    setReturnScreen(fromScreen);
    setActiveScreen(7); 
  };

  const updateRawCount = (key: keyof VisitData['counts'], value: number) => {
    setCurrentVisit(prev => ({
      ...prev,
      counts: {
        ...prev.counts!,
        [key]: Math.max(0, value)
      }
    }));
  };

  return (
    <div className="flex min-h-screen font-sans selection:bg-brand-primary/30">
      {/* Sidebar Mobile Toggle */}
      <button 
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 right-4 z-[60] p-2 bg-[var(--surface)] border border-[var(--border)] rounded-full md:hidden shadow-lg"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-[var(--surface)] border-r border-[var(--border)] transition-transform duration-300 md:translate-x-0 md:static truncate shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🛡️</span>
              <h1 className="text-lg font-bold text-slate-100 leading-none">Suino Saúde</h1>
            </div>
            <p className="text-[10px] text-brand-success-light uppercase tracking-wider font-bold">Inteligência Sanitária</p>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveScreen(item.id); setSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md transition-all font-medium text-sm border-l-2",
                  activeScreen === item.id 
                    ? "bg-[var(--surface-active)] text-slate-100 border-brand-success" 
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] border-transparent hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    activeScreen === item.id ? "bg-brand-primary text-white" : "bg-[var(--surface-hover)] text-[var(--text-dim)]"
                  )}>
                    {item.id}
                  </span>
                  {item.label}
                </div>
                {item.hasAlert && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-danger animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-5 border-t border-[var(--border)] pt-4 mt-auto">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-3 px-3 py-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--accent-primary)] transition-colors bg-[var(--surface-hover)] rounded-md"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              Alternar Tema
            </button>
            <p className="text-[10px] text-[var(--text-dim)] leading-relaxed">
              Modo Offline Ativo ✓<br/>
              <span className="font-semibold text-[var(--text-muted)]">v2.4.0-stable</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 bg-[var(--bg)] flex flex-col overflow-hidden">


        <div className={cn("flex-1 overflow-y-auto", activeScreen === 0 ? "" : "p-4 md:p-8")}>
          <div className={cn("mx-auto space-y-6", activeScreen === 0 ? "w-full" : "max-w-4xl")}>
            {/* Screen Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
              transition={{ duration: 0.2 }}
              className="touch-pan-y"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -60 || velocity.x < -300) {
                  handleNextTab();
                } else if (offset.x > 60 || velocity.x > 300) {
                  handlePrevTab();
                }
              }}
            >
              {activeScreen === 0 && (
                <DashboardScreen 
                  history={history} 
                  onViewProducer={(visit) => handleViewVisitDetails(visit, 0)} 
                  onViewAllAlerts={() => setActiveScreen(6)}
                  onViewFullAnalysis={() => setActiveScreen(5)}
                />
              )}
              {activeScreen === 1 && (
                <RegistrationScreen 
                  data={currentVisit} 
                  onChange={handleUpdateField} 
                  onNext={() => setActiveScreen(2)} 
                />
              )}
              {activeScreen === 2 && (
                <EnvironmentScreen 
                  data={currentVisit} 
                  onChange={handleUpdateField} 
                  onPrev={() => setActiveScreen(1)}
                  onNext={() => setActiveScreen(3)} 
                />
              )}
              {activeScreen === 3 && (
                <AssessmentScreen 
                  data={currentVisit} 
                  results={results}
                  onUpdateCount={handleUpdateCount}
                  onRawUpdate={updateRawCount}
                  onChange={handleUpdateField}
                  onPrev={() => setActiveScreen(2)}
                  onNext={() => setActiveScreen(4)} 
                />
              )}
              {activeScreen === 4 && (
                <SummaryScreen 
                  data={currentVisit} 
                  results={results}
                  history={history}
                  onPrev={() => setActiveScreen(3)}
                  onSave={saveVisit}
                  onClear={clearDraft}
                />
              )}
              {activeScreen === 5 && (
                <AnalysisScreen history={history} onViewDetails={handleViewVisitDetails} />
              )}
              {activeScreen === 8 && (
                <OrganogramaScreen history={history} />
              )}
              {activeScreen === 6 && (
                <HistoryScreen 
                  history={history}
                  setHistory={setHistory}
                  onDeleteSelected={deleteHistory}
                  onExportPDF={exportToPDF}
                  onExportExcel={exportToExcel}
                  onExportWhatsApp={exportToWhatsApp}
                  onExportCompiledPDF={generateCompiledReportPDFBlob}
                  onEdit={handleEditVisit}
                />
              )}
              {activeScreen === 7 && viewingVisit && (
                <SummaryScreen 
                  data={viewingVisit} 
                  results={calculateVisitResults(viewingVisit)}
                  history={history}
                  onPrev={() => setActiveScreen(returnScreen)} // Back to caller screen
                  onSave={() => {}}
                  onClear={() => {}}
                  isReadOnly={true}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <footer className="text-center py-10 opacity-30">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]">S u i n o   S a ú d e • v 1 . 0</div>
          </footer>
        </div>
      </div>
    </main>

    {/* Toast */}
    {toast && (
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md",
          toast.type === 'success' ? "bg-brand-success/10 border-brand-success/40 text-brand-success-light" : "bg-brand-danger/10 border-brand-danger/40 text-brand-danger"
        )}
      >
        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        <span className="text-sm font-bold">{toast.msg}</span>
      </motion.div>
    )}

    {/* PWA Install Prompt */}
    <PwaPrompt />
  </div>
);
}
