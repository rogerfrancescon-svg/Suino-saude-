import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VisitData } from '../types';
import { Minus, Plus, AlertCircle, CheckCircle, FileText, Play, Square, RotateCcw, ImagePlus, X } from 'lucide-react';
import { cn } from '../lib/utils';

// Timer component
function CoughTimer() {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(600);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex items-center gap-3 bg-[var(--surface-hover)] p-2 rounded-xl mb-4 border border-[var(--border)] w-fit mx-auto md:mx-0">
      <div className="text-xl font-mono font-bold text-[var(--accent-primary)] w-20 text-center">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <button 
        onClick={toggleTimer}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors border",
          isActive ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" : "bg-brand-success/10 text-[var(--accent-success)] border-brand-success/20"
        )}
      >
        {isActive ? <Square size={14} /> : <Play size={14} />}
      </button>
      <button 
        onClick={resetTimer}
        className="w-8 h-8 flex items-center justify-center bg-[var(--bg)] text-[var(--text-muted)] rounded-lg transition-colors border border-[var(--border)] hover:text-[var(--text-main)]"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

interface Props {
  data: Partial<VisitData>;
  results: any;
  onUpdateCount: (key: keyof VisitData['counts'], delta: number) => void;
  onRawUpdate: (key: keyof VisitData['counts'], value: number) => void;
  onChange: (field: keyof VisitData, value: any) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function AssessmentScreen({ data, results, onUpdateCount, onRawUpdate, onChange, onPrev, onNext }: Props) {
  const counts = data.counts || { cough: 0, sneeze: 0, e2: 0, e3: 0 };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] bg-[var(--bg)]/50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-2 h-5 bg-brand-primary rounded-full" />
            Avaliação Clínica Consolidada
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Registre tosses, espirros e escores fecais em uma única tela.</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Section: Respiratory */}
          <div>
            <div className="mb-4">
              <CoughTimer />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2 pt-4">
                🫁 Sistema Respiratório
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CounterField 
                label="Tosses" 
                value={counts.cough} 
                onChange={(v) => onRawUpdate('cough', v)}
                onDelta={(d) => onUpdateCount('cough', d)}
                freq={results.cFreq}
                threshold={10}
              />
              <CounterField 
                label="Espirros" 
                value={counts.sneeze} 
                onChange={(v) => onRawUpdate('sneeze', v)}
                onDelta={(d) => onUpdateCount('sneeze', d)}
                freq={results.sFreq}
                threshold={15}
              />
            </div>
            
            {(results.cFreq >= 10 || results.sFreq >= 15) && (
              <div className="mt-4 p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-xl">
                <p className="text-xs font-bold text-brand-danger flex items-center gap-2">
                  <AlertCircle size={14} /> Atenção Respiratória
                </p>
                <p className="text-[11px] text-brand-danger/80 mt-1">
                  {results.cFreq >= 10 && "• Alta frequência de tosses detectada. Considere investigar patógenos pulmonares. "}
                  {results.sFreq >= 15 && "• Frequência de espirros elevada. Verifique ventilação e ambiência."}
                </p>
              </div>
            )}
          </div>

          {/* Section: Enteric */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center gap-2">
              💩 Sistema Entérico
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CounterField 
                label="Pastosas (E2)" 
                value={counts.e2} 
                onChange={(v) => onRawUpdate('e2', v)}
                onDelta={(d) => onUpdateCount('e2', d)}
                freq={results.e2p}
                isPercentageOfFeces
              />
              <CounterField 
                label="Líquidas (E3)" 
                value={counts.e3} 
                onChange={(v) => onRawUpdate('e3', v)}
                onDelta={(d) => onUpdateCount('e3', d)}
                freq={results.liqFreq}
                threshold={15}
              />
            </div>

            {results.liqFreq > 15 && (
              <div className="mt-4 p-4 bg-brand-danger/10 border border-brand-danger/20 rounded-xl">
                <p className="text-xs font-bold text-brand-danger flex items-center gap-2">
                  <AlertCircle size={14} /> Alerta Entérico Crítico
                </p>
                <p className="text-[11px] text-brand-danger/80 mt-1">
                  Incidência de diarreia líquida (E3) acima de 15%. Revisar protocolos sanitários imediatamente.
                </p>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-[var(--surface-hover)] rounded-xl flex items-center justify-between border border-[var(--border)]">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Fezes Normais (E1)</p>
                <p className="text-sm font-semibold text-[var(--accent-success)]">Calculadas automaticamente</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold">{results.e1}</p>
                <p className="text-[10px] text-[var(--text-dim)]">{results.e1p.toFixed(1)}% do lote</p>
              </div>
            </div>
          </div>

          {/* Section: Observations */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3 flex items-center gap-2">
              <FileText size={14} className="text-brand-primary" /> Observações da Visita
            </h3>
            <textarea
              value={data.notes || ''}
              onChange={(e) => onChange('notes', e.target.value)}
              placeholder="Digite aqui notas relevantes, suspeitas clínicas ou observações gerais sobre a visita..."
              className="w-full min-h-[120px] p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm resize-y"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onPrev} className="flex-1 py-4 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--surface-hover)] transition-all">
          ⬅ Voltar
        </button>
        <button onClick={onNext} className="flex-[2] py-4 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-primary-light shadow-xl shadow-brand-primary/20 transition-all">
          Próximo Passo ➡
        </button>
      </div>
    </div>
  );
}

interface CounterProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  onDelta: (delta: number) => void;
  freq: number;
  threshold?: number;
  isPercentageOfFeces?: boolean;
}

function CounterField({ label, value, onChange, onDelta, freq, threshold, isPercentageOfFeces }: CounterProps) {
  const isAlert = threshold ? freq >= threshold : false;

  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all",
      isAlert ? "bg-brand-danger/5 border-brand-danger/20" : "bg-[var(--bg)] border-[var(--border)]"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs font-bold",
              isAlert ? "text-brand-danger" : "text-[var(--accent-primary)]"
            )}>
              {freq.toFixed(1)}%
            </span>
            {threshold && (
              <span className="text-[9px] text-[var(--text-dim)]">
                (Limiar: {threshold}%)
              </span>
            )}
          </div>
        </div>
        {isAlert ? <AlertCircle size={16} className="text-brand-danger" /> : <CheckCircle size={16} className="text-[var(--accent-success)]" />}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button 
          onClick={() => onDelta(-1)}
          className="w-14 h-14 shrink-0 flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text-main)] active:scale-95 transition-transform shadow-sm"
        >
          <Minus size={24} />
        </button>
        
        <input 
          type="number" 
          value={value ?? 0} 
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-20 bg-transparent text-center text-2xl font-mono font-bold focus:outline-none border-b-2 border-dashed border-[var(--border)] focus:border-brand-primary transition-colors"
        />
        
        <button 
          onClick={() => onDelta(1)}
          className="w-14 h-14 shrink-0 flex items-center justify-center bg-brand-primary text-white rounded-full active:scale-95 transition-transform shadow-lg shadow-brand-primary/20"
        >
          <Plus size={24} />
        </button>
      </div>

    </div>
  );
}
