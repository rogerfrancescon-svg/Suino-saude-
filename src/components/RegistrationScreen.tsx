import React from 'react';
import { VisitData, Phase, Duration } from '../types';
import { cn } from '../lib/utils';

interface Props {
  data: Partial<VisitData>;
  onChange: (field: keyof VisitData, value: any) => void;
  onNext: () => void;
}

const PRODUTORES_PASTRE = [
  "Aquiles Mantovani", "Roni José Zanela", "Alessandro Barbosa", "Solange João Rosa",
  "Idenilson Bedin", "Sérgio Bertotti", "Deonir Pastre", "Altivo Dani",
  "Nildo Piva", "Tanamara Kirst", "Tacilio Cadore", "Ademir Bassani",
  "Dirley Fornari", "Gilson Girotto", "Jacir Fornari", "John Heleno",
  "José Trojan", "Roberto Giachini", "Juliano Model", "Darlan Silva",
  "Claucio Bianchi", "Leocir Cadore", "Marildo Hecsel", "Neusa Magrini",
  "Ademar Ferrari", "Angelo Belaver", "Leonir Pretto", "Darci José Horn",
  "Gilmar Miglioretto", "Luiz Freisleben", "Ricardo Sordi", "Valdir Rupental",
  "Jarlei Toniello", "Salete Masson", "Neudi Paravisi", "Carmelindo Gavazzoni",
  "Eloi Mantei", "Avelino Casagrande", "Maximino Meneguetti", "Jacir Valcarengue",
  "Douglas Torin", "Edinei Signor", "Fernando Paravise", "Clodoaldo Zuchi",
  "Valdecir Forchezato", "Dalcir Jachini", "Nelson D'avila", "Marquit Castanho",
  "Marcelo Signor", "Jorge Berno", "Severino Giacomin", "Eladio Cumerlato",
  "Erico Oliveira", "Ademir Pegoraro", "Rose Franceschina", "Edson Cervelin",
  "Wanderlei Richit", "Jandir Favareto", "Angelo Cadorin", "Elio Turmina",
  "Delcio Renosto", "Arildo Valcarenghi", "Violar Ferrari", "Carlos Cassiano",
  "Jones Gemi", "Luiz Forchezatto", "Laudir Galante", "Norberto Muller",
  "Jormelio Pigosso", "Jairson Masson", "Idalir Cadore", "Delcio Detofeno"
];

export default function RegistrationScreen({ data, onChange, onNext }: Props) {
  const phases: Phase[] = [
    'Creche (leitões desmamados)',
    'Terminação',
    'Reprodução (matriz/cachaço)'
  ];

  const handleNumericChange = (field: keyof VisitData, val: string) => {
    const num = parseInt(val) || 0;
    onChange(field, num);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--border)] pb-5">
        <span className="inline-block px-3 py-1 text-[10px] font-bold tracking-widest text-brand-primary-light bg-brand-primary/10 rounded-full uppercase mb-2">
          Tela 1 de 6
        </span>
        <h2 className="text-2xl font-bold">Cadastro da Visita</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Identifique o lote e o cliente antes de iniciar a avaliação.
        </p>
      </div>

      <div className="card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-primary rounded-full" />
          Identificação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Cliente" required>
            <input 
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.producer || ''}
              onChange={e => onChange('producer', e.target.value)}
              placeholder="Ex: João Silva"
            />
          </Field>
          <Field label="Produtor" required>
            <input 
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.farm || ''}
              onChange={e => onChange('farm', e.target.value)}
              placeholder="Ex: Produtor A"
              list="produtores-list"
            />
            <datalist id="produtores-list">
              {PRODUTORES_PASTRE.map(p => <option key={p} value={p} />)}
            </datalist>
          </Field>
          <Field label="Lote (Opcional)">
            <input 
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.batch || ''}
              onChange={e => onChange('batch', e.target.value)}
              placeholder="Ex: 001/2026"
            />
          </Field>
          <Field label="Data da Visita" required>
            <input 
              type="date"
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.date || ''}
              onChange={e => onChange('date', e.target.value)}
            />
          </Field>
          <Field label="Data de Alojamento" required>
            <div className="flex gap-2">
              <input 
                type="date"
                className="field-input flex-1 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                value={data.housingDate || ''}
                onChange={e => onChange('housingDate', e.target.value)}
              />
              {(data.housingDate && data.date) && (
                <div className="flex items-center justify-center px-4 bg-brand-primary/10 text-brand-primary font-bold text-sm rounded-lg border border-brand-primary/20 whitespace-nowrap" title="Idade do lote em dias">
                  {Math.max(0, Math.floor((new Date(data.date).getTime() - new Date(data.housingDate).getTime()) / (1000 * 60 * 60 * 24)))} dias
                </div>
              )}
            </div>
          </Field>
          <Field label="Fase de Criação" required>
            <select 
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.phase || ''}
              onChange={e => onChange('phase', e.target.value)}
            >
              <option value="">— Selecione —</option>
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-primary rounded-full" />
          Detalhes de Manejo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tipo de Ração">
            {data.phase === 'Terminação' ? (
              <select
                className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                value={data.feed || ''}
                onChange={e => {
                  const val = e.target.value;
                  onChange('feed', val);
                  let meds = '';
                  switch (val) {
                    case 'Alojamento': meds = 'Amoxicilina 50% + Colistina 50%'; break;
                    case 'Crescimento 1': meds = 'Enramicina 8%'; break;
                    case 'Crescimento 2': meds = 'Florfenicol 30% + Lincomicina 44%'; break;
                    case 'Crescimento 3': meds = 'Enramicina 8%'; break;
                    case 'Terminação 1': meds = 'Doxiciclina 50% + Tiamulina 80%'; break;
                    case 'Terminação 2': meds = 'Enramicina 8%'; break;
                  }
                  if (meds) onChange('meds', meds);
                }}
              >
                <option value="">— Selecione —</option>
                <option value="Alojamento">Alojamento</option>
                <option value="Crescimento 1">Crescimento 1</option>
                <option value="Crescimento 2">Crescimento 2</option>
                <option value="Crescimento 3">Crescimento 3</option>
                <option value="Terminação 1">Terminação 1</option>
                <option value="Terminação 2">Terminação 2</option>
              </select>
            ) : (
              <input 
                className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                value={data.feed || ''}
                onChange={e => onChange('feed', e.target.value)}
                placeholder="Ex: Ração inicial"
              />
            )}
          </Field>
          <Field label="Protocolo Medicamentoso">
            <input 
              className="field-input w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.meds || ''}
              onChange={e => onChange('meds', e.target.value)}
              placeholder="Ex: Antibiótico X"
            />
          </Field>
        </div>
      </div>

      <div className="card rounded-xl p-5 border-brand-primary/30 bg-brand-primary/5 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary-light flex items-center gap-2">
          <div className="w-1 h-3.5 bg-brand-primary rounded-full" />
          Tamanho do Lote e Mortalidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nº Total de Animais no Lote" required>
            <input 
              type="number"
              className="field-input w-full rounded-lg px-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.totalAnimals || ''}
              onChange={e => handleNumericChange('totalAnimals', e.target.value)}
              placeholder="Ex: 120"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Dado vital: Usado como base para cálculos.
            </p>
          </Field>

          <Field label="Mortalidade até a Data (Nº de Animais)" required>
            <input 
              type="number"
              className="field-input w-full rounded-lg px-3 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-brand-primary/20"
              value={data.mortality || ''}
              onChange={e => handleNumericChange('mortality', e.target.value)}
              placeholder="Ex: 5"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Usado para cálculo em relação à meta da fase.
            </p>
          </Field>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={onNext}
          disabled={!data.producer || !data.farm || !data.phase || !data.totalAnimals || !data.housingDate || !data.date}
          className="w-full md:w-auto px-10 py-3 bg-brand-primary hover:bg-brand-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-bold rounded-lg"
        >
          Próximo: Ambiência →
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string, required?: boolean, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-tight text-[var(--text-muted)]">
        {label} {required && <span className="text-brand-danger">*</span>}
      </label>
      {children}
    </div>
  );
}
