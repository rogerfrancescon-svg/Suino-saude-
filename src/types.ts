export type Phase = 'Creche (leitões desmamados)' | 'Terminação' | 'Reprodução (matriz/cachaço)' | '';

export type Duration = 'Insignificante (< 24h)' | 'Curta (1–5 dias)' | 'Longa (> 5 dias)';

export interface VisitData {
  id: number;
  producer: string;
  farm: string;
  batch?: string;
  date: string;
  phase: Phase;
  feed: string;
  meds: string;
  housingDate: string;
  mortality: number;
  totalAnimals: number;
  temp: string;
  humidity: string;
  co2: string;
  duration: Duration;
  counts: {
    cough: number;
    sneeze: number;
    e2: number;
    e3: number;
  };
  results: {
    cFreq: number;
    sFreq: number;
    liqFreq: number;
    e1p: number;
    e2p: number;
    e3p: number;
    e1: number;
    score: number;
    scoreStatus: 'Excelente' | 'Atenção' | 'Crítico';
    mortalityRate: number;
    projectedMortalityRate: number;
    mortalityMeta: number;
    scoreBreakdown: {
      coughDeduction: number;
      coughDesc: string;
      sneezeDeduction: number;
      sneezeDesc: string;
      historicDeduction: number;
      historicDesc: string;
      entericDeduction: number;
      entericDesc: string;
      mortalityDeduction: number;
      mortalityDesc: string;
      environmentDeduction: number;
      environmentDesc: string;
    };
  };
  notes?: string;
  images?: string[];
}

export interface AppState {
  currentVisit: Partial<VisitData>;
  history: VisitData[];
  activeScreen: number;
  theme: 'dark' | 'light';
}
