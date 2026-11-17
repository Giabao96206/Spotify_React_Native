import AsyncStorage from '@react-native-async-storage/async-storage';
export const DEFAULT_API_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
let current = DEFAULT_API_URL;
let loading: Promise<void> | undefined;
export function normalizeServerUrl(input: string) {
 const url = new URL(input.trim());
 if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) throw new Error('Nhập địa chỉ dạng http://192.168.0.45:5555');
 return url.origin;
}
export function loadServerUrl() { return loading ||= AsyncStorage.getItem('nightwave-api-url').then(value => { if (value) { try { current = normalizeServerUrl(value); } catch {} } }); }
export async function getServerUrl() { await loadServerUrl(); return current; }
export async function saveServerUrl(value: string) { const url = normalizeServerUrl(value); await AsyncStorage.setItem('nightwave-api-url', url); current = url; }
export async function checkServerUrl(value: string) {
 const url = normalizeServerUrl(value); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 7000);
 try { const response = await fetch(url + '/health', { signal: controller.signal }); const data = await response.json(); if (!response.ok || data.ok !== true) throw new Error('Địa chỉ này không trả về health hợp lệ.'); return url; }
 finally { clearTimeout(timer); }
}
