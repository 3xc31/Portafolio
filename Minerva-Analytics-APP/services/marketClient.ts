import { API_BASE } from '../constants/api';

export type QuoteResponse = {
  symbol: string;
  price: number | null;
  currency?: string | null;
  exchange?: string | null;
  asOf: string;
  error?: string;
};

export async function getQuote(symbol: string, opts?: { fallback?: boolean; lang?: string; region?: string }): Promise<QuoteResponse> {
  const params = new URLSearchParams({ symbol });
  if (opts?.fallback) params.set('fallback', 'true');
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.region) params.set('region', opts.region);
  const url = `${API_BASE}/quote?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Quote request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as QuoteResponse;
  return data;
}

export type Candle = {
  time: string; // ISO string UTC
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

export type HistoryResponse = {
  symbol: string;
  inputSymbol?: string;
  period: string;
  interval: string;
  data: Candle[];
};

export async function getHistory(
  symbol: string,
  opts?: { period?: string; interval?: string; prepost?: boolean; auto_adjust?: boolean; fallback?: boolean; lang?: string; region?: string }
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ symbol });
  if (opts?.period) params.set('period', opts.period);
  if (opts?.interval) params.set('interval', opts.interval);
  if (opts?.prepost !== undefined) params.set('prepost', String(!!opts.prepost));
  if (opts?.auto_adjust !== undefined) params.set('auto_adjust', String(!!opts.auto_adjust));
  if (opts?.fallback) params.set('fallback', 'true');
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.region) params.set('region', opts.region);
  const url = `${API_BASE}/history?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`History request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as HistoryResponse;
  return data;
}
