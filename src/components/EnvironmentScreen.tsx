import React from 'react';
import { VisitData } from '../types';

interface Props {
  data: Partial<VisitData>;
  onChange: (field: keyof VisitData, value: any) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function EnvironmentScreen({ data, onChange, onPrev, onNext }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-5">
        <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest text-brand-primary-light bg-brand-primary/10 rounded-full uppercase mb-2">
          Tela 2 de 6 — Qualidade do Ar
        </span>
        <h2 className="text-2xl font-bold">Ambiência e Clima</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Informe as condições ambientais no momento da visita.
        </p>
      </div>

      <div className="card rounded-xl p-5 border-l-4 border-l-brand-warn space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          🌡️ Parâmetros do Galpão
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Temperatura (°C)">
            <input 
              type="number"
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.temp || ''}
              onChange={e => onChange('temp', e.target.value)}
              placeholder="Ex: 24"
            />
          </Field>
          <Field label="Umidade Relativa (%)">
            <input 
              type="number"
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.humidity || ''}
              onChange={e => onChange('humidity', e.target.value)}
              placeholder="Ex: 65"
            />
          </Field>
          <Field label="Nível de CO2 (ppm)">
            <input 
              type="number"
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.co2 || ''}
              onChange={e => onChange('co2', e.target.value)}
              placeholder="Ex: 1500"
            />
          </Field>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button 
          onClick={onPrev}
          className="px-6 py-3 bg-[var(--surface-hover)] hover:bg-[var(--border)] transition-colors font-bold rounded-lg border border-[var(--border)]"
        >
          ← Voltar
        </button>
        <button 
          onClick={onNext}
          className="flex-1 md:flex-none px-10 py-3 bg-brand-primary hover:bg-brand-primary-light transition-colors text-white font-bold rounded-lg shadow-lg shadow-brand-primary/20"
        >
          🚀 Iniciar Avaliação Clínica →
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-tight text-[var(--text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
