import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateBR(dateStr: string) {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  const p = dateStr.split('-');
  return p.length === 3 ? `${p[2]}/${[p[1]]}/${p[0]}` : dateStr;
}

export function parseDateFlexible(dateStr: string | undefined): Date {
  if (!dateStr) return new Date();
  return new Date(dateStr + 'T00:00:00');
}

export function getIdealTempRange(phase: string, visitDateStr?: string, housingDateStr?: string): { min: number, max: number, label: string } {
  let minTemp = 18;
  let maxTemp = 28;
  
  if (phase === 'Creche (leitões desmamados)') {
    if (visitDateStr && housingDateStr) {
       const vDate = parseDateFlexible(visitDateStr);
       const hDate = parseDateFlexible(housingDateStr);
       const elapsedDays = Math.floor((vDate.getTime() - hDate.getTime()) / (1000 * 60 * 60 * 24));
       if (elapsedDays <= 14) {
         minTemp = 28; maxTemp = 32;
       } else {
         minTemp = 24; maxTemp = 28;
       }
    } else {
       minTemp = 24; maxTemp = 30; // default creche
    }
  } else if (phase === 'Terminação') {
    minTemp = 16; maxTemp = 22;
  } else if (phase === 'Reprodução (matriz/cachaço)') {
    minTemp = 18; maxTemp = 22;
  }
  
  return { min: minTemp, max: maxTemp, label: `${minTemp} - ${maxTemp}°C` };
}
