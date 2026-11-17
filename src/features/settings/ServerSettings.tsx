import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getServerUrl, checkServerUrl, saveServerUrl } from '@/services/api/server';
import { colors } from '@/theme/tokens';
export function ServerSettings() {
 const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const client = useQueryClient();
 useEffect(() => { let mounted = true; getServerUrl().then(value => mounted && setUrl(value)); return () => { mounted = false; }; }, []);
 const save = async () => { setBusy(true); setMessage(''); try { const valid = await checkServerUrl(url); await client.cancelQueries(); await saveServerUrl(valid); await client.resetQueries(); setMessage('Đã lưu. Các lần kết nối tiếp theo sẽ dùng địa chỉ mới.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không kết nối được. Kiểm tra Wi-Fi và địa chỉ máy chủ.'); } finally { setBusy(false); } };
 return <View style={{ padding: 16, borderRadius: 16, backgroundColor: colors.surface, marginBottom: 16 }}><Text style={{ color: colors.white, fontWeight: '700', marginBottom: 10 }}>Máy chủ nhạc</Text><TextInput accessibilityLabel="Địa chỉ backend" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} placeholder="http://192.168.0.45:5555" placeholderTextColor={colors.dim} style={{ color: colors.white, padding: 12, backgroundColor: colors.ink, borderRadius: 10 }} /><Pressable disabled={busy} onPress={save} style={{ paddingTop: 14 }}>{busy ? <ActivityIndicator color={colors.green} /> : <Text style={{ color: colors.green, fontWeight: '700' }}>Kiểm tra và lưu</Text>}</Pressable>{!!message && <Text style={{ color: colors.muted, marginTop: 10 }}>{message}</Text>}</View>;
}
