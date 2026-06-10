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
