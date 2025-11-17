// FocalReader - Content Script
// Odak noktası tabanlı hızlı okuma eklentisi. Web sayfaları ve PDF dosyalarını ORP (Optimal Reading Point) tekniği ile okur.

(function(){
  // PDF.js'in yüklenmesini bekle
  console.log('🔵 Content script loaded');
  if (typeof pdfjsLib !== 'undefined') {
    console.log('✅ PDF.js already available');
    // Worker'ı hemen ayarla
    try {
      if (chrome.runtime?.id) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
        console.log('✅ PDF.js worker configured immediately');
      } else {
        console.warn('⚠️ Extension context not available, will configure worker later');
      }
    } catch (e) {
      console.warn('⚠️ Could not configure worker immediately:', e);
    }
  } else {
    console.log('⏳ PDF.js not yet loaded, will configure later');
  }
  
  const WIDGET_ID = 'spritz-widget-root';

  // Styles enjekte et - CSP bypass
  function injectStyles(){
    if(document.getElementById('spritz-styles')) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'spritz-styles';
      link.href = chrome.runtime.getURL('src/styles.css');
      document.head.appendChild(link);
    } catch (error) {
      console.warn('Style injection failed, using inline styles');
      // Fallback: inline styles
      const style = document.createElement('style');
      style.id = 'spritz-styles-inline';
      style.textContent = `
        #spritz-widget-root{position:fixed;inset:0;z-index:999998;pointer-events:none;}
        #spritz-backdrop{position:fixed;inset:0;background:#000;pointer-events:auto;z-index:1;}
        #spritz-overlay{pointer-events:none;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:transparent;color:#fff;padding:0;border:none;max-width:100%;z-index:2;}
        #spritz-display-container{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:100vw;min-height:150px;z-index:999999;text-align:center;}
        #spritz-display{font-size:52px;text-align:center;font-weight:400;line-height:1.1;font-family:'Courier New',Courier,monospace;letter-spacing:0;display:inline-block;white-space:pre;}
        .spritz-left{color:#888;}
        .spritz-pivot{color:#ffdd44;font-weight:700;}
        .spritz-right{color:#888;}
        #spritz-progress-container{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:500px;text-align:center;z-index:999999;pointer-events:auto;padding-top:25px;}
        #spritz-progress-bar{width:100%;height:4px;background:#2a2a2a;border-radius:2px;cursor:pointer;position:relative;overflow:visible;margin-bottom:6px;pointer-events:auto;}
        #spritz-progress-fill{height:100%;background:#0078d4;border-radius:2px;width:0%;transition:width 0.3s ease-out;pointer-events:none;position:relative;}
        .pdf-page-marker{position:absolute;top:-8px;width:1px;height:calc(100% + 16px);background:#666;opacity:0.6;pointer-events:none;z-index:1;}
        .pdf-page-number{position:absolute;top:-22px;transform:translateX(-50%);font-size:9px;color:#888;font-weight:400;pointer-events:none;white-space:nowrap;}
        #spritz-progress-text{color:#999;font-size:13px;font-weight:400;text-align:center;}
        #spritz-controls{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);text-align:center;padding:15px 25px;background:rgba(0,0,0,0.8);border-radius:8px;border:none;z-index:999999;pointer-events:auto;}
        #spritz-controls button{margin:0 8px;padding:8px 12px;background:#222;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;}
        #spritz-controls button:hover{background:#444;}
        #spritz-controls input[type=number]{width:80px;padding:6px;margin:0 4px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;text-align:center;}
        #spritz-controls label{color:#aaa;font-size:14px;}
        #spritz-dropzone{position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:999999;display:flex;align-items:center;justify-content:center;pointer-events:auto;}
        #spritz-dropzone-content{text-align:center;color:#fff;font-size:24px;padding:40px;border:3px dashed #007bff;border-radius:12px;background:rgba(0,123,255,0.1);cursor:pointer;pointer-events:auto;}
        #spritz-dropzone-content:hover{border-color:#28a745;background:rgba(40,167,69,0.2);}
        #spritz-dropzone-content div:first-child{font-size:64px;margin-bottom:20px;}
        #spritz-dropzone-content div:nth-child(2){font-size:20px;margin-bottom:10px;}
        #spritz-dropzone-content div:last-child{font-size:16px;color:#aaa;}
        #spritz-loading-status{text-align:center;color:#fff;padding:20px;}
        #spritz-loading-icon{font-size:48px;margin-bottom:15px;}
        #spritz-loading-text{font-size:18px;font-weight:600;margin-bottom:10px;}
        #spritz-loading-detail{font-size:14px;color:#aaa;margin-bottom:15px;}
        #spritz-loading-progress{width:300px;height:8px;background:#333;border-radius:4px;margin:0 auto;position:relative;overflow:hidden;}
        #spritz-loading-progress-bar{height:100%;background:linear-gradient(90deg,#007bff,#0056b3);border-radius:4px;width:0%;transition:width 0.3s ease-out;position:relative;}
        #spritz-loading-progress-bar::after{content:attr(data-percent);position:absolute;right:5px;top:50%;transform:translateY(-50%);color:#fff;font-size:10px;font-weight:600;text-shadow:1px 1px 2px rgba(0,0,0,0.8);}
      `;
      document.head.appendChild(style);
    }
  }

  // Background script'ten mesaj dinleyicisi
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      // Eklenti güncellendiğinde sayfa bildirimi
      if (message.action === 'extensionUpdated') {
        console.log('📢 Eklenti güncellendi bildirimi alındı');
        
        // Kullanıcıya bildir ve sayfayı yenile
        const reload = confirm(
          '🔄 Eklenti güncellendi!\n\n' +
          'Bu sayfa eski sürümü kullanıyor.\n\n' +
          'Sayfayı şimdi yenilemek ister misiniz?\n\n' +
          '(İptal ederseniz, eklenti bu sayfada çalışmayabilir)'
        );
        
        if (reload) {
          window.location.reload();
        }
        
        sendResponse({success: true});
        return true;
      }
      
      // Extension context kontrolü
      if (!chrome.runtime?.id) {
        console.error('❌ Extension context invalid - sayfa yenilenecek');
        alert('⚠️ Eklenti güncellenmiş!\n\nSayfa yeniden yükleniyor...');
        setTimeout(() => window.location.reload(), 1000);
        sendResponse({success: false, error: 'Extension context invalid, reloading page'});
        return true;
      }
      
      if (message.action === 'showSpritz') {
        handleMainButtonClick();
        sendResponse({success: true});
      } else if (message.action === 'showFileUploader') {
        // Önce Spritz'i başlat, sonra dropzone'u aç
        showSpritzWidget();
        setTimeout(() => {
          if (window.spritzPlayer) {
            window.spritzPlayer.showDropzone();
          }
        }, 100);
        sendResponse({success: true});
      }
    } catch (error) {
      console.error('Content script message error:', error);
      
      // Extension context hatası varsa sayfayı yenile
      if (error.message && error.message.includes('Extension context')) {
        alert('⚠️ Eklenti güncellenmiş!\n\nSayfa yeniden yükleniyor...');
        setTimeout(() => window.location.reload(), 1000);
      }
      
      sendResponse({success: false, error: error.message});
    }
    
    // Return true to indicate async response
    return true;
  });

  // Ana buton click handler
  async function handleMainButtonClick() {
    const sel = (window.getSelection && window.getSelection().toString()) || '';
    if(sel && sel.trim().length>3){
      startSpritz(sel);
    } else if (isPDFPage()) {
      // PDF sayfası
      try {
        const text = await extractPDFText();
        if(text && text.trim().length > 10) {
          startSpritz(text); 
        } else {
          alert('PDF\'den metin çıkarılamadı - boş veya desteklenmeyen format.');
        }
      } catch(e) {
        console.error('PDF extraction failed:', e);
        alert('PDF okuma hatası: ' + e.message + '\\n\\nAlternatif: Sağ alttaki 📄 butonuna tıklayarak PDF yükleyebilirsiniz.');
      }
    } else {
      // Normal web sayfası için metin çıkarma
      const page = extractReadableText();
      if(page && page.trim().length > 10) {
        startSpritz(page);
      } else {
        alert('Sayfada okunabilir metin bulunamadı. Lütfen bir metin seçin veya 📄 butonu ile dosya yükleyin.');
      }
    }
  }

  // PDF sayfası mı kontrol et
  function isPDFPage() {
    return document.contentType === 'application/pdf' || 
           window.location.href.toLowerCase().endsWith('.pdf') ||
           document.querySelector('embed[type="application/pdf"]') !== null;
  }

  // Dosya yükleyici aç
  function openFileUploader() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.style.display = 'none';
    
    input.onchange = async function(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Lütfen sadece PDF dosyası seçin.');
        return;
      }
      
      try {
        showLoadingIndicator('PDF yükleniyor...');
        const text = await extractTextFromFile(file);
        hideLoadingIndicator();
        
        if (text && text.trim().length > 10) {
          startSpritz(text);
        } else {
          alert('PDF\'den metin çıkarılamadı. Dosya boş olabilir veya metin içermiyor olabilir.');
        }
      } catch (error) {
        hideLoadingIndicator();
        console.error('File processing error:', error);
        alert('Dosya işleme hatası: ' + error.message);
      }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // Drag & Drop desteği
  function setupDragDrop() {
    let dragOverlay = null;
    
    document.addEventListener('dragenter', function(e) {
      e.preventDefault();
      
      if (!dragOverlay) {
        dragOverlay = document.createElement('div');
        dragOverlay.id = 'spritz-drag-overlay';
        dragOverlay.innerHTML = `
          <div style="
            position: fixed;
            inset: 0;
            background: rgba(0, 123, 255, 0.1);
            z-index: 999997;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(2px);
          ">
            <div style="
              background: #007bff;
              color: white;
              padding: 30px 40px;
              border-radius: 12px;
              font-size: 18px;
              font-weight: bold;
              border: 3px dashed white;
              text-align: center;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
              📄 PDF Dosyasını Sürükleyin<br>
              <small style="font-weight: normal; font-size: 14px;">Hızlı okuma için metin çıkarılacak</small>
            </div>
          </div>
        `;
        document.body.appendChild(dragOverlay);
      }
    });
    
    document.addEventListener('dragleave', function(e) {
      if (!e.relatedTarget && dragOverlay) {
        document.body.removeChild(dragOverlay);
        dragOverlay = null;
      }
    });
    
    document.addEventListener('dragover', function(e) {
      e.preventDefault();
    });
    
    document.addEventListener('drop', async function(e) {
      e.preventDefault();
      
      if (dragOverlay) {
        document.body.removeChild(dragOverlay);
        dragOverlay = null;
      }
      
      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter(file => 
        file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')
      );
      
      if (pdfFiles.length === 0) {
        alert('Lütfen PDF dosyası sürükleyin.');
        return;
      }
      
      const file = pdfFiles[0]; // İlk PDF dosyasını al
      
      try {
        showLoadingIndicator('PDF işleniyor...');
        const text = await extractTextFromFile(file);
        hideLoadingIndicator();
        
        if (text && text.trim().length > 10) {
          startSpritz(text);
        } else {
          alert('PDF\'den metin çıkarılamadı.');
        }
      } catch (error) {
        hideLoadingIndicator();
        console.error('Drag drop processing error:', error);
        alert('Dosya işleme hatası: ' + error.message);
      }
    });
  }

  // Dosyadan metin çıkarma
  async function extractTextFromFile(file) {
    console.log('Processing file:', file.name, 'Size:', file.size, 'bytes');
    
    // PDF.js kütüphanesini yükle
    if (!window.pdfjsLib) {
      await loadPDFJS();
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async function(event) {
        try {
          const arrayBuffer = event.target.result;
          console.log('File read complete, processing with PDF.js...');
          
          const text = await extractTextFromPDFBuffer(arrayBuffer);
          resolve(text);
        } catch (error) {
          console.error('PDF processing error:', error);
          reject(new Error('PDF işleme hatası: ' + error.message));
        }
      };
      
      reader.onerror = function() {
        reject(new Error('Dosya okuma hatası'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Yükleme indikatörü göster
  function showLoadingIndicator(message = 'Yükleniyor...') {
    let loader = document.getElementById('spritz-loader');
    if (loader) return;
    
    loader = document.createElement('div');
    loader.id = 'spritz-loader';
    loader.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: #333;
          color: white;
          padding: 20px 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 16px;
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #fff;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          ${message}
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loader);
  }

  // Yükleme indikatörü gizle
  function hideLoadingIndicator() {
    const loader = document.getElementById('spritz-loader');
    if (loader) {
      document.body.removeChild(loader);
    }
  }

  // PDF'den metin çıkarma - Basit ve güvenilir yaklaşım
  async function extractPDFText(){
    try{
      const url = window.location.href;
      console.log('PDF extraction starting for:', url);
      
      // PDF.js kütüphanesini yükle
      if (!window.pdfjsLib) {
        console.log('Loading PDF.js library...');
        await loadPDFJS();
      }
      
      let pdfArrayBuffer;
      
      if (url.startsWith('file://')) {
        console.log('Local file detected, using XMLHttpRequest...');
        
        // XMLHttpRequest ile yerel dosya okuma
        pdfArrayBuffer = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.responseType = 'arraybuffer';
          xhr.onload = () => {
            if (xhr.status === 200 || xhr.status === 0) {
              console.log('XHR successful, data size:', xhr.response.byteLength);
              resolve(xhr.response);
            } else {
              reject(new Error(`XHR failed with status: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Yerel dosya okuma başarısız - dosya izinlerini kontrol edin'));
          xhr.send();
        });
        
      } else {
        // HTTP/HTTPS URL için normal fetch
        console.log('Remote URL, using fetch...');
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        pdfArrayBuffer = await response.arrayBuffer();
        console.log('Remote fetch successful, data size:', pdfArrayBuffer.byteLength);
      }
      
      // PDF.js ile metni çıkar
      console.log('Starting PDF text extraction with PDF.js...');
      const text = await extractTextFromPDFBuffer(pdfArrayBuffer);
      console.log('PDF parsing completed, text length:', text ? text.length : 0);
      return text;
      
    } catch(err) {
      console.error('extractPDFText error:', err);
      throw err;
    }
  }

  // PDF.js ile PDF buffer'ından metin çıkarma
  async function extractTextFromPDFBuffer(arrayBuffer) {
    try {
      console.log('Loading PDF with PDF.js...');
      const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Türkçe karakterleri düzgün çıkarmak için gelişmiş işleme
        const pageText = textContent.items.map(item => {
          let str = item.str || '';
          
          // Boş veya sadece whitespace içeren stringleri atla
          if (!str || !str.trim()) return '';
          
          // NFC normalizasyonu
          str = str.normalize('NFC');
          
          // KAPSAMLI Türkçe karakter haritası
          const turkishCharMap = {
            // Temel Türkçe karakterler
            '\u0131': 'ı', '\u0130': 'İ',
            '\u015F': 'ş', '\u015E': 'Ş',
            '\u011F': 'ğ', '\u011E': 'Ğ',
            '\u00E7': 'ç', '\u00C7': 'Ç',
            '\u00FC': 'ü', '\u00DC': 'Ü',
            '\u00F6': 'ö', '\u00D6': 'Ö',
            // Latin-1 encoding hataları (yaygın PDF sorunu)
            'Ä±': 'ı', 'Ä°': 'İ',
            'ÅŸ': 'ş', 'Åž': 'Ş',
            'Ä\u009F': 'ğ', 'Ä\u009E': 'Ğ',
            // UTF-8 çift encoding hataları
            'Ã§': 'ç', 'Ã\u0087': 'Ç',
            'Ã¼': 'ü', 'Ã\u009c': 'Ü',
            'Ã¶': 'ö', 'Ã\u0096': 'Ö',
            'Ä\u00B1': 'ı', 'Ä°': 'İ',
            'Å\u009F': 'ş', 'Å\u009E': 'Ş',
            'Ä\u009F': 'ğ', 'Ä\u009E': 'Ğ',
            // Bozuk karakterleri boşluk ile değiştir
            '\uFFFD': ' ', // Replacement character
            '\u0000': '', // Null character
            '\u00A0': ' ', // Non-breaking space -> normal space
          };
          
          // Karakter haritasını uygula
          Object.keys(turkishCharMap).forEach(key => {
            if (str.includes(key)) {
              const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              str = str.replace(regex, turkishCharMap[key]);
            }
          });
          
          // Kontrol karakterlerini temizle (ASCII 0-31, 127)
          str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
          
          // Birden fazla boşluğu tek boşluğa indir
          str = str.replace(/\s+/g, ' ').trim();
          
          return str;
        }).filter(s => s.length > 0).join(' ');
        
        // Satır sonu tire birleştirme
        let cleanedText = pageText.replace(/(\w+)-\s+(\w+)/g, '$1$2');
        
        // Türkçe karakterlerin etrafındaki boşlukları temizle
        // "u ş ak" -> "uşak", "aya ğ a" -> "ayağa"
        // Harf + boşluk + TEK Türkçe karakter + boşluk + harf
        cleanedText = cleanedText.replace(/([a-zğüşıöç]+)\s+([ğüşıöçĞÜŞİÖÇ])\s+([a-zğüşıöç]+)/gi, '$1$2$3');
        
        fullText += cleanedText + ' ';
      }      console.log('Text extraction completed, total length:', fullText.length);
      return fullText.trim();
      
    } catch (error) {
      console.error('PDF.js parsing error:', error);
      throw new Error(`PDF parsing başarısız: ${error.message}`);
    }
  }

  // PDF.js kütüphanesini yükle
  async function loadPDFJS() {
    // PDF.js artık manifest'te content_scripts ile birlikte yükleniyor
    return new Promise((resolve, reject) => {
      console.log('📚 Checking PDF.js availability...');
      
      // window.pdfjsLib veya global pdfjsLib kontrol et
      const lib = window.pdfjsLib || (typeof pdfjsLib !== 'undefined' ? pdfjsLib : null);
      
      if (lib && lib.GlobalWorkerOptions) {
        console.log('✅ PDF.js already available');
        try {
          // Extension context kontrolü
          if (!chrome.runtime?.id) {
            console.error('❌ Extension context invalid - sayfa yenilenmeli');
            reject(new Error('Eklenti bağlantısı kesildi. Lütfen sayfayı yenileyin (F5).'));
            return;
          }
          
          const workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
          lib.GlobalWorkerOptions.workerSrc = workerSrc;
          console.log('✅ PDF.js worker configured:', workerSrc);
          // Global referansı güncelle
          if (!window.pdfjsLib) window.pdfjsLib = lib;
          resolve();
        } catch (error) {
          console.error('❌ Worker configuration failed:', error);
          if (error.message && error.message.includes('Extension context')) {
            reject(new Error('Eklenti yeniden yüklendi. Lütfen sayfayı yenileyin (F5).'));
          } else {
            reject(new Error('PDF.js worker ayarlanamadı: ' + error.message));
          }
        }
        return;
      }
      
      // PDF.js henüz hazır değilse bekle
      let attempts = 0;
      const maxAttempts = 30; // 3 saniye max
      
      const checkLibrary = () => {
        attempts++;
        
        const lib = window.pdfjsLib || (typeof pdfjsLib !== 'undefined' ? pdfjsLib : null);
        
        if (lib && lib.GlobalWorkerOptions) {
          console.log('✅ PDF.js library ready, configuring worker...');
          try {
            // Extension context kontrolü
            if (!chrome.runtime?.id) {
              console.error('❌ Extension context invalid - sayfa yenilenmeli');
              reject(new Error('Eklenti bağlantısı kesildi. Lütfen sayfayı yenileyin (F5).'));
              return;
            }
            
            const workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
            lib.GlobalWorkerOptions.workerSrc = workerSrc;
            console.log('✅ PDF.js worker configured:', workerSrc);
            // Global referansı güncelle
            if (!window.pdfjsLib) window.pdfjsLib = lib;
            resolve();
          } catch (error) {
            console.error('❌ Worker configuration failed:', error);
            if (error.message && error.message.includes('Extension context')) {
              reject(new Error('Eklenti yeniden yüklendi. Lütfen sayfayı yenileyin (F5).'));
            } else {
              reject(new Error('PDF.js worker ayarlanamadı: ' + error.message));
            }
          }
        } else if (attempts >= maxAttempts) {
          console.error('❌ PDF.js not loaded after', attempts * 100, 'ms');
          console.error('Debug: window.pdfjsLib =', window.pdfjsLib);
          console.error('Debug: typeof pdfjsLib =', typeof pdfjsLib);
          reject(new Error('PDF.js kütüphanesi yüklenemedi. Sayfayı yenileyin veya eklentiyi yeniden yükleyin.'));
        } else {
          console.log(`⏳ Waiting for PDF.js... (${attempts}/${maxAttempts})`);
          setTimeout(checkLibrary, 100);
        }
      };
      
      checkLibrary();
    });
  }

  // Dosyadan metin çıkarma
  async function extractTextFromFile(file) {
    console.log('Processing file:', file.name, 'Size:', file.size, 'bytes');
    
    // PDF.js kütüphanesini yükle
    if (!window.pdfjsLib) {
      await loadPDFJS();
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async function(event) {
        try {
          const arrayBuffer = event.target.result;
          console.log('File read complete, processing with PDF.js...');
          
          const text = await extractTextFromPDFBuffer(arrayBuffer);
          resolve(text);
        } catch (error) {
          console.error('PDF processing error:', error);
          reject(new Error('PDF işleme hatası: ' + error.message));
        }
      };
      
      reader.onerror = function() {
        reject(new Error('Dosya okuma hatası'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  // Yükleme indikatorü göster
  function showLoadingIndicator(message = 'Yükleniyor...') {
    let loader = document.getElementById('spritz-loader');
    if (loader) return;
    
    loader = document.createElement('div');
    loader.id = 'spritz-loader';
    loader.innerHTML = `
      <div style="
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background: #333;
          color: white;
          padding: 20px 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 16px;
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #fff;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          ${message}
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loader);
  }

  // Yükleme indikatorü gizle
  function hideLoadingIndicator() {
    const loader = document.getElementById('spritz-loader');
    if (loader) {
      document.body.removeChild(loader);
    }
  }

  // Basit readable text çıkarma (seçim yoksa)
  function extractReadableText(){
    // Öncelik: article tag'i, main tag'i, sonra body.innerText
    const article = document.querySelector('article');
    if(article) return article.innerText;
    const main = document.querySelector('main');
    if(main) return main.innerText;
    // Son çare: body (script ve style taglerini hariç tut)
    const scripts = document.querySelectorAll('script, style, nav, footer, header');
    scripts.forEach(el => el.style.display = 'none');
    const text = document.body.innerText;
    scripts.forEach(el => el.style.display = '');
    return text;
  }

  // Helper: HTML escape
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Widget göster (metin olmadan)
  function showSpritzWidget(){
    const existing = document.getElementById(WIDGET_ID);
    if(existing) return; // Zaten açık
    
    const container = document.createElement('div');
    container.id = WIDGET_ID;
    document.body.appendChild(container);
    
    const player = new SpritzPlayer(container);
    window.spritzPlayer = player; // Global olarak sakla
  }

  // Spritz okuma başlat
  async function startSpritz(text){
    const existing = document.getElementById(WIDGET_ID);
    if(existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = WIDGET_ID;
    document.body.appendChild(container);
    
    const player = new SpritzPlayer(container);
    window.spritzPlayer = player; // Global olarak sakla
    
    // Ayarların yüklenmesini bekle
    if (!player.settingsLoaded) {
      await player.loadSettings();
    }
    
    // Orijinal metni sakla
    player.originalText = text;
    
    // Metni cümlelere ayır ve filtrele
    console.log('🌐 Web metni filtreleniyor...');
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    console.log(`📋 Toplam ${sentences.length} cümle bulundu`);
    console.log('🔍 excludeWords değeri:', player.excludeWords);
    
    const filteredSentences = player.filterSentences(sentences);
    const excludedCount = sentences.length - filteredSentences.length;
    console.log(`✅ ${filteredSentences.length} cümle kaldı (${excludedCount} cümle hariç tutuldu)`);
    
    const filteredText = filteredSentences.join('. ');
    player.filteredText = filteredText;
    
    // Web içeriği için sayfa markerları oluştur (250 kelime = 1 sayfa)
    player.calculateWebPageBoundaries(filteredText);
    
    // UI hazır olana kadar kısa gecikme
    setTimeout(() => {
      player.setText(filteredText);
      player.play();
    }, 50);
  }

  // Spritz oynatıcı: basit implementasyon
  class SpritzPlayer{
    constructor(container){
      this.container = container;
      this.wpm = 250; // Varsayılan, ayarlardan yüklenir
      this.selectedFont = 'georgia'; // Varsayılan font
      this.excludeWords = ''; // Hariç tutulacak kelimeler
      this.speedMultiplier = 1; // Hız çarpanı
      this.interval = null;
      this.words = [];
      this.index = 0;
      this.isPlaying = false;
      this.displayEl = null;
      this.settingsLoaded = false;
      this.originalText = ''; // Orijinal metin (filtrelenmemiş)
      this.filteredText = ''; // Filtrelenmiş metin
      this.pdfPageBoundaries = []; // PDF sayfa sınırları (kelime indexleri)
      
      // Kazanım takibi
      this.sessionStartTime = null; // Oturum başlangıç
      this.sessionWordsRead = 0; // Bu oturumda okunan kelime sayısı
      
      this.loadSettings(); // Ayarları yükle
    }
    
    // Kullanıcı ayarlarını yükle
    async loadSettings(){
      return new Promise((resolve) => {
        chrome.storage.sync.get(['defaultWPM', 'selectedFont', 'excludeWords', 'showGains'], (res) => {
          this.wpm = res.defaultWPM || 250;
          this.selectedFont = res.selectedFont || 'georgia';
          this.excludeWords = res.excludeWords || '';
          this.showGains = res.showGains !== false; // Varsayılan: true
          this.settingsLoaded = true;
          console.log('📋 Ayarlar yüklendi - WPM:', this.wpm, 'excludeWords:', this.excludeWords ? `"${this.excludeWords}"` : '(boş)');
          this.setupUI(); // UI'yi ayarlarla birlikte kur
          resolve();
        });
      });
    }
    // Font seçimi fonksiyonu
    getFontFamily(fontKey) {
      const fonts = {
        'system': 'system-ui, -apple-system, sans-serif',
        'georgia': 'Georgia, "Times New Roman", serif',
        'verdana': 'Verdana, Geneva, sans-serif', 
        'arial': 'Arial, Helvetica, sans-serif',
        'times': '"Times New Roman", Times, serif',
        'helvetica': 'Helvetica, Arial, sans-serif',
        'opensans': '"Open Sans", Arial, sans-serif'
      };
      return fonts[fontKey] || fonts['georgia'];
    }
    
    setupUI(){
      this.container.innerHTML = `
        <div id="spritz-backdrop"></div>
        <div id="spritz-overlay">
          <div id="spritz-display-container">
            <div id="spritz-display" aria-live="polite"></div>
          </div>
        </div>
        <div id="spritz-progress-container">
          <div id="spritz-progress-bar">
            <div id="spritz-progress-fill"></div>
            <div id="spritz-progress-text">0%</div>
          </div>
        </div>
        <div id="spritz-controls">
          <button id="spritz-start" type="button" title="Başa sar">⏮️</button>
          <button id="spritz-backward" type="button" title="10 kelime geri">⏪</button>
          <button id="spritz-play" type="button" title="Oynat">▶</button>
          <button id="spritz-pause" type="button" title="Duraklat">⏸</button>
          <button id="spritz-forward" type="button" title="10 kelime ileri">⏩</button>
          <button id="spritz-end" type="button" title="Sona git">⏭️</button>
          <label>WPM <input id="spritz-wpm" type="number" min="50" max="2000" value="${this.wpm}"></label>
          <select id="spritz-speed" title="Hız çarpanı">
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
          <button id="spritz-upload" type="button" title="PDF Yükle">📄 PDF</button>
          <button id="spritz-preview" type="button" title="Metin Önizle">📝</button>
          <button id="spritz-close" type="button" title="Kapat">✕</button>
        </div>
        <div id="spritz-dropzone" style="display: none;">
          <div id="spritz-dropzone-content">
            <div>📄</div>
            <div>PDF dosyanızı buraya sürükleyin</div>
            <div>veya tıklayarak seçin</div>
          </div>
          <div id="spritz-loading-status" style="display: none;">
            <div id="spritz-loading-icon">⏳</div>
            <div id="spritz-loading-text">PDF yükleniyor...</div>
            <div id="spritz-loading-detail"></div>
            <div id="spritz-loading-progress">
              <div id="spritz-loading-progress-bar"></div>
            </div>
          </div>
        </div>
        <div id="spritz-text-preview" style="display: none;">
          <div id="spritz-preview-content">
            <div id="spritz-preview-header">
              <h3>📝 Metin Önizleme</h3>
              <button id="spritz-preview-close" type="button">✕</button>
            </div>
            <div id="spritz-preview-stats"></div>
            <div id="spritz-preview-exclude">
              <div class="exclude-header">
                <label>🚫 Hariç Tutulacak Kelimeler/Cümleler:</label>
                <button id="spritz-exclude-save" type="button">✔️ Kaydet</button>
              </div>
              <textarea id="spritz-exclude-textarea" placeholder="Virgülle ayrılmış kelimeler girin: reklam,ilan,kampanya..."></textarea>
              <div class="exclude-actions">
                <button id="spritz-exclude-selection" type="button" title="Seçili metni hariç tut">➕ Seçili Metni Ekle</button>
                <button id="spritz-exclude-clear" type="button" title="Temizle">🗑️ Temizle</button>
              </div>
            </div>
            <div id="spritz-preview-tabs">
              <button class="preview-tab active" data-tab="original">📄 Orijinal Metin</button>
              <button class="preview-tab" data-tab="filtered">✅ Filtrelenmiş Metin</button>
            </div>
            <div id="spritz-preview-body">
              <div class="preview-tab-content active" data-content="original"></div>
              <div class="preview-tab-content" data-content="filtered"></div>
            </div>
          </div>
        </div>
      `;
      this.displayEl = this.container.querySelector('#spritz-display');
      this.progressBar = this.container.querySelector('#spritz-progress-bar');
      this.progressFill = this.container.querySelector('#spritz-progress-fill');
      this.progressText = this.container.querySelector('#spritz-progress-text');
      
      // Event listeners
      this.container.querySelector('#spritz-start').addEventListener('click', ()=>this.goToStart());
      this.container.querySelector('#spritz-backward').addEventListener('click', ()=>this.skipBackward(10));
      this.container.querySelector('#spritz-play').addEventListener('click', ()=>this.play());
      this.container.querySelector('#spritz-pause').addEventListener('click', ()=>this.pause());
      this.container.querySelector('#spritz-forward').addEventListener('click', ()=>this.skipForward(10));
      this.container.querySelector('#spritz-end').addEventListener('click', ()=>this.goToEnd());
      this.container.querySelector('#spritz-close').addEventListener('click', ()=>this.stop());
      this.container.querySelector('#spritz-wpm').addEventListener('change', (e)=>{ 
        this.wpm = Number(e.target.value); 
        // WPM manuel değiştirildiğinde hız çarpanını sıfırla
        this.speedMultiplier = 1;
        const speedSelect = this.container.querySelector('#spritz-speed');
        if(speedSelect) speedSelect.value = '1';
        if(this.isPlaying) this.restartInterval(); 
      });
      this.container.querySelector('#spritz-speed').addEventListener('change', (e)=>{ this.setSpeedMultiplier(Number(e.target.value)); });
      
      // PDF Upload butonu
      this.container.querySelector('#spritz-upload').addEventListener('click', ()=>this.showDropzone());
      
      // Metin önizleme butonu
      this.container.querySelector('#spritz-preview').addEventListener('click', ()=>this.showTextPreview());
      
      // Metin önizleme butonu
      this.container.querySelector('#spritz-preview').addEventListener('click', ()=>this.showTextPreview());
      
      // Progress bar click handler
      this.container.querySelector('#spritz-progress-bar').addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newIndex = Math.floor(percentage * this.words.length);
        this.index = Math.max(0, Math.min(newIndex, this.words.length - 1));
        this.updateProgress();
        if (!this.isPlaying) {
          this.showWord(this.words[this.index]);
        }
      });
      
      // Dropzone event handlers
      this.setupDropzoneEvents();
    }
    
    showDropzone() {
      const dropzone = this.container.querySelector('#spritz-dropzone');
      if (dropzone) {
        console.log('Showing dropzone');
        dropzone.style.display = 'flex';
      } else {
        console.error('Dropzone element not found');
      }
    }
    
    hideDropzone() {
      const dropzone = this.container.querySelector('#spritz-dropzone');
      if (dropzone) {
        console.log('Hiding dropzone');
        dropzone.style.display = 'none';
      }
      this.hideLoadingStatus();
    }
    
    showLoadingStatus(mainText, detailText) {
      const dropContent = this.container.querySelector('#spritz-dropzone-content');
      const loadingStatus = this.container.querySelector('#spritz-loading-status');
      const loadingText = this.container.querySelector('#spritz-loading-text');
      const loadingDetail = this.container.querySelector('#spritz-loading-detail');
      
      if (dropContent) dropContent.style.display = 'none';
      if (loadingStatus) loadingStatus.style.display = 'block';
      if (loadingText) loadingText.textContent = mainText;
      if (loadingDetail) loadingDetail.textContent = detailText || '';
    }
    
    hideLoadingStatus() {
      const dropContent = this.container.querySelector('#spritz-dropzone-content');
      const loadingStatus = this.container.querySelector('#spritz-loading-status');
      
      if (dropContent) dropContent.style.display = 'block';
      if (loadingStatus) loadingStatus.style.display = 'none';
      
      // Progress'i sıfırla
      const progressBar = this.container.querySelector('#spritz-loading-progress-bar');
      if (progressBar) progressBar.style.width = '0%';
    }
    
    updateLoadingProgress(percent, detailText) {
      const progressBar = this.container.querySelector('#spritz-loading-progress-bar');
      const loadingDetail = this.container.querySelector('#spritz-loading-detail');
      
      if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.setAttribute('data-percent', Math.round(percent) + '%');
      }
      if (loadingDetail && detailText) {
        loadingDetail.textContent = detailText;
      }
    }
    
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    setupDropzoneEvents() {
      const dropzone = this.container.querySelector('#spritz-dropzone');
      const dropContent = this.container.querySelector('#spritz-dropzone-content');
      
      if (!dropzone || !dropContent) {
        console.warn('Dropzone elements not found');
        return;
      }
      
      // Click to select file
      dropContent.addEventListener('click', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,application/pdf';
        input.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handlePDFFile(e.target.files[0]);
          }
        });
        input.click();
      });
      
      // Drag & Drop events
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropContent.style.borderColor = '#28a745';
        dropContent.style.background = 'rgba(40,167,69,0.2)';
      });
      
      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropContent.style.borderColor = '#007bff';
        dropContent.style.background = 'rgba(0,123,255,0.1)';
      });
      
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.hideDropzone();
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
          this.handlePDFFile(files[0]);
        } else {
          alert('Lütfen sadece PDF dosyası yükleyin.');
        }
      });
      
      // Close dropzone when clicking outside content
      dropzone.addEventListener('click', (e) => {
        if (e.target === dropzone) {
          this.hideDropzone();
        }
      });
    }
    
    async handlePDFFile(file) {
      console.log('🔴 handlePDFFile BAŞLADI:', file.name, file.type);
      
      // Ayarların yüklendiğinden emin ol
      if (!this.settingsLoaded) {
        console.log('⏳ Ayarlar henüz yüklenmemiş, yükleniyor...');
        await this.loadSettings();
      }
      console.log('✅ Ayarlar hazır - excludeWords:', this.excludeWords);
      
      // Loading ekranını göster
      this.showLoadingStatus('📁 Adım 1/7: Dosya kontrol ediliyor...', file.name + ' (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)');
      
      try {
        // Dosya tip kontrolü
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
          console.error('❌ Geçersiz dosya tipi:', file.type);
          this.showLoadingStatus('❌ Hata', 'Lütfen sadece PDF dosyası seçin');
          setTimeout(() => this.hideLoadingStatus(), 2000);
          return;
        }
        console.log('✅ Dosya tipi doğru');
        await this.sleep(300);
        this.updateLoadingProgress(10, '✓ Dosya formatı doğrulandı');
        this.showLoadingStatus('✅ Adım 1/7: Dosya doğrulandı', 'PDF formatı onaylandı');
        
        await this.sleep(400);
        console.log('📖 PDF dosyası okunuyor...');
        this.showLoadingStatus('💾 Adım 2/7: Dosya belleğe yükleniyor...', `${(file.size / 1024).toFixed(1)} KB okunuyor`);
        this.updateLoadingProgress(15, 'Dosya okunuyor...');
        
        const arrayBuffer = await file.arrayBuffer();
        console.log('✅ ArrayBuffer hazır, boyut:', arrayBuffer.byteLength, 'bytes');
        await this.sleep(300);
        this.updateLoadingProgress(30, '✓ ' + (arrayBuffer.byteLength / 1024).toFixed(1) + ' KB belleğe yüklendi');
        this.showLoadingStatus('✅ Adım 2/7: Dosya yüklendi', 'Belleğe aktarım tamamlandı');
        
        // PDF.js hazır mı kontrol et (manifest'te yüklendi)
        await this.sleep(200);
        console.log('📚 PDF.js hazır mı kontrol ediliyor...');
        this.showLoadingStatus('📚 Adım 3/7: PDF motoru kontrol ediliyor...', 'PDF.js hazırlığı doğrulanıyor');
        this.updateLoadingProgress(35, 'Motor kontrol ediliyor...');
        
        try {
          await loadPDFJS();
          console.log('✅ PDF.js hazır');
          await this.sleep(150);
          this.updateLoadingProgress(50, '✓ PDF.js motoru hazır');
          this.showLoadingStatus('✅ Adım 3/7: PDF motoru hazır', 'PDF.js kullanıma hazır');
        } catch (loadError) {
          console.error('❌ PDF.js hazırlık hatası:', loadError);
          throw new Error('PDF.js hazır değil: ' + loadError.message + '\n\nSayfayı yenileyin veya eklentiyi yeniden yükleyin.');
        }
        
        await this.sleep(400);
        console.log('🔍 PDF dökümanı parse ediliyor...');
        this.showLoadingStatus('🔍 Adım 4/7: PDF yapısı analiz ediliyor...', 'Döküman parse ediliyor');
        this.updateLoadingProgress(55, 'PDF analiz ediliyor...');
        
        const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
        console.log('✅ PDF yüklendi! Sayfa sayısı:', pdf.numPages);
        await this.sleep(300);
        this.updateLoadingProgress(60, `✓ ${pdf.numPages} sayfa tespit edildi`);
        this.showLoadingStatus('✅ Adım 4/7: PDF analiz tamamlandı', `${pdf.numPages} sayfa bulundu`);
        
        let fullText = '';
        let pageBoundaries = []; // Her sayfanın başladığı karakter indexi
        await this.sleep(400);
        console.log('📄 Sayfalar işleniyor...');
        this.showLoadingStatus('📄 Adım 5/7: Sayfalardan metin çıkarılıyor...', `0/${pdf.numPages} sayfa işlendi`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
          console.log(`   Sayfa ${i}/${pdf.numPages} işleniyor...`);
          
          // Bu sayfanın başladığı karakter indexini kaydet
          if (i > 1) { // İlk sayfa zaten 0'dan başlar
            pageBoundaries.push(fullText.length);
          }
          
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Türkçe karakterleri düzgün çıkarmak için gelişmiş işleme
          const pageText = textContent.items.map(item => {
            let str = item.str || '';
            
            // Boş veya sadece whitespace içeren stringleri atla
            if (!str || !str.trim()) return '';
            
            // NFC normalizasyonu
            str = str.normalize('NFC');
            
            // KAPSAMLI Türkçe karakter haritası
            const turkishCharMap = {
              // Temel Türkçe karakterler
              '\u0131': 'ı', '\u0130': 'İ',
              '\u015F': 'ş', '\u015E': 'Ş',
              '\u011F': 'ğ', '\u011E': 'Ğ',
              '\u00E7': 'ç', '\u00C7': 'Ç',
              '\u00FC': 'ü', '\u00DC': 'Ü',
              '\u00F6': 'ö', '\u00D6': 'Ö',
              // Latin-1 encoding hataları (yaygın PDF sorunu)
              'Ä±': 'ı', 'Ä°': 'İ',
              'ÅŸ': 'ş', 'Åž': 'Ş',
              'Ä\u009F': 'ğ', 'Ä\u009E': 'Ğ',
              // UTF-8 çift encoding hataları
              'Ã§': 'ç', 'Ã\u0087': 'Ç',
              'Ã¼': 'ü', 'Ã\u009c': 'Ü',
              'Ã¶': 'ö', 'Ã\u0096': 'Ö',
              'Ä\u00B1': 'ı', 'Ä°': 'İ',
              'Å\u009F': 'ş', 'Å\u009E': 'Ş',
              'Ä\u009F': 'ğ', 'Ä\u009E': 'Ğ',
              // Bozuk karakterleri boşluk ile değiştir
              '\uFFFD': ' ', // Replacement character
              '\u0000': '', // Null character
              '\u00A0': ' ', // Non-breaking space -> normal space
            };
            
            // Karakter haritasını uygula
            Object.keys(turkishCharMap).forEach(key => {
              if (str.includes(key)) {
                const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                str = str.replace(regex, turkishCharMap[key]);
              }
            });
            
            // Kontrol karakterlerini temizle (ASCII 0-31, 127)
            str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
            
            // Birden fazla boşluğu tek boşluğa indir
            str = str.replace(/\s+/g, ' ').trim();
            
            return str;
          }).filter(s => s.length > 0).join(' ');
          
          // Satır sonu tire birleştirme
          let cleanedText = pageText.replace(/(\w+)-\s+(\w+)/g, '$1$2');
          
          // Türkçe karakterlerin etrafındaki boşlukları temizle
          // "u ş ak" -> "uşak", "aya ğ a" -> "ayağa"
          // Harf + boşluk + TEK Türkçe karakter + boşluk + harf
          cleanedText = cleanedText.replace(/([a-zğüşıöç]+)\s+([ğüşıöçĞÜŞİÖÇ])\s+([a-zğüşıöç]+)/gi, '$1$2$3');
          
          console.log(`   ✅ Sayfa ${i} - ${cleanedText.length} karakter`);
          fullText += cleanedText + ' ';
          
          // Progress güncelle
          const progress = 60 + (i / pdf.numPages) * 25; // 60-85 arası
          const percentText = `${((i / pdf.numPages) * 100).toFixed(0)}% tamamlandı`;
          this.updateLoadingProgress(progress, `✓ Sayfa ${i}/${pdf.numPages} - ${cleanedText.length} karakter`);
          this.showLoadingStatus(
            `📄 Adım 5/7: Sayfa ${i}/${pdf.numPages} işleniyor...`, 
            `${fullText.length.toLocaleString()} karakter çıkarıldı (${percentText})`
          );
          
          // Her sayfa arasında kısa bekleme (kullanıcı ilerlemeyi görebilsin)
          if (i < pdf.numPages) await this.sleep(100);
        }
        
        console.log('✅ TÜM METİN ÇIKARILDI! Toplam karakter:', fullText.length);
        
        if (fullText && fullText.trim().length > 10) {
          await this.sleep(400);
          console.log('🎯 Metin ayarlanıyor ve oynatma başlatılıyor...');
          console.log('📝 İlk 100 karakter:', fullText.trim().substring(0, 100));
          
          // Orijinal metni sakla
          this.originalText = fullText.trim();
          
          this.updateLoadingProgress(87, '✓ Metin çıkarma tamamlandı');
          this.showLoadingStatus(
            '📦 Adım 6/7: Metin işleniyor...', 
            `${pdf.numPages} sayfa, ${fullText.length.toLocaleString()} karakter`
          );
          
          await this.sleep(300);
          this.updateLoadingProgress(92, 'Kelimeler ayrıştırılıyor ve filtreleniyor...');
          
          // Metni cümlelere ayır ve filtrele
          console.log('📖 Metin cümlelere ayrılıyor...');
          const sentences = this.originalText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
          console.log(`📋 Toplam ${sentences.length} cümle bulundu`);
          console.log('🔍 excludeWords değeri:', this.excludeWords);
          
          const filteredSentences = this.filterSentences(sentences);
          console.log(`✅ ${filteredSentences.length} cümle kaldı (${sentences.length - filteredSentences.length} cümle hariç tutuldu)`);
          
          // Filtrelenmiş metni sakla ve setText'e gönder
          this.filteredText = filteredSentences.join('. ');
          this.setText(this.filteredText);
          
          // PDF sayfa sınırlarını kelime indexlerine çevir
          console.log('📊 PDF sayfa sınırları hesaplanıyor...');
          this.pdfPageBoundaries = this.calculatePageBoundaries(pageBoundaries, fullText.trim(), this.originalText);
          console.log('✅ Sayfa sınırları:', this.pdfPageBoundaries);
          
          // İlerleme çubuğuna sayfa markerlarını ekle
          this.renderPageMarkers();
          
          await this.sleep(300);
          const excludedCount = sentences.length - filteredSentences.length;
          const excludeInfo = excludedCount > 0 ? ` (🚫 ${excludedCount} cümle hariç tutuldu)` : '';
          this.updateLoadingProgress(97, `✓ ${this.words.length.toLocaleString()} kelime hazırlandı${excludeInfo}`);
          this.showLoadingStatus(
            '✅ Adım 6/7: Metin hazır!', 
            `${this.words.length.toLocaleString()} kelime okumaya hazır${excludeInfo}`
          );
          
          await this.sleep(500);
          this.updateLoadingProgress(100, '✓ Tamamlandı!');
          this.showLoadingStatus(
            '🎉 Adım 7/7: Okuma başlatılıyor!', 
            `${pdf.numPages} sayfa, ${this.words.length.toLocaleString()} kelime${excludeInfo}`
          );
          
          await this.sleep(800);
          this.hideDropzone();
          console.log('▶️ PLAY çağrılıyor...');
          this.play();
        } else {
          console.error('❌ Metin çıkarılamadı! Text length:', fullText.length);
          this.showLoadingStatus('❌ Hata', 'PDF\'den metin çıkarılamadı');
          setTimeout(() => {
            alert('PDF\'den metin çıkarılamadı. PDF boş olabilir veya taranmış görüntü içeriyor olabilir.');
            this.hideLoadingStatus();
          }, 1000);
        }
      } catch (error) {
        console.error('❌ PDF İŞLEME HATASI:', error);
        console.error('Hata detayı:', error.stack);
        
        // Kullanıcı dostu hata mesajı
        let userMessage = error.message || 'Bilinmeyen hata';
        let solution = '';
        
        if (error.message && error.message.includes('Extension context')) {
          solution = '\n\n🔄 Çözüm: Sayfayı yenileyin (F5)';
        } else if (error.message && error.message.includes('sayfayı yenileyin')) {
          solution = '\n\n🔄 Çözüm: Sayfayı yenileyin (F5)';
        } else if (error.message && error.message.includes('worker')) {
          solution = '\n\n🔄 Çözüm: Eklentiyi yeniden yükleyin';
        }
        
        this.showLoadingStatus('❌ Hata oluştu', userMessage);
        setTimeout(() => {
          alert('❌ PDF okuma hatası!\n\n' + userMessage + solution);
          this.hideDropzone();
        }, 1000);
      }
    }
    
    setText(text){
      if (!text || typeof text !== 'string') {
        console.error('setText: invalid text', text);
        return;
      }
      
      console.log('📝 setText çağrıldı - text length:', text.length);
      console.log('📋 Mevcut excludeWords:', this.excludeWords ? `"${this.excludeWords}"` : '(boş)');
      console.log('⚙️ Settings loaded:', this.settingsLoaded);
      
      // Metni kelimelere ayır (metin zaten filtrelenmiş olarak gelir - PDF'den veya web'den)
      const cleaned = text.replace(/\s+/g,' ').trim();
      this.words = cleaned.split(' ').filter(word => word.trim().length > 0);
      this.index = 0;
      
      console.log('✅ HAZIR! Toplam kelime:', this.words.length)
      
      // PDF markerlarını güncelle (eğer PDF ise)
      if (this.pdfPageBoundaries && this.pdfPageBoundaries.length > 0) {
        this.renderPageMarkers();
      }
      
      // İlk kelimeyi göster ve progress'i başlat
      if (this.words.length > 0) {
        console.log('📝 İlk kelime gösteriliyor:', this.words[0]);
        this.showWord(this.words[0]);
      } else {
        console.error('❌ Kelime bulunamadı!');
      }
    }
    
    // cleanPDFTextContent fonksiyonu kaldırıldı
    
    filterSentences(sentences) {
      console.log('🔍 filterSentences çağrıldı');
      console.log('   excludeWords değeri:', this.excludeWords);
      
      if (!this.excludeWords || this.excludeWords.trim() === '') {
        console.log('   ℹ️ excludeWords boş, filtreleme yapılmıyor');
        return sentences;
      }
      
      // Hariç tutulacak kelimeleri virgülle ayır ve temizle
      const excludeList = this.excludeWords
        .split(',')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
      
      if (excludeList.length === 0) {
        console.log('   ℹ️ excludeList boş, filtreleme yapılmıyor');
        return sentences;
      }
      
      console.log('   🚫 Hariç tutulacak kelimeler:', excludeList);
      
      // Cümleleri filtrele
      let filteredCount = 0;
      const filtered = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        const containsExcluded = excludeList.some(excludeWord => 
          lowerSentence.includes(excludeWord)
        );
        if (containsExcluded) {
          filteredCount++;
          console.log(`   ❌ Filtreleniyor (${filteredCount}):`, sentence.substring(0, 60) + '...');
        }
        return !containsExcluded;
      });
      
      console.log(`   ✅ Toplam ${filteredCount} cümle hariç tutuldu`);
      return filtered;
    }
    
    calcDelay(word){
      // kelime başına ms (hız çarpanı ile)
      return (60000 / this.wpm) / this.speedMultiplier;
    }
    showWord(word){
      if (!word || typeof word !== 'string' || word.length === 0) {
        console.warn('showWord: invalid word', word);
        return;
      }
      
      // Okunan kelime sayısını artır
      if (this.isPlaying) {
        this.sessionWordsRead++;
      }
      
      // Gerçek ORP (Optimal Reading Point) hesaplaması
      const len = word.length;
      let pivotIndex;
      
      if (len <= 1) {
        pivotIndex = 0;
      } else if (len <= 5) {
        pivotIndex = 1; // 2. karakter
      } else if (len <= 9) {
        pivotIndex = 2; // 3. karakter  
      } else if (len <= 13) {
        pivotIndex = 3; // 4. karakter
      } else {
        pivotIndex = 4; // 5. karakter (max)
      }
      
      const left = word.slice(0, pivotIndex);
      const pivot = word.slice(pivotIndex, pivotIndex + 1);
      const right = word.slice(pivotIndex + 1);
      
      // Pivot harf sabit merkez - monospace kullanarak pozisyon kontrolü
      if (this.displayEl) {
        // Sol kısmı sağa hizala, sağ kısmı sola hizala
        const leftPadded = left.padStart(10, '\u00A0'); // Non-breaking space ile doldur
        const rightPadded = right.padEnd(10, '\u00A0');
        
        this.displayEl.innerHTML = `<span class="spritz-left">${escapeHtml(leftPadded)}</span><span class="spritz-pivot">${escapeHtml(pivot)}</span><span class="spritz-right">${escapeHtml(rightPadded)}</span>`;
      } else {
        console.error('displayEl is null in showWord');
      }
      
      this.updateProgress();
    }
    
    updateProgress() {
      if (this.words.length > 0 && this.progressFill) {
        const percentage = ((this.index + 1) / this.words.length) * 100;
        const percentText = Math.round(percentage) + '%';
        
        this.progressFill.style.width = percentage + '%';
        this.progressFill.setAttribute('data-percent', percentText);
        
        // Hangi sayfada olduğumuzu hesapla
        let currentPage = 1;
        if (this.pdfPageBoundaries && this.pdfPageBoundaries.length > 0) {
          const totalPages = this.pdfPageBoundaries.length + 1;
          // Yüzdeye göre sayfa hesapla (eşit bölünmüş)
          currentPage = Math.min(Math.ceil(percentage / 100 * totalPages), totalPages);
        }
        
        // Alt kısımdaki gösterge: Yüzde, Sayfa ve Kazanım
        if (this.progressText) {
          let displayText = percentText;
          
          // Sayfa bilgisi ekle
          if (this.pdfPageBoundaries && this.pdfPageBoundaries.length > 0) {
            const totalPages = this.pdfPageBoundaries.length + 1;
            displayText += ` - Sayfa ${currentPage}/${totalPages}`;
          }
          
          // Kazanım bilgisi ekle (ayar açıksa ve okuma başlamışsa)
          if (this.showGains && this.sessionStartTime && this.sessionWordsRead > 0) {
            const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
            const traditionalTime = (this.sessionWordsRead / 200) * 60;
            const timeSaved = traditionalTime - sessionDuration;
            
            if (timeSaved > 0) {
              const formatTime = (sec) => {
                if (sec < 60) return `${Math.round(sec)}sn`;
                const min = Math.floor(sec / 60);
                const s = Math.round(sec % 60);
                return `${min}dk ${s}sn`;
              };
              displayText += ` • Kazanım: ${formatTime(timeSaved)}`;
            }
          }
          
          this.progressText.textContent = displayText;
        }
      }
    }
    
    calculatePageBoundaries(charBoundaries, originalText, cleanedText) {
      // Karakter indexlerinden kelime indexlerine çevirme
      // cleanedText üzerinden kelimelere ayırıyoruz
      if (!charBoundaries || charBoundaries.length === 0) {
        return [];
      }
      
      const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
      const wordBoundaries = [];
      
      // Her sayfa sınırı için yaklaşık kelime indexini hesapla
      // Basit yaklaşım: karakter oranı = kelime oranı
      const charToWordRatio = words.length / cleanedText.length;
      
      for (const charIndex of charBoundaries) {
        const wordIndex = Math.round(charIndex * charToWordRatio);
        wordBoundaries.push(Math.min(wordIndex, words.length - 1));
      }
      
      return wordBoundaries;
    }
    
    calculateWebPageBoundaries(text) {
      // Web içeriği için sayfa sınırları oluştur
      // Her 250 kelime yaklaşık 1 dakikalık okuma = 1 "sayfa"
      const WORDS_PER_PAGE = 250;
      
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const totalWords = words.length;
      const pageCount = Math.ceil(totalWords / WORDS_PER_PAGE);
      
      console.log(`📄 Web içeriği ${pageCount} sayfaya bölünüyor (${totalWords} kelime)`);
      
      this.pdfPageBoundaries = [];
      
      // Her sayfa sınırını hesapla (ilk sayfa hariç)
      for (let i = 1; i < pageCount; i++) {
        const wordIndex = i * WORDS_PER_PAGE;
        this.pdfPageBoundaries.push(Math.min(wordIndex, totalWords - 1));
      }
      
      console.log('✅ Web sayfa sınırları:', this.pdfPageBoundaries);
    }
    
    renderPageMarkers() {
      // Cetvel kaldırıldı - sadece alt kısımdaki sayfa bilgisi gösteriliyor
      console.log('📏 Cetvel devre dışı - sayfa bilgisi alt kısımda gösteriliyor');
    }
    
    play(){
      console.log('▶️ PLAY METODU ÇAĞRILDI');
      if(this.words.length===0) {
        console.error('❌ Oynatılacak kelime yok!');
        alert('Hata: Kelime listesi boş!');
        return;
      }
      console.log('✅ Kelime listesi mevcut:', this.words.length, 'kelime');
      if(this.isPlaying) {
        console.log('⚠️ Zaten oynatılıyor');
        return;
      }
      this.isPlaying = true;
      console.log('✅ Oynatma başladı');
      
      // Oturum başlat (ilk kez başlatılıyorsa)
      if (!this.sessionStartTime) {
        this.sessionStartTime = Date.now();
        this.sessionWordsRead = 0;
      }
      
      this.restartInterval();
    }
    
    pause(){
      this.isPlaying = false;
      if(this.interval) clearInterval(this.interval);
      
      // Progress text'i göster
      if (this.progressText) {
        this.progressText.style.display = 'block';
      }
    }
    
    stop(){
      this.pause();
      
      // Kazanım istatistiklerini kaydet (ayar açıksa ve okuma yapılmışsa)
      if (this.showGains && this.sessionStartTime && this.sessionWordsRead > 0) {
        const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
        const wordsRead = this.sessionWordsRead;
        const traditionalTime = (wordsRead / 200) * 60;
        const timeSaved = traditionalTime - sessionDuration;
        
        // Toplam kazanımı storage'a kaydet
        chrome.storage.sync.get(['totalTimeSaved', 'totalWordsRead', 'totalSessions'], (res) => {
          chrome.storage.sync.set({
            totalTimeSaved: (res.totalTimeSaved || 0) + timeSaved,
            totalWordsRead: (res.totalWordsRead || 0) + wordsRead,
            totalSessions: (res.totalSessions || 0) + 1
          });
        });
      }
      
      if(this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      if(window.spritzPlayer === this) {
        window.spritzPlayer = null;
      }
    }
    
    goToStart(){
      this.index = 0;
      if (this.words.length > 0) {
        this.showWord(this.words[0]);
        this.updateProgress();
      }
      if(this.isPlaying) {
        this.pause();
      }
      console.log('⏮️ Başa sarıldı');
    }
    
    goToEnd(){
      this.index = Math.max(0, this.words.length - 1);
      if (this.words.length > 0) {
        this.showWord(this.words[this.index]);
        this.updateProgress();
      }
      if(this.isPlaying) {
        this.pause();
      }
      console.log('⏭️ Sona gidildi');
    }
    
    skipForward(count){
      const wasPlaying = this.isPlaying;
      if(wasPlaying) this.pause();
      
      this.index = Math.min(this.index + count, this.words.length - 1);
      if (this.words.length > 0) {
        this.showWord(this.words[this.index]);
        this.updateProgress();
      }
      console.log('⏩ ' + count + ' kelime ileri');
      
      if(wasPlaying) this.play();
    }
    
    skipBackward(count){
      const wasPlaying = this.isPlaying;
      if(wasPlaying) this.pause();
      
      this.index = Math.max(0, this.index - count);
      if (this.words.length > 0) {
        this.showWord(this.words[this.index]);
        this.updateProgress();
      }
      console.log('⏪ ' + count + ' kelime geri');
      
      if(wasPlaying) this.play();
    }
    
    showTextPreview() {
      const previewModal = this.container.querySelector('#spritz-text-preview');
      if (!previewModal) return;
      
      if (!this.originalText && !this.filteredText) {
        alert('📝 Henüz metin yüklenmedi!\n\nBir PDF yükleyin veya web sayfasından metin okutun.');
        return;
      }
      
      // İstatistikleri hesapla
      const originalSentences = this.originalText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const filteredSentences = this.filteredText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const excludedSentences = originalSentences - filteredSentences;
      const originalWords = this.originalText.split(/\s+/).filter(w => w.trim().length > 0).length;
      const filteredWords = this.words.length;
      
      // Stats güncelle
      const statsEl = this.container.querySelector('#spritz-preview-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">📄 Orijinal:</span>
            <span class="stat-value">${originalSentences.toLocaleString()} cümle, ${originalWords.toLocaleString()} kelime</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">✅ Filtrelenmiş:</span>
            <span class="stat-value">${filteredSentences.toLocaleString()} cümle, ${filteredWords.toLocaleString()} kelime</span>
          </div>
          <div class="stat-item ${excludedSentences > 0 ? 'stat-excluded' : ''}">
            <span class="stat-label">🚫 Hariç tutulan:</span>
            <span class="stat-value">${excludedSentences.toLocaleString()} cümle (${originalWords - filteredWords} kelime)</span>
          </div>
        `;
      }
      
      // Metin içeriklerini güncelle
      const originalContent = this.container.querySelector('.preview-tab-content[data-content="original"]');
      const filteredContent = this.container.querySelector('.preview-tab-content[data-content="filtered"]');
      
      if (originalContent) {
        originalContent.textContent = this.originalText || 'Metin bulunamadı';
      }
      if (filteredContent) {
        filteredContent.textContent = this.filteredText || 'Metin bulunamadı';
      }
      
      // Tab değiştirme event listener'ı
      const tabs = this.container.querySelectorAll('.preview-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const tabName = e.target.getAttribute('data-tab');
          
          // Aktif tab'i güncelle
          tabs.forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          
          // İçeriği göster
          const contents = this.container.querySelectorAll('.preview-tab-content');
          contents.forEach(c => c.classList.remove('active'));
          const targetContent = this.container.querySelector(`.preview-tab-content[data-content="${tabName}"]`);
          if (targetContent) targetContent.classList.add('active');
        });
      });
      
      // Kapat butonu
      const closeBtn = this.container.querySelector('#spritz-preview-close');
      if (closeBtn) {
        closeBtn.onclick = () => {
          previewModal.style.display = 'none';
        };
      }
      
      // Modal'ı göster
      previewModal.style.display = 'flex';
    }
    
    showTextPreview() {
      const previewModal = this.container.querySelector('#spritz-text-preview');
      if (!previewModal) return;
      
      if (!this.originalText && !this.filteredText) {
        alert('📝 Henüz metin yüklenmedi!\n\nBir PDF yükleyin veya web sayfasından metin okutun.');
        return;
      }
      
      // İstatistikleri hesapla
      const originalSentences = this.originalText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const filteredSentences = this.filteredText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const excludedSentences = originalSentences - filteredSentences;
      const originalWords = this.originalText.split(/\s+/).filter(w => w.trim().length > 0).length;
      const filteredWords = this.words.length;
      
      // Stats güncelle
      const statsEl = this.container.querySelector('#spritz-preview-stats');
      if (statsEl) {
        statsEl.innerHTML = `
          <div class="stat-item">
            <span class="stat-label">📄 Orijinal:</span>
            <span class="stat-value">${originalSentences.toLocaleString()} cümle, ${originalWords.toLocaleString()} kelime</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">✅ Filtrelenmiş:</span>
            <span class="stat-value">${filteredSentences.toLocaleString()} cümle, ${filteredWords.toLocaleString()} kelime</span>
          </div>
          <div class="stat-item ${excludedSentences > 0 ? 'stat-excluded' : ''}">
            <span class="stat-label">🚫 Hariç tutulan:</span>
            <span class="stat-value">${excludedSentences.toLocaleString()} cümle (${originalWords - filteredWords} kelime)</span>
          </div>
        `;
      }
      
      // Metin içeriklerini güncelle
      const originalContent = this.container.querySelector('.preview-tab-content[data-content="original"]');
      const filteredContent = this.container.querySelector('.preview-tab-content[data-content="filtered"]');
      
      if (originalContent) {
        originalContent.textContent = this.originalText || 'Metin bulunamadı';
      }
      if (filteredContent) {
        filteredContent.textContent = this.filteredText || 'Metin bulunamadı';
      }
      
      // Tab değiştirme event listener'ı
      const tabs = this.container.querySelectorAll('.preview-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          const tabName = e.target.getAttribute('data-tab');
          
          // Aktif tab'i güncelle
          tabs.forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          
          // İçeriği göster
          const contents = this.container.querySelectorAll('.preview-tab-content');
          contents.forEach(c => c.classList.remove('active'));
          const targetContent = this.container.querySelector(`.preview-tab-content[data-content="${tabName}"]`);
          if (targetContent) targetContent.classList.add('active');
        });
      });
      
      // excludeWords editörünü doldur
      const excludeTextarea = this.container.querySelector('#spritz-exclude-textarea');
      if (excludeTextarea) {
        excludeTextarea.value = this.excludeWords || '';
      }
      
      // Kaydet butonu
      const saveBtn = this.container.querySelector('#spritz-exclude-save');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const newExcludeWords = excludeTextarea.value.trim();
          this.excludeWords = newExcludeWords;
          
          // Ayarlara kaydet
          try {
            await chrome.storage.sync.set({ excludeWords: newExcludeWords });
            console.log('✅ excludeWords kaydedildi:', newExcludeWords);
            
            // Metni yeniden filtrele
            if (this.originalText) {
              const sentences = this.originalText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
              const filteredSentences = this.filterSentences(sentences);
              this.filteredText = filteredSentences.join('. ');
              
              // İçerikleri güncelle
              if (filteredContent) {
                filteredContent.textContent = this.filteredText;
              }
              
              // Kelimeleri güncelle
              this.setText(this.filteredText);
              
              // İstatistikleri yeniden hesapla
              const originalSentences = this.originalText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
              const newFilteredSentences = filteredSentences.length;
              const newExcludedSentences = originalSentences - newFilteredSentences;
              const originalWords = this.originalText.split(/\s+/).filter(w => w.trim().length > 0).length;
              const newFilteredWords = this.words.length;
              
              if (statsEl) {
                statsEl.innerHTML = `
                  <div class="stat-item">
                    <span class="stat-label">📄 Orijinal:</span>
                    <span class="stat-value">${originalSentences.toLocaleString()} cümle, ${originalWords.toLocaleString()} kelime</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">✅ Filtrelenmiş:</span>
                    <span class="stat-value">${newFilteredSentences.toLocaleString()} cümle, ${newFilteredWords.toLocaleString()} kelime</span>
                  </div>
                  <div class="stat-item ${newExcludedSentences > 0 ? 'stat-excluded' : ''}">
                    <span class="stat-label">🚫 Hariç tutulan:</span>
                    <span class="stat-value">${newExcludedSentences.toLocaleString()} cümle (${originalWords - newFilteredWords} kelime)</span>
                  </div>
                `;
              }
              
              alert('✅ Filtre kaydedildi ve metin yeniden işlendi!');
            }
          } catch (error) {
            console.error('❌ Kaydetme hatası:', error);
            alert('❌ Kaydetme hatası: ' + error.message);
          }
        };
      }
      
      // Seçili metni ekle butonu
      const addSelectionBtn = this.container.querySelector('#spritz-exclude-selection');
      if (addSelectionBtn) {
        addSelectionBtn.onclick = () => {
          const selection = window.getSelection().toString().trim();
          if (!selection) {
            alert('⚠️ Lütfen önce bir metin seçin!');
            return;
          }
          
          // Mevcut değere ekle
          const current = excludeTextarea.value.trim();
          const newValue = current ? `${current}, ${selection}` : selection;
          excludeTextarea.value = newValue;
          
          console.log('➕ Seçili metin eklendi:', selection);
          alert(`✅ "${selection}" eklendi!\n\nKaydetmek için "✔️ Kaydet" butonuna tıklayın.`);
        };
      }
      
      // Temizle butonu
      const clearBtn = this.container.querySelector('#spritz-exclude-clear');
      if (clearBtn) {
        clearBtn.onclick = () => {
          if (confirm('🗑️ Tüm hariç tutma filtrelerini temizlemek istediğinize emin misiniz?')) {
            excludeTextarea.value = '';
          }
        };
      }
      
      // Kapat butonu
      const closeBtn = this.container.querySelector('#spritz-preview-close');
      if (closeBtn) {
        closeBtn.onclick = () => {
          previewModal.style.display = 'none';
        };
      }
      
      // Modal'ı göster
      previewModal.style.display = 'flex';
    }
    
    setSpeedMultiplier(multiplier){
      this.speedMultiplier = multiplier;
      console.log('⚡ Hız çarpanı:', multiplier + 'x');
      
      // WPM input'ı da güncelle (efektif WPM)
      const wpmInput = this.container.querySelector('#spritz-wpm');
      if (wpmInput) {
        const effectiveWPM = Math.round(this.wpm * multiplier);
        wpmInput.value = effectiveWPM;
        console.log('📊 Efektif WPM:', effectiveWPM);
      }
      
      if(this.isPlaying) {
        this.restartInterval();
      }
    }
    
    restartInterval(){
      if(this.interval) clearInterval(this.interval);
      if(!this.words || this.words.length === 0) {
        console.warn('restartInterval: no words to display');
        return;
      }
      this.interval = setInterval(()=>{
        if(this.index >= this.words.length){
          this.stop();
          return;
        }
        const word = this.words[this.index];
        if(word) {
          this.showWord(word);
        }
        this.index++;
      }, this.calcDelay());
    }
  }

  // Init
  try{
    injectStyles();
  }catch(e){ console.error(e); }

})();