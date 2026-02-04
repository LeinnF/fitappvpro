# Fitapp Kurulum ve Yayınlama Rehberi 🚀

Uygulamanızı **Vercel** veya **GitHub Pages** üzerinde yayınlamak, hem "Model Bulunamadı" gibi hataları çözmenize yardımcı olur hem de uygulamanızı tüm cihazlardan erişilebilir hale getirir.

## 1. Yöntem: Vercel ile Yayınlama (Önerilen)
Vercel, bu tür projeler için en hızlı ve performanslı yöntemdir.

### Adım 1: GitHub Reposu Oluşturun
1.  [GitHub](https://github.com/) hesabınıza giriş yapın.
2.  Sağ üstteki **+** ikonuna tıklayıp **New repository** deyin.
3.  Repository name: `fitapp` (veya istediğiniz bir isim).
4.  **Public** seçeneğini işaretleyin.
5.  **Create repository** butonuna basın.

### Adım 2: Dosyaları Yükleyin
Bu klasördeki dosyaları (`index.html`, `style.css`, `script.js`, `manifest.json`, `w.jpg`) oluşturduğunuz repoya yüklemeniz gerekiyor.
*   **Seçenek A (Kolay):** GitHub sayfasında "uploading an existing file" linkine tıklayıp bilgisayarınızdaki klasörün içindekileri sürükleyip bırakın ve "Commit changes" deyin.
*   **Seçenek B (Terminal):** Git kullanıyorsanız aşağıdaki komutlarla yükleyin:
    ```bash
    git init
    git add .
    git commit -m "İlk yükleme"
    git branch -M main
    git remote add origin https://github.com/KULLANICI_ADINIZ/fitapp.git
    git push -u origin main
    ```

### Adım 3: Vercel'e Bağlayın
1.  [Vercel](https://vercel.com/) sitesine gidin ve GitHub hesabınızla giriş yapın.
2.  **Add New...** -> **Project** butonuna tıklayın.
3.  GitHub listenizden az önce oluşturduğunuz `fitapp` reposunu bulun ve **Import** deyin.
4.  Hiçbir ayarı değiştirmeden **Deploy** butonuna basın.

🎉 **Tebrikler!** 1 dakika içinde size `https://fitapp-kullaniciadi.vercel.app` gibi çalışan bir link verecek. Bu linkte kamera ve yapay zeka özellikleri çok daha sorunsuz çalışacaktır.

---

## Google Gemini API Hakkında Not
Yayınlanan siteye girdiğinizde **Fotoğraf Çek** butonuna bastığınızda yine API Anahtarı isteyecektir. Kendi anahtarınızı girdiğinizde `https` güvenliği sayesinde sorunsuz çalışması beklenir.

Eğer hala hata alırsanız:
1.  [Google AI Studio](https://aistudio.google.com/app/apikey) adresinden **yeni** bir API Key oluşturun.
2.  Bazen eski anahtarlar "bölgesel kısıtlamalara" takılabiliyor, yeni anahtar genellikle sorunu çözer.
