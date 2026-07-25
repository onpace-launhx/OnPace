import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';

type AppExtra = {
  webAppUrl?: string;
  apiBaseUrl?: string;
};

const appExtra = (Constants.expoConfig?.extra || {}) as AppExtra;
const webAppUrl = appExtra.webAppUrl || appExtra.apiBaseUrl || 'http://192.168.1.107:3000';

export default function OnPaceMobile() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const retry = () => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.errorScreen}>
        <View style={styles.errorCard}>
          <View style={styles.logo}><Text style={styles.logoText}>✦</Text></View>
          <Text style={styles.title}>OnPace’e bağlanılamadı</Text>
          <Text style={styles.description}>
            Telefonun ve bilgisayarın aynı Wi-Fi ağına bağlı olduğundan, web
            uygulamasının açık olduğundan emin ol.
          </Text>
          <Text style={styles.address}>{webAppUrl}</Text>
          <Pressable onPress={retry} style={styles.retryButton}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: webAppUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError('connection_failed');
        }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) {
            setError('server_failed');
          }
        }}
      />
      {isLoading && (
        <View style={styles.loader} pointerEvents="none">
          <View style={styles.loaderCard}>
            <ActivityIndicator color="#5146D9" size="small" />
            <Text style={styles.loaderText}>OnPace yükleniyor...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  webview: { flex: 1, backgroundColor: '#F8F9FC' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FC' },
  loaderCard: { alignItems: 'center', gap: 12, padding: 22, borderRadius: 20, backgroundColor: '#FFFFFF', shadowColor: '#1B2140', shadowOpacity: 0.1, shadowRadius: 24, elevation: 4 },
  loaderText: { color: '#4B5563', fontWeight: '700', fontSize: 13 },
  errorScreen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8F9FC' },
  errorCard: { alignItems: 'center', gap: 14, borderRadius: 28, padding: 26, backgroundColor: '#FFFFFF', shadowColor: '#1B2140', shadowOpacity: 0.1, shadowRadius: 24, elevation: 4 },
  logo: { height: 54, width: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#5146D9' },
  logoText: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  title: { color: '#172033', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  description: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  address: { color: '#5146D9', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  retryButton: { marginTop: 4, width: '100%', alignItems: 'center', borderRadius: 14, paddingVertical: 14, backgroundColor: '#5146D9' },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
