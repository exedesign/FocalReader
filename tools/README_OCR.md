# 📄 PDF OCR Formatter - Kullanım Kılavuzu

FocalReader eklentisinin bozuk metin katmanına sahip PDF dosyalarını işlemek için **Python tabanlı OCR aracı**.

## 🎯 Ne Yapar?

PDF dosyalarındaki bozuk metin katmanını (`G İ RAY`, `Clemens'inşatosundaki` gibi) düzeltmek için:
1. PDF sayfalarını **yüksek çözünürlüklü resimlere** dönüştürür
2. **Tesseract OCR** ile Türkçe metni yeniden okur
3. **Türkçe karakter hatalarını** düzeltir (`ý→ı`, `ð→ğ`, `þ→ş`)
4. **Metni normalleştirir** (boşluklar, satır sonları)
5. **Senaryo formatına** çevirir (konuşmacı: diyalog)

## 📋 Gereksinimler

### 1. Tesseract OCR Motor (Sistem Kurulumu)

#### Windows:
1. [Tesseract Windows Installer](https://github.com/UB-Mannheim/tesseract/wiki) indirin
2. Kurulum sırasında **"Additional language data"** açın
3. **"Turkish"** dil paketini seçin
4. Yükleme yolunu not edin: `C:\Program Files\Tesseract-OCR\tesseract.exe`

#### macOS:
```bash
brew install tesseract
brew install tesseract-lang  # Türkçe dahil tüm diller
```

#### Linux:
```bash
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-tur  # Türkçe dil paketi
```

### 2. Poppler (PDF → Resim dönüşümü için)

#### Windows:
1. [Poppler Windows Release](https://github.com/oschwartz10612/poppler-windows/releases/) indirin
2. Zip'i çıkarın ve `bin/` klasörünü PATH'e ekleyin

#### macOS:
```bash
brew install poppler
```

#### Linux:
```bash
sudo apt-get install poppler-utils
```

### 3. Python Paketleri

```bash
cd tools
pip install -r requirements.txt
```

**Veya manuel kurulum:**
```bash
pip install pytesseract pdf2image Pillow
```

## 🚀 Kullanım

### Adım 1: PDF Dosyasını Hazırlayın

PDF dosyanızı `tools/` klasörüne koyun veya tam yolunu kullanın.

### Adım 2: Script'i Yapılandırın

`tools/pdf_ocr_formatter.py` dosyasını açın ve `PDF_PATH` değişkenini düzenleyin:

```python
# PDF dosyasının yolu
PDF_PATH = "ornek.pdf"  # ← Buraya kendi PDF'inizin adını yazın
```

**Windows kullanıcıları:** Eğer Tesseract'ı PATH'e eklemediyseniz:
```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

### Adım 3: Script'i Çalıştırın

```bash
cd tools
python pdf_ocr_formatter.py
```

### Adım 4: Çıktıyı Kontrol Edin

İşlem tamamlandığında `tools/Cikti_Senaryo.md` dosyası oluşur:

```markdown
# PDF OCR Çıktısı

**Kaynak PDF:** ornek.pdf
**İşlenme Tarihi:** 2025-11-17 15:30:45

---

**GUSTAV**: Merhaba, nasılsın?

*Gustav, odaya girer ve etrafa bakar.*

**ANNA**: İyiyim, teşekkür ederim.

*Anna gülümser ve koltuğa oturur.*
```

## ⚙️ Yapılandırma Seçenekleri

`pdf_ocr_formatter.py` içinde düzenlenebilir ayarlar:

```python
# Çıktı dosyası adı
OUTPUT_FILE = "Cikti_Senaryo.md"

# OCR dili (Türkçe)
OCR_LANG = 'tur'

# OCR çözünürlük (DPI - yüksek = daha iyi kalite ama yavaş)
DPI = 300  # 150-600 arası önerilir

# Senaryo formatını devre dışı bırakma
apply_dialogue_format = False  # Sadece temizlenmiş metin için
```

## 🔧 Sorun Giderme

### Hata: "Tesseract is not installed"
- Tesseract OCR'ın kurulu olduğundan emin olun
- Windows: `tesseract_cmd` yolunu kontrol edin
- Terminal'de test edin: `tesseract --version`

### Hata: "Unable to load any image from PDF"
- Poppler'ın kurulu olduğunu kontrol edin
- Windows: Poppler `bin/` klasörü PATH'te olmalı
- Test edin: `pdftoppm -v`

### Hata: "Unable to get page count"
- PDF dosyasının bozuk olmadığından emin olun
- PDF dosya yolunun doğru olduğunu kontrol edin
- PDF'in şifre korumalı olmadığını kontrol edin

### Türkçe karakterler hala bozuk
- Tesseract kurulumunda Türkçe dil paketinin seçildiğinden emin olun
- `OCR_LANG = 'tur'` ayarının doğru olduğunu kontrol edin
- Terminal'de test edin: `tesseract --list-langs` (tur görünmeli)

### Çok yavaş çalışıyor
- DPI değerini düşürün: `DPI = 150` veya `DPI = 200`
- Sayfa sayısını azaltın (test için)
- Daha güçlü bir bilgisayar kullanın (OCR CPU yoğun)

## 📊 Performans İpuçları

| DPI | Kalite | Hız | Kullanım |
|-----|--------|-----|----------|
| 150 | Düşük | ⚡⚡⚡ | Hızlı test |
| 200 | Orta | ⚡⚡ | Günlük kullanım |
| 300 | Yüksek | ⚡ | Kaliteli çıktı |
| 600 | Çok Yüksek | 🐌 | Profesyonel |

**Tavsiye:** İlk denemeler için DPI=200, final çıktı için DPI=300 kullanın.

## 🎭 Senaryo Formatı

Script otomatik olarak şu formatı tanır ve düzenler:

**Girdi (PDF'den OCR ile):**
```
GUSTAV
Merhaba, nasılsın?

Anna gülümser

ANNA
İyiyim, teşekkür ederim
```

**Çıktı (Markdown formatında):**
```markdown
**GUSTAV**: Merhaba, nasılsın?

*Anna gülümser*

**ANNA**: İyiyim, teşekkür ederim
```

## 🔄 Chrome Eklentisi ile Entegrasyon

OCR ile çıkan temiz metni Chrome eklentisinde kullanmak için:

1. `Cikti_Senaryo.md` dosyasını açın
2. İçeriği kopyalayın
3. Chrome'da FocalReader eklentisini açın
4. "Metin Yapıştır" seçeneğini kullanın
5. Hızlı okumaya başlayın!

## 📝 Lisans

Bu araç FocalReader projesi kapsamında MIT lisansı altında dağıtılmaktadır.

## 🤝 Katkıda Bulunma

Sorun bildirmek veya öneride bulunmak için GitHub Issues kullanabilirsiniz.

---

**Not:** Bu araç, FocalReader Chrome eklentisinin JavaScript/PDF.js tabanlı çözümüne **alternatif** bir yaklaşımdır. Ciddi şekilde bozuk PDF'ler için bu Python aracını kullanmanız önerilir.
