// SODAX API Service - Interacts with the SODAX Backend API

import axios from "axios";

const SODAX_API_BASE = "https://api.sodax.com/v1/be";
const REQUEST_TIMEOUT = 30000;

/**
 * Makes a request to the SODAX API
 */
async function apiRequest<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  try {
    const response = await axios.get<T>(`${SODAX_API_BASE}${endpoint}`, {
      params,
      timeout: REQUEST_TIMEOUT,
      headers: {
        "Accept": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Resource not found: ${endpoint}`);
      }
      if (error.response?.status === 429) {
        throw new Error("Rate limit exceeded. Please wait before making more requests.");
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timed out. Please try again.");
      }
      throw new Error(`API request failed: ${error.message}`);
    }
    throw error;
  }
}

// ============ Config Endpoints ============

export interface ChainConfig {
  chainId: number;
  name: string;
  [key: string]: unknown;
}

export interface TokenConfig {
  symbol: string;
  address: string;
  decimals: number;
  chainId?: number;
  [key: string]: unknown;
}

export async function getSupportedChains(): Promise<ChainConfig[]> {
  return apiRequest<ChainConfig[]>("/config/spoke/chains");
}

export async function getAllChainsConfigs(): Promise<unknown> {
  return apiRequest("/config/spoke/all-chains-configs");
}

export async function getSwapTokens(chainId?: number): Promise<TokenConfig[]> {
  if (chainId) {
    return apiRequest<TokenConfig[]>(`/config/swap/${chainId}/tokens`);
  }
  return apiRequest<TokenConfig[]>("/config/swap/tokens");
}

export async function getHubAssets(chainId?: number): Promise<unknown> {
  if (chainId) {
    return apiRequest(`/config/hub/${chainId}/assets`);
  }
  return apiRequest("/config/hub/assets");
}

export async function getMoneyMarketTokens(chainId?: number): Promise<unknown> {
  if (chainId) {
    return apiRequest(`/config/money-market/${chainId}/tokens`);
  }
  return apiRequest("/config/money-market/tokens");
}

export async function getMoneyMarketReserveAssets(): Promise<unknown> {
  return apiRequest("/config/money-market/reserve-assets");
}

// ============ Intent Endpoints ============

export interface IntentDetails {
  intentHash: string;
  status: string;
  sourceChainId: number;
  destinationChainId: number;
  [key: string]: unknown;
}

export interface IntentHistory {
  intents: IntentDetails[];
  total: number;
  [key: string]: unknown;
}

export async function getIntentByTxHash(txHash: string): Promise<IntentDetails> {
  return apiRequest<IntentDetails>(`/intent/tx/${txHash}`);
}

export async function getIntentByHash(intentHash: string): Promise<IntentDetails> {
  return apiRequest<IntentDetails>(`/intent/${intentHash}`);
}

export async function getUserIntents(userAddress: string): Promise<IntentHistory> {
  return apiRequest<IntentHistory>(`/intent/user/${userAddress}`);
}

// ============ Solver Endpoints ============

export interface OrderbookEntry {
  [key: string]: unknown;
}

export interface VolumeData {
  items: unknown[];
  total: number;
  [key: string]: unknown;
}

export async function getOrderbook(): Promise<OrderbookEntry[]> {
  const response = await apiRequest<{ items: OrderbookEntry[] }>("/solver/orderbook");
  return response.items || response as unknown as OrderbookEntry[];
}

export async function getVolume(page?: number, limit?: number): Promise<VolumeData> {
  const params: Record<string, number> = {};
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return apiRequest<VolumeData>("/solver/volume", params);
}

// ============ Money Market Endpoints ============

export interface UserPosition {
  userAddress: string;
  positions: unknown[];
  [key: string]: unknown;
}

export interface MoneyMarketAsset {
  reserveAddress: string;
  symbol: string;
  [key: string]: unknown;
}

export async function getUserMoneyMarketPosition(userAddress: string): Promise<UserPosition> {
  return apiRequest<UserPosition>(`/moneymarket/position/${userAddress}`);
}

export async function getAllMoneyMarketAssets(): Promise<MoneyMarketAsset[]> {
  return apiRequest<MoneyMarketAsset[]>("/moneymarket/asset/all");
}

export async function getAssetByReserve(reserveAddress: string): Promise<MoneyMarketAsset> {
  return apiRequest<MoneyMarketAsset>(`/moneymarket/asset/${reserveAddress}`);
}

// ============ Partners Endpoints ============

export interface Partner {
  name?: string;
  receiver: string;
  [key: string]: unknown;
}

export interface PartnerSummary {
  receiver: string;
  totalVolume?: number;
  [key: string]: unknown;
}

export async function getPartners(): Promise<Partner[]> {
  return apiRequest<Partner[]>("/partners");
}

export async function getPartnerSummary(receiver: string): Promise<PartnerSummary> {
  return apiRequest<PartnerSummary>(`/partners/${receiver}/summary`);
}

// ============ SODA Token Endpoints ============

export interface TokenSupply {
  totalSupply: string;
  circulatingSupply: string;
  [key: string]: unknown;
}

export async function getTotalSupply(): Promise<string> {
  return apiRequest<string>("/sodax/total_supply");
}

export async function getCirculatingSupply(): Promise<string> {
  return apiRequest<string>("/sodax/circulating_supply");
}

export async function getAllSupplyData(): Promise<TokenSupply> {
  return apiRequest<TokenSupply>("/sodax/supply");
}
