'use client';
import { useEffect, useState } from 'react';

export type Member = { id: number; name: string; active: boolean };
export type Expense = { id: number; member_id: number; amount: number; kind: string; note: string; date: string };
export type Doc = { id: number; key?: string; [k: string]: any };
export type HouseState = {
  members: Member[];
  expenses: Expense[];
  settings: Record<string, string>;
  docs: Record<string, Doc[]>;
  today: string;
};

export const gs = (n: number) => 'Gs ' + Math.round(n || 0).toLocaleString('pt-BR');

// Lê o mesmo servidor do celular (mesma origem, sem CORS). Atualiza a cada 5 segundos.
export function useHouseState() {
  const [state, setState] = useState<HouseState | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/state', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => alive && (setState(d), setError('')))
        .catch(() => alive && setError('Não foi possível ler os dados da casa. Abra pelo link do Wi-Fi.'));
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return { state, error };
}
