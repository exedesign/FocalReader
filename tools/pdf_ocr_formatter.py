#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF OCR Formatter - Tesseract OCR ile PDF'den Metin Çıkarma
============================================================

Bu script, bozuk metin katmanına sahip PDF dosyalarını OCR ile okur,
temizler ve senaryo formatında çıktı verir.

Gereksinimler:
- Tesseract OCR kurulu olmalı (Türkçe dil paketi ile)
- Python paketleri: pytesseract, pdf2image, Pillow

Kullanım:
    python pdf_ocr_formatter.py
"""

import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import re
import os
import sys

# ============================================================================
# AYARLAR - Gerekirse düzenleyin
# ============================================================================

# PDF dosyasının yolu (bu değişkeni kendi PDF'inizin yolu ile değiştirin)
PDF_PATH = "ornek.pdf"

# Çıktı dosyası
OUTPUT_FILE = "Cikti_Senaryo.md"

# Windows kullanıcıları için: Tesseract'ın kurulu olduğu yer
# Eğer PATH'e eklediyseniz bu satırı yorum satırı yapabilirsiniz
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# OCR dili (Türkçe)
OCR_LANG = 'tur'

# OCR çözünürlük ayarı (DPI - yüksek = daha iyi kalite ama yavaş)
DPI = 300

# ============================================================================
# YARDIMCI FONKSİYONLAR
# ============================================================================

def fix_turkish_characters(text):
    """
    OCR'dan gelen hatalı Türkçe karakterleri düzeltir.
    """
    char_map = {
        'ý': 'ı', 'Ý': 'İ',  # Noktasız I ve İ
        'ð': 'ğ', 'Ð': 'Ğ',  # Yumuşak G
        'þ': 'ş', 'Þ': 'Ş',  # Ş
        'ç': 'ç', 'Ç': 'Ç',  # Ç
        'ö': 'ö', 'Ö': 'Ö',  # Ö
        'ü': 'ü', 'Ü': 'Ü'   # Ü
    }
    
    cleaned_text = text
    for incorrect, correct in char_map.items():
        cleaned_text = cleaned_text.replace(incorrect, correct)
    
    # Gereksiz tırnak işaretlerini düzelt
    cleaned_text = re.sub(r'[''""]', "'", cleaned_text)
    
    return cleaned_text


def normalize_text(text):
    """
    Metni normalleştirir: fazla boşlukları, satır sonlarını düzenler.
    """
    # Çoklu satır sonlarını iki satır sonuna düşür
    normalized = re.sub(r'(\r\n|\n|\r){2,}', '\n\n', text)
    
    # Satır başlarındaki ve sonlarındaki gereksiz boşlukları temizle
    normalized = re.sub(r'^[ \t]+|[ \t]+$', '', normalized, flags=re.MULTILINE)
    
    # İki veya daha fazla ardışık boşluğu tek boşluğa düşür
    normalized = re.sub(r'[ \t]{2,}', ' ', normalized)
    
    # Konuşmacı adlarının yanındaki tek satır sonlarını tek boşluğa çevir
    normalized = re.sub(r'([A-ZÇĞIİÖŞÜ]+)\s*\n', r'\1 ', normalized)
    
    return normalized


def extract_dialogue(text):
    """
    Senaryo formatındaki metinden diyalogları çıkarır ve yapılandırır.
    """
    lines = text.split('\n')
    structured_content = []
    current_speaker = None
    
    # Konuşmacı adlarını büyük harfle başlatan REGEX deseni
    speaker_regex = re.compile(r'^([A-ZÇĞIİÖŞÜ\s\(\).]{2,}):', re.IGNORECASE)
    
    for line in lines:
        match = speaker_regex.match(line)
        
        if match:
            # Konuşmacı adı bulundu
            current_speaker = match.group(1).strip()
            dialogue_text = line[len(match.group(0)):].strip()
            structured_content.append({
                'type': 'dialogue',
                'speaker': current_speaker,
                'text': dialogue_text
            })
        elif line.strip():
            # Boş olmayan satır
            if current_speaker and structured_content and \
               structured_content[-1]['type'] == 'dialogue':
                # Diyalog devamı
                structured_content[-1]['text'] += ' ' + line.strip()
            else:
                # Aksiyon/Sahne tanımı
                current_speaker = None
                structured_content.append({
                    'type': 'action',
                    'text': line.strip()
                })
    
    # Markdown formatında çıktı üret
    output_lines = []
    for item in structured_content:
        if item['type'] == 'dialogue':
            output_lines.append(f"**{item['speaker']}**: {item['text']}")
        else:
            output_lines.append(f"*{item['text']}*")
    
    return '\n\n'.join(output_lines)


def process_pdf_with_ocr(pdf_path, output_file, apply_dialogue_format=True):
    """
    PDF'i OCR ile işler ve sonucu dosyaya kaydeder.
    
    Args:
        pdf_path: PDF dosyasının yolu
        output_file: Çıktı dosyasının adı
        apply_dialogue_format: Senaryo formatı uygulanacak mı?
    """
    print("=" * 70)
    print("PDF OCR FORMATTER")
    print("=" * 70)
    
    # PDF dosyası kontrolü
    if not os.path.exists(pdf_path):
        print(f"❌ HATA: PDF dosyası bulunamadı: {pdf_path}")
        print(f"   Lütfen PDF_PATH değişkenini düzenleyin veya dosyayı doğru konuma koyun.")
        sys.exit(1)
    
    print(f"📄 PDF dosyası: {pdf_path}")
    print(f"🔍 OCR dili: {OCR_LANG}")
    print(f"📐 Çözünürlük: {DPI} DPI")
    print()
    
    try:
        # PDF'i resimlere dönüştür
        print("⏳ PDF sayfaları resimlere dönüştürülüyor...")
        images = convert_from_path(pdf_path, dpi=DPI)
        print(f"✅ {len(images)} sayfa bulundu")
        print()
        
        # Her sayfayı OCR ile işle
        full_text = ""
        for i, image in enumerate(images, start=1):
            print(f"🔍 Sayfa {i}/{len(images)} OCR ile okunuyor...")
            
            # Tesseract OCR
            page_text = pytesseract.image_to_string(image, lang=OCR_LANG)
            full_text += page_text + "\n\n"
            
            print(f"   ✅ {len(page_text)} karakter okundu")
        
        print()
        print("=" * 70)
        print("📝 METİN TEMİZLEME")
        print("=" * 70)
        
        # Türkçe karakter düzeltme
        print("🔧 Türkçe karakter hataları düzeltiliyor...")
        cleaned_text = fix_turkish_characters(full_text)
        
        # Metin normalleştirme
        print("🔧 Metin normalleştiriliyor...")
        normalized_text = normalize_text(cleaned_text)
        
        # Senaryo formatına çevirme (opsiyonel)
        if apply_dialogue_format:
            print("🔧 Senaryo formatı uygulanıyor...")
            final_text = extract_dialogue(normalized_text)
        else:
            final_text = normalized_text
        
        # Dosyaya kaydet
        print()
        print("=" * 70)
        print("💾 ÇIKTI KAYIT EDİLİYOR")
        print("=" * 70)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# PDF OCR Çıktısı\n\n")
            f.write(f"**Kaynak PDF:** {os.path.basename(pdf_path)}\n\n")
            f.write(f"**İşlenme Tarihi:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")
            f.write(final_text)
        
        print(f"✅ Çıktı kaydedildi: {output_file}")
        print(f"📊 Toplam karakter sayısı: {len(final_text)}")
        print()
        print("🎉 İşlem tamamlandı!")
        
    except Exception as e:
        print()
        print("=" * 70)
        print("❌ HATA OLUŞTU")
        print("=" * 70)
        print(f"Hata mesajı: {str(e)}")
        print()
        print("Olası çözümler:")
        print("1. Tesseract OCR'ın kurulu olduğundan emin olun")
        print("2. Türkçe dil paketinin yüklü olduğunu kontrol edin")
        print("3. Windows kullanıyorsanız tesseract_cmd yolunu kontrol edin")
        print("4. pdf2image için poppler kurulu olmalı (Windows)")
        sys.exit(1)


# ============================================================================
# ANA PROGRAM
# ============================================================================

if __name__ == "__main__":
    # Script'i çalıştır
    process_pdf_with_ocr(
        pdf_path=PDF_PATH,
        output_file=OUTPUT_FILE,
        apply_dialogue_format=True  # False yaparak sadece temizlenmiş metin alabilirsiniz
    )
