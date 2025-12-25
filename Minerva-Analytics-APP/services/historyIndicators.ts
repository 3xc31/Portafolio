// Service: Fetch historical data with indicators from Cloud Run
// This is a TypeScript adaptation of services/getHistory.py

export type HistoryIndicatorsRequest = {
  ticker: string;
  startDate: string; // ISO date: YYYY-MM-DD
  endDate: string;   // ISO date: YYYY-MM-DD
};

// Cloud Run response shape
export type HistoryIndicatorsResponse = {
  ticker: string;
  historicalData: Array<{
    Date: string; // e.g., '2023-01-03'
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume?: number;
    Dividends?: number;
    'Stock Splits'?: number;
  }>;
};

const FUNCTION_URL =
  'https://get-historical-data-with-indicators-ugz5lcdyca-uc.a.run.app';

export async function fetchHistoryWithIndicators(
  params: HistoryIndicatorsRequest
): Promise<HistoryIndicatorsResponse> {
  const payload = { data: params };

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    // Try to surface JSON error details if available
    try {
      const errJson = JSON.parse(text);
      throw new Error(
        `Cloud Run error ${res.status}: ${JSON.stringify(errJson)}`
      );
    } catch {
      throw new Error(`Cloud Run error ${res.status}: ${text}`);
    }
  }

  try {
    return JSON.parse(text) as HistoryIndicatorsResponse;
  } catch {
    throw new Error('Respuesta no es JSON Valido del servicio de historial.');
  }
}

import type { HistoryResponse, Candle } from './marketClient';

export async function getHistoryByDateRange(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<HistoryResponse> {
  const resp = await fetchHistoryWithIndicators({ ticker: symbol, startDate, endDate });
  const candles: Candle[] = (resp as HistoryIndicatorsResponse).historicalData?.map((d) => ({
    time: new Date(d.Date).toISOString(),
    open: d.Open,
    high: d.High,
    low: d.Low,
    close: d.Close,
    volume: typeof d.Volume === 'number' ? d.Volume : undefined,
  })) ?? [];
  return {
    symbol: (resp as HistoryIndicatorsResponse).ticker || symbol,
    inputSymbol: symbol,
    period: 'custom',
    interval: '1d',
    data: candles,
  };
}
