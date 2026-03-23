/**
 * 発注者マスターデータ
 * 全ての発注者データの単一真実源（Single Source of Truth）
 */
import type { Orderer } from '../types/orderer';
import { getApiUrl } from '../config/api';

const generateOrderers = async (): Promise<Orderer[]> => {
  try {
    const res = await fetch(getApiUrl('/api/orderers'));
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

// エクスポート
//export const mockOrderers: Orderer[] = generateOrderers();
export const mockOrderers: Orderer[] = await generateOrderers();

// ヘルパー関数
export const findOrdererById = (id: string): Orderer | undefined =>
  mockOrderers.find(o => o.id === id);

export const findOrdererByName = (name: string): Orderer | undefined =>
  mockOrderers.find(o => o.name === name);
