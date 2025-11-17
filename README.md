# 🎯 FocalReader - Hızlı Okuma Chrome Eklentisi

**FocalReader**, web sayfalarını ve PDF dosyalarını odak noktası tabanlı hızlı okuma tekniği ile okumanızı sağlayan güçlü bir Chrome eklentisidir. Her kelimenin optimal okuma noktası (ORP - Optimal Reading Point) hesaplanarak gösterilmesi ile okuma hızınızı %300'e kadar artırabilirsiniz.

## ✨ Özellikler

### 📖 Akıllı Okuma Sistemi
- **ORP (Optimal Reading Point)**: Her kelimenin odak harfi otomatik hesaplanır ve vurgulanır
- **Sabit Merkez**: Pivot harf her zaman ekranın merkezinde kalır, göz hareketi minimuma iner
- **Monospace Font**: Karakter hizalaması için özel tasarlanmış görünüm

### 📄 PDF Desteği
- **Yerel PDF Okuma**: Bilgisayarınızdaki PDF dosyalarını yükleyin
- **Web PDF Okuma**: Tarayıcıda açık PDF'leri doğrudan okuyun
- **Sürükle-Bırak**: PDF dosyalarını direkt olarak eklenti penceresine bırakın
- **7 Adımlı İlerleme**: PDF yükleme sürecini canlı olarak izleyin

### ⚙️ Özelleştirilebilir Ayarlar
- **WPM (Words Per Minute)**: 50-2000 kelime/dakika aralığında hız ayarlayın
- **Font Seçimi**: 7 farklı font ailesi (Georgia, Verdana, Arial, vb.)
- **Kelime Filtresi**: İstenmeyen kelimeleri/cümleleri hariç tutun
- **Koyu Tema**: Odaklanma için minimalist karanlık arayüz

### 🎮 Kontroller
- **▶️ Play/Pause**: Okumayı başlatın veya durdurun
- **Progress Bar**: Metinde ilerlemeyi takip edin ve tıklayarak atlayın
- **Sağ Tık Menüsü**: Sayfada herhangi bir yerde hızlı erişim
- **Metin Seçimi**: Sadece seçili metni okuyun

## 🚀 Kurulum

### Chrome Web Store'dan (Yakında)
1. Chrome Web Store'da **FocalReader** aratın
2. "Add to Chrome" düğmesine tıklayın
3. İzinleri onaylayın

### Manuel Kurulum (Geliştirici Modu)
1. Bu repository'yi indirin veya klonlayın:
   ```bash
   git clone https://github.com/exedesign/FocalReader.git
   ```

2. Chrome'da `chrome://extensions/` sayfasını açın

3. Sağ üstten **"Geliştirici modu"**nu aktif edin

4. **"Paketlenmemiş öğe yükle"** düğmesine tıklayın

5. İndirdiğiniz `FocalReader` klasörünü seçin

6. Eklenti yüklendi! 🎉

## 📖 Kullanım

### Web Sayfalarında Okuma
1. Herhangi bir web sayfasında **sağ tıklayın**
2. **"🚀 Hızlı Okuma (FocalReader)"** seçin
3. Sayfa metni otomatik olarak yüklenir ve okuma başlar

### Metin Seçimi ile Okuma
1. Sayfada okumak istediğiniz metni **seçin**
2. **Sağ tıklayın** → **"🚀 Hızlı Okuma"**
3. Sadece seçili metin okunur

### PDF Okuma
1. Herhangi bir sayfada **sağ tıklayın**
2. **"📄 PDF Yükle ve Oku"** seçin
3. **Yöntem 1**: PDF dosyasını sürükleyip bırakın
4. **Yöntem 2**: Tıklayarak dosya seçin
5. 7 adımlı yükleme süreci otomatik başlar:
   - ✅ Dosya kontrolü
   - ✅ Belleğe yükleme
   - ✅ PDF.js motoru hazırlama
   - ✅ PDF yapısı analizi
   - ✅ Sayfa sayfa metin çıkarma
   - ✅ Kelime ayrıştırma
   - ✅ Okumaya başlama

### Ayarları Yapılandırma
1. `chrome://extensions/` → **FocalReader** → **"Seçenekler"**
2. **WPM**: Okuma hızınızı ayarlayın (varsayılan: 250)
3. **Font**: Tercih ettiğiniz fontu seçin
4. **Hariç Tutulacak Kelimeler**: Virgülle ayrılmış kelimeler girin
   - Örnek: `reklam,ilan,kampanya,duyuru`
5. **"Kaydet"** düğmesine tıklayın

## 🎨 Ekran Görüntüleri

### Okuma Ekranı
- Minimalist koyu tema
- Merkezi odak noktası
- Alt kısımda kontroller
- Progress bar ile ilerleme takibi

### PDF Yükleme
- Canlı yükleme göstergesi
- Adım adım ilerleme
- Progress bar ile yüzdelik gösterim
- Detaylı bilgilendirme

## 🛠️ Teknolojiler

- **Chrome Extension Manifest V3**: Modern eklenti mimarisi
- **PDF.js v3.11.174**: Mozilla'nın PDF okuma kütüphanesi
- **Chrome Storage API**: Kullanıcı ayarları için persistent storage
- **Context Menus API**: Sağ tık menü entegrasyonu
- **FileReader API**: Yerel dosya okuma

## 📐 ORP (Optimal Reading Point) Algoritması

FocalReader, her kelimenin uzunluğuna göre optimal okuma noktasını hesaplar:

- 1 harf: 1. karakter
- 2-5 harf: 2. karakter
- 6-9 harf: 3. karakter
- 10-13 harf: 4. karakter
- 14+ harf: 5. karakter

Bu pivot nokta sarı renkte vurgulanır ve her zaman ekranın merkezinde kalır.

## 🔧 Geliştirme

### Gereksinimler
- Node.js (opsiyonel, geliştirme için)
- Chrome veya Chromium tabanlı tarayıcı
- Git

### Proje Yapısı
```
FocalReader/
├── manifest.json          # Eklenti yapılandırması
├── src/
│   ├── content.js        # Ana içerik scripti
│   ├── background.js     # Servis worker
│   ├── popup.html        # Popup arayüzü
│   ├── popup.js          # Popup mantığı
│   ├── options.html      # Ayarlar sayfası
│   ├── options.js        # Ayarlar mantığı
│   └── styles.css        # Stil dosyası
├── lib/
│   ├── pdf.min.js        # PDF.js kütüphanesi
│   └── pdf.worker.min.js # PDF.js worker
└── README.md
```

### Geliştirici Notları
- Extension context yönetimi için otomatik bildirim sistemi
- PDF.js manifest'te pre-loaded olarak yüklenir
- Async settings loading ile race condition önlenir
- Monospace font ile karakter hizalaması garanti edilir

## 🐛 Bilinen Sorunlar ve Çözümler

### Extension Context Invalid
Eklenti güncellendiğinde, açık sayfalarda bir confirm dialog gösterilir. "Tamam" seçerek sayfayı yenileyin.

### PDF Yüklenemiyor
- Taranmış (scan edilmiş) PDF'ler desteklenmez
- PDF şifreliyse metin çıkarılamaz
- Çok büyük PDF'lerde (>50MB) yavaşlama olabilir

### Kelime Filtresi Çalışmıyor
Ayarlar sayfasından kaydettikten sonra, yeni bir metin/PDF yükleyin.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Sürüm Geçmişi

### v0.4.0 (2025-11-17)
- ✨ Otomatik bildirim sistemi: Eklenti güncellendiğinde tüm sayfalara bildirim
- 🔧 Extension context hataları için akıllı yönetim
- 📋 Hariç tutulacak kelimeler özelliği düzeltildi
- 🎨 Detaylı console logları eklendi

### v0.3.x
- 📦 PDF.js manifest'te pre-loaded
- ⚡ 7 adımlı detaylı PDF yükleme ekranı
- 🎯 Canlı progress bar ve adım göstergeleri
- 🛡️ Extension context kontrolü ve otomatik sayfa yenileme

### v0.2.x
- 📄 Sürükle-bırak PDF desteği
- 🎨 Koyu tema ve monospace font
- 📊 Progress bar ile metin gezinme
- ⚙️ Özelleştirilebilir ayarlar sayfası

### v0.1.x
- 🚀 İlk sürüm
- 📖 Temel hızlı okuma özelliği
- 🎯 ORP algoritması
- 📝 Metin seçimi desteği

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

**Exe Design**
- GitHub: [@exedesign](https://github.com/exedesign)

## 🙏 Teşekkürler

- Mozilla PDF.js ekibine PDF okuma desteği için
- Chrome Extensions dokümantasyonuna
- Tüm katkıda bulunanlara

## 📞 İletişim

Sorularınız, önerileriniz veya hata bildirimleriniz için:
- GitHub Issues: [github.com/exedesign/FocalReader/issues](https://github.com/exedesign/FocalReader/issues)

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**
