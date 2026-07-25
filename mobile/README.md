# OnPace Mobile

OnPace Mobile, web uygulamasının responsive arayüzünü Expo Go içinde gösterir. Bu sayede kullanıcı mobilde de webdeki tasarıma, oturuma ve tüm özelliklere erişir; ikinci, eksik bir özellik seti oluşmaz.

## Yerelde Expo Go ile çalıştırma

1. Web uygulamasını bilgisayarın ağ arayüzünden çalıştırın:

   ```powershell
   cd C:\Users\Atahan\Desktop\OnPace
   npm run dev -- --hostname 0.0.0.0
   ```

2. `mobile/app.json` içindeki `extra.webAppUrl` değerini bilgisayarınızın Wi-Fi IPv4 adresiyle ayarlayın. Örnek:

   ```json
   "webAppUrl": "http://192.168.1.107:3000"
   ```

3. Expo geliştirme sunucusunu başlatın:

   ```powershell
   cd C:\Users\Atahan\Desktop\OnPace\mobile
   npm install
   npx expo start --lan -c
   ```

Telefon ve bilgisayar aynı Wi-Fi ağına bağlı olmalıdır. QR kodunu Expo Go ile okutun. Üretime geçerken `webAppUrl` değerini HTTPS ile çalışan gerçek alan adınıza değiştirin.
