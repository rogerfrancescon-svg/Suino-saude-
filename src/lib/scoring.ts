import { VisitData } from '../types';
import { getIdealTempRange, calculateHousingDays } from './utils';

export function calculateVisitResults(data: Partial<VisitData>) {
  const T = data.totalAnimals || 0;
  const counts = data.counts || { cough: 0, sneeze: 0, e2: 0, e3: 0 };
  
  const cFreq = T > 0 ? (counts.cough / T) * 100 : 0;
  const sFreq = T > 0 ? (counts.sneeze / T) * 100 : 0;
  
  const e1 = Math.max(0, T - counts.e2 - counts.e3);
  const totalFeces = e1 + counts.e2 + counts.e3;
  
  const e1p = totalFeces > 0 ? (e1 / totalFeces) * 100 : 0;
  const e2p = totalFeces > 0 ? (counts.e2 / totalFeces) * 100 : 0;
  const e3p = totalFeces > 0 ? (counts.e3 / totalFeces) * 100 : 0;
  const liqFreq = T > 0 ? (counts.e3 / T) * 100 : 0;

  const mortality = data.mortality || 0;
  // Consider the denominator for rate: if "totalAnimals" means currently alive, initial = T + mortality.
  // Standard in poultry/swine is mortality / initial = mortality / (T + mortality) if T is current.
  // But let's assume T is initial if the user just inputs "Nº Total de Animais no Lote".
  const mortalityRate = T > 0 ? (mortality / T) * 100 : 0;
  
  let expectedDays = 0;
  let baseMeta = 0;
  if (data.phase === 'Terminação') {
    expectedDays = 100;
    baseMeta = 2.5;
  } else if (data.phase === 'Creche (leitões desmamados)') {
    expectedDays = 40;
    baseMeta = 1.5;
  }

  let elapsedDays = 0;
  if (data.housingDate && data.date) {
    const days = calculateHousingDays(data.housingDate, data.date);
    if (typeof days === 'number') elapsedDays = Math.max(1, days);
  }

  let proportionalMeta = baseMeta;
  if (expectedDays > 0 && elapsedDays > 0) {
    if (elapsedDays < expectedDays) {
      proportionalMeta = (baseMeta / expectedDays) * elapsedDays;
    }
  }

  // Score calculation logic: Restructured to consider all indicators rigorously
  let score = 100;
  
  const scoreBreakdown = {
    coughDeduction: 0,
    coughDesc: '',
    sneezeDeduction: 0,
    sneezeDesc: '',
    historicDeduction: 0,
    historicDesc: '',
    entericDeduction: 0,
    entericDesc: '',
    mortalityDeduction: 0,
    mortalityDesc: '',
    environmentDeduction: 0,
    environmentDesc: '',
  };

  // Tosse (threshold 2%) - Perde pontos rapidamente, indicativo severo de SRD
  if (cFreq > 0) {
    if (cFreq <= 2) {
      scoreBreakdown.coughDeduction = cFreq * 2;
      scoreBreakdown.coughDesc = `Tosse até 2%: -2 pts por % (${cFreq.toFixed(1)}% * 2 = ${scoreBreakdown.coughDeduction.toFixed(1)} pts)`;
    } else {
      scoreBreakdown.coughDeduction = Math.min(50, 10 + 5 + (cFreq - 2) * 5);
      scoreBreakdown.coughDesc = `Tosse > 2% (Alerta crítico! -5 pts): -15 pts base + 5 pts por % extra (máx 50)`;
    }
  }
  
  // Espirro (threshold 5%) - Pode refletir rinite ou fatores de ambiente (poeira)
  if (sFreq > 0) {
    if (sFreq <= 5) {
      scoreBreakdown.sneezeDeduction = sFreq * 1;
      scoreBreakdown.sneezeDesc = `Espirros até 5%: -1 pt por % (${sFreq.toFixed(1)}% * 1 = ${scoreBreakdown.sneezeDeduction.toFixed(1)} pts)`;
    } else {
      scoreBreakdown.sneezeDeduction = Math.min(30, 5 + 5 + (sFreq - 5) * 3);
      scoreBreakdown.sneezeDesc = `Espirros > 5% (Meta ultrapassada! -5 pts): -10 pts base + 3 pts por % extra (máx 30)`;
    }
  }

  // Entérico (e3 > 2% diarreia líquida é gravíssimo, causa rápida desidratação)
  if (liqFreq > 0) {
    if (liqFreq <= 2) {
      scoreBreakdown.entericDeduction = liqFreq * 2;
      scoreBreakdown.entericDesc = `Diarreia até 2%: -2 pts por % (${liqFreq.toFixed(1)}% * 2 = ${scoreBreakdown.entericDeduction.toFixed(1)} pts)`;
    } else {
      scoreBreakdown.entericDeduction = Math.min(40, 5 + 5 + (liqFreq - 2) * 5);
      scoreBreakdown.entericDesc = `Diarreia > 2% (Surto Entérico! -5 pts): -10 pts base + 5 pts por % extra (máx 40)`;
    }
  } else if (e2p > 0) {
    scoreBreakdown.entericDeduction = Math.min(10, e2p * 0.5);
    scoreBreakdown.entericDesc = `Fezes pastosas: -0.5 pt por % (${e2p.toFixed(1)}% * 0.5 = ${scoreBreakdown.entericDeduction.toFixed(1)} pts, máx 10)`;
  }

  // Mortalidade
  if (mortalityRate > 0) {
    if (proportionalMeta > 0 && mortalityRate <= proportionalMeta) {
      scoreBreakdown.mortalityDeduction = mortalityRate * (10 / proportionalMeta);
      scoreBreakdown.mortalityDesc = `Mortalidade dentro da meta prop. (${proportionalMeta.toFixed(2)}%): Deducão proporcional até 10 pts`;
    } else {
      const base = proportionalMeta > 0 ? 10 : 0;
      const meta = proportionalMeta > 0 ? proportionalMeta : 0;
      scoreBreakdown.mortalityDeduction = Math.min(30, base + 5 + (mortalityRate - meta) * 8);
      scoreBreakdown.mortalityDesc = `Mortalidade > Meta prop. (${meta.toFixed(2)}%): Meta ultrapassada (-5 pts), -${base + 5} pts base + 8 pts por % extra (máx 30)`;
    }
  }

  // Environment
  const envDescParts = [];
  if (data.co2 && data.co2.trim() !== '') {
    const co2Num = Number(data.co2);
    if (co2Num > 2500) {
      scoreBreakdown.environmentDeduction += 3;
      envDescParts.push(`CO2 elevado (>2500ppm, -3)`);
    }
    if (co2Num > 3500) {
      scoreBreakdown.environmentDeduction += 5;
      envDescParts.push(`CO2 crítico (>3500ppm, -5 extra)`);
    }
  }
  
  if (data.temp && data.temp.trim() !== '') {
    const tempNum = Number(data.temp);
    
    // Ideal range depending on phase and age
    const phaseStr = data.phase || '';
    const { min: minTemp, max: maxTemp, label } = getIdealTempRange(phaseStr, data.date, data.housingDate);

    if (tempNum < minTemp || tempNum > maxTemp) {
      scoreBreakdown.environmentDeduction += 3;
      envDescParts.push(`Temperatura inadequada p/ fase (${tempNum}°C vs ${label}, -3)`);
    }
  }
  
  if (data.humidity && data.humidity.trim() !== '') {
    const humidityNum = Number(data.humidity);
    if (humidityNum < 50 || humidityNum > 75) {
      scoreBreakdown.environmentDeduction += 2;
      envDescParts.push(`Umidade fora do ideal (50-75%, -2)`);
    }
  }
  
  if (envDescParts.length > 0) {
    scoreBreakdown.environmentDesc = envDescParts.join(', ');
  }

  // Duration
  if (data.duration && data.duration === 'Longa (> 5 dias)') {
    scoreBreakdown.historicDeduction = 8;
    scoreBreakdown.historicDesc = `Quadro Longo (> 5 dias): histórico persistente (-8 pts)`;
  } else if (data.duration && data.duration === 'Curta (1–5 dias)') {
    scoreBreakdown.historicDeduction = 3;
    scoreBreakdown.historicDesc = `Quadro Curto (1–5 dias): histórico inicial (-3 pts)`;
  }

  // Apply deductions with non-linear decay below 70
  const totalDeductions = 
    scoreBreakdown.coughDeduction + 
    scoreBreakdown.sneezeDeduction + 
    scoreBreakdown.entericDeduction + 
    scoreBreakdown.mortalityDeduction + 
    scoreBreakdown.environmentDeduction + 
    scoreBreakdown.historicDeduction;

  const rawScore = 100 - totalDeductions;
  
  if (rawScore < 70) {
    // Escala mais rigorosa e "resistente" à queda após os 70 pontos.
    // O score cai de forma não-linear, tornando-se mais difícil chegar ao zero absoluto.
    // Assim, apenas lotes com múltiplos indicadores críticos atingirão notas próximas de zero.
    score = 70 * Math.pow(Math.max(0, rawScore) / 70, 0.6);
  } else {
    score = rawScore;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  
  const scoreStatus: 'Excelente' | 'Atenção' | 'Crítico' = 
    score >= 85 ? 'Excelente' : score >= 70 ? 'Atenção' : 'Crítico';

  return {
    cFreq,
    sFreq,
    liqFreq,
    e1p,
    e2p,
    e3p,
    e1,
    score,
    scoreStatus,
    mortalityRate,
    projectedMortalityRate: mortalityRate, // Deprecated, mapped to mortalityRate
    mortalityMeta: proportionalMeta,
    scoreBreakdown
  };
}
