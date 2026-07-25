import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';

const extra = (Constants.expoConfig?.extra || {}) as { webAppUrl?: string };
const webAppUrl = extra.webAppUrl || 'http://192.168.1.107:3000';
const authStorageKey = 'sb-dcnpabvaptjilinfyrwy-auth-token';

export default function OnPaceMobile() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecking(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const injected = useMemo(() => {
    if (!session) return undefined;
    const payload = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    }).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `window.localStorage.setItem('${authStorageKey}', '${payload}'); true;`;
  }, [session]);

  async function submit() {
    setMessage('');
    if (!email.trim() || password.length < 6) { setMessage('Geçerli bir e-posta ve en az 6 karakterli şifre gir.'); return; }
    setBusy(true);
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === 'signup' && !result.data.session) setMessage('Hesabın oluşturuldu. E-postandaki doğrulama bağlantısına tıkla.');
  }

  if (checking) return <View style={styles.center}><ActivityIndicator color="#5146D9" size="large" /></View>;
  if (session) return <View style={styles.container}><WebView ref={webViewRef} source={{ uri: `${webAppUrl}/dashboard` }} injectedJavaScriptBeforeContentLoaded={injected} javaScriptEnabled domStorageEnabled sharedCookiesEnabled style={styles.webview} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}><Text style={styles.brandMark}>✦</Text><Text style={styles.brandName}>OnPace</Text></View>
          <Text style={styles.kicker}>AI STUDY COACH</Text>
          <Text style={styles.title}>{mode === 'signin' ? 'Çalışma düzenini yeniden kur.' : 'Daha iyi çalışmaya bugün başla.'}</Text>
          <Text style={styles.subtitle}>{mode === 'signin' ? 'Hesabına giriş yap ve kaldığın yerden devam et.' : 'Kişisel çalışma planın ve yapay zekâ koçun tek yerde.'}</Text>
          <View style={styles.card}>
            {mode === 'signup' && <TextInput value={name} onChangeText={setName} placeholder="Ad soyad" placeholderTextColor="#94A3B8" style={styles.input} />}
            <TextInput value={email} onChangeText={setEmail} placeholder="E-posta adresi" placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
            <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" placeholderTextColor="#94A3B8" secureTextEntry style={styles.input} />
            {!!message && <Text style={styles.message}>{message}</Text>}
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}</Text>}
            </Pressable>
            <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(''); }} style={styles.switch}>
              <Text style={styles.switchText}>{mode === 'signin' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}<Text style={styles.link}>{mode === 'signin' ? 'Kayıt ol' : 'Giriş yap'}</Text></Text>
            </Pressable>
          </View>
          <Text style={styles.footer}>Güvenli giriş · Verilerin Supabase ile korunur</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  webview: { flex: 1, backgroundColor: '#F7F8FC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F8FC' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 26 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 42 },
  brandMark: { width: 42, height: 42, borderRadius: 14, textAlign: 'center', paddingTop: 8, color: '#FFF', backgroundColor: '#5146D9', fontSize: 22, fontWeight: '900' },
  brandName: { color: '#172033', fontSize: 24, fontWeight: '900' },
  kicker: { color: '#5146D9', fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginBottom: 12 },
  title: { color: '#172033', fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 26 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 18, shadowColor: '#1B2140', shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  input: { height: 54, borderWidth: 1, borderColor: '#E2E6F0', borderRadius: 14, paddingHorizontal: 16, color: '#172033', fontSize: 15, marginBottom: 12, backgroundColor: '#FBFCFF' },
  button: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#5146D9', marginTop: 4 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  message: { color: '#C2415A', fontSize: 13, lineHeight: 19, marginBottom: 10 },
  switch: { alignItems: 'center', paddingTop: 20 },
  switchText: { color: '#64748B', fontSize: 13 },
  link: { color: '#5146D9', fontWeight: '800' },
  footer: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 24 },
});
