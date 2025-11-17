// content.js
// Eklenti tüm sayfalara enjekte edilir. Metin seçimi veya sayfa metni ile Spritz oynatıcıyı başlatır.

(function(){
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
        #spritz-control-btn{position:fixed;right:12px;bottom:12px;z-index:999999;background:#007bff;color:#fff;border:none;width:44px;height:44px;border-radius:22px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3);}
        #spritz-widget-root{position:fixed;inset:0;z-index:999998;pointer-events:none;}
        #spritz-backdrop{position:fixed;inset:0;background:#000;pointer-events:auto;}
        #spritz-overlay{pointer-events:auto;position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);background:#000;color:#fff;padding:30px 40px;border-radius:8px;max-width:90%;border:1px solid #333;}
        #spritz-display{font-size:52px;text-align:center;min-width:400px;min-height:90px;font-weight:400;line-height:1.1;font-family:Georgia,"Times New Roman",serif;padding:20px 0;letter-spacing:1px;}
        .spritz-left{color:#888;}
        .spritz-pivot{color:#ffdd44;font-weight:700;}
        .spritz-right{color:#888;}
        #spritz-controls{margin-top:20px;text-align:center;padding:10px 0;border-top:1px solid #333;}
        #spritz-controls button{margin:0 8px;padding:8px 12px;background:#222;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;}
        #spritz-controls button:hover{background:#444;}
        #spritz-controls input[type=number]{width:80px;padding:6px;margin:0 4px;background:#222;color:#fff;border:1px solid #555;border-radius:4px;text-align:center;}
        #spritz-controls label{color:#aaa;font-size:14px;}
      `;
      document.head.appendChild(style);
    }
  }

  // Kontrol butonu
  function addControlButton(){
    if(document.getElementById('spritz-control-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'spritz-control-btn';
    btn.title = 'Hızlı Okuma: Başlat (seçili metin yoksa sayfa metnini alır)';
    btn.innerText = '▶︎';
    btn.addEventListener('click', async()=>{      
      const sel = (window.getSelection && window.getSelection().toString()) || '';
      if(sel && sel.trim().length>3){
        startSpritz(sel);
        return;
      }
      
      // PDF tespiti - hem URL hem de content type kontrol et
      const isPDF = window.location.href.toLowerCase().includes('.pdf') || 
                    document.contentType === 'application/pdf' ||
                    document.querySelector('embed[type="application/pdf"]') ||
                    document.querySelector('object[type="application/pdf"]');
      
      if(isPDF){
        console.log('PDF detected, starting extraction...');
        
        // File URL'ler için direkt yöntem kullan
        if (window.location.href.startsWith('file://')) {
          console.log('File URL detected, using direct method');
          try {
            const text = await extractPDFDirectly();
            if(text && text.trim().length > 10) {
              startSpritz(text); 
            } else {
              alert('PDF\'den metin çıkarılamadı.');
            }
          } catch(e) {
            console.error('Direct PDF extraction failed:', e);
            alert('PDF okuma hatası: ' + e.message + '\n\nLütfen Chrome ayarlarında "Dosya URL\'lerine erişim" izni verildiğini kontrol edin.');
          }
          return;
        }
        
        // HTTP/HTTPS URL'ler için background script dene
        try {
          // Extension context kontrolü
          if (!chrome.runtime?.id) {
            throw new Error('Extension context invalid');
          }
          
          const text = await extractPDFText();
          if(text && text.trim().length > 10) {
            startSpritz(text); 
          } else {
            alert('PDF\'den metin çıkarılamadı - boş veya desteklenmeyen format.');
          }
        } catch(e) {
          console.error('PDF extraction failed:', e);
          alert('PDF okuma hatası: ' + e.message + '\\n\\nLütfen:\\n1. Sayfayı yenileyin (F5)\\n2. Dosya izinlerini kontrol edin\\n3. Başka bir PDF deneyin');
        }
      } else {
        // Normal web sayfası için metin çıkarma
        const page = extractReadableText();
        if(page && page.trim().length > 10) {
          startSpritz(page);
        } else {
          alert('Sayfada okunabilir metin bulunamadı. Lütfen bir metin seçin.');
        }
      }
    });
    document.body.appendChild(btn);
  }

  // Basit readable text çıkarma (seçim yoksa)
  function extractReadableText(){
    // Öncelik: article tag'i, main tag'i, sonra body.innerText
    const article = document.querySelector('article');
    if(article) return article.innerText;
    const main = document.querySelector('main');
    if(main) return main.innerText;
    // Kısa temizleme
    return document.body.innerText || document.documentElement.innerText || '';
  }

  // PDF metin çıkarma: Yerel dosyalar için güçlendirilmiş yöntem
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
        console.log('Local file detected, using multiple approaches...');
        
        // Yöntem 1: XMLHttpRequest
        try {
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
            xhr.onerror = () => reject(new Error('XHR network error'));
            xhr.send();
          });
        } catch (xhrError) {
          console.warn('XHR method failed:', xhrError.message);
          
          // Yöntem 2: Fetch API
          try {
            console.log('Trying fetch API...');
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
            }
            pdfArrayBuffer = await response.arrayBuffer();
            console.log('Fetch successful, data size:', pdfArrayBuffer.byteLength);
          } catch (fetchError) {
            console.error('All local file methods failed');
            throw new Error(`Yerel PDF dosyasına erişim başarısız: ${fetchError.message}`);
          }
        }
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
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      console.log('Text extraction completed, total length:', fullText.length);
      return fullText.trim();
      
    } catch (error) {
      console.error('PDF.js parsing error:', error);
      throw new Error(`PDF parsing başarısız: ${error.message}`);
    }
  }

  // PDF.js kütüphanesini yükle
  async function loadPDFJS() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
        console.log('PDF.js already loaded');
        resolve();
        return;
      }
      
      console.log('Loading PDF.js library...');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('lib/pdf.min.js');
      
      script.onload = () => {
        console.log('PDF.js script loaded');
        
        const checkLibrary = () => {
          if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
            console.log('PDF.js library ready, setting worker...');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
            resolve();
          } else {
            setTimeout(checkLibrary, 100);
          }
        };
        
        checkLibrary();
      };
      
      script.onerror = () => {
        reject(new Error('PDF.js loading failed'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  // Fallback PDF extraction (background script çalışmazsa)
  async function extractPDFTextWithFallback() {
    try {
      // Önce normal yöntemle dene
      return await extractPDFText();
    } catch (error) {
      console.warn('Background script failed, trying direct fetch:', error.message);
      
      // Eğer extension context sorunu varsa direkt fetch dene
      if (error.message.includes('Extension context') || error.message.includes('invalidated')) {
        return await extractPDFDirectly();
      }
      throw error;
    }
  }
  
  // Direkt PDF extraction (background script olmadan)
  async function extractPDFDirectly() {
    console.log('Attempting direct PDF extraction...');
    
    try {
      const url = window.location.href;
      let arrayBuffer;
      
      // File URL'leri için özel işlem
      if (url.startsWith('file://')) {
        console.log('Direct file URL access attempt...');
        
        // Fetch API ile direkt deneme (file permissions gerekli)
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`File access denied: ${response.status} - Chrome'da 'Dosya URL'lerine erişim' izni gerekli`);
          }
          arrayBuffer = await response.arrayBuffer();
          console.log('File read successful via fetch, size:', arrayBuffer.byteLength);
        } catch (fetchError) {
          // Eğer fetch başarısızsa, daha detaylı hata mesajı
          throw new Error(
            'Yerel PDF dosyasına erişim reddedildi.\n\n' +
            'Lütfen şunları kontrol edin:\n' +
            '1. Chrome Uzantılar > HızlıOkuma > "Dosya URL\'lerine erişime izin ver" ✓\n' +
            '2. PDF dosyasını doğrudan tarayıcı sekmesindesin açın\n' +
            '3. PDF\'in gömülü (embed) değil, doğrudan açılmış olduğundan emin olun\n\n' +
            'Teknik hata: ' + fetchError.message
          );
        }
      } else {
        // HTTP/HTTPS URL'ler için XMLHttpRequest
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        
        arrayBuffer = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.open('GET', url);
          xhr.send();
        });
      }
      
      const bytes = new Uint8Array(arrayBuffer);
      console.log('Starting PDF parsing with', bytes.length, 'bytes');
      return await parsePDFLocally(bytes);
    } catch (error) {
      throw new Error('PDF okuma başarısız: ' + error.message);
    }
  }
  // Lokal PDF parsing
  async function parsePDFLocally(data) {
    return new Promise((resolve, reject) => {
      // PDF.js'ın daha önce yüklenip yüklenmediğini kontrol et
      if (window['pdfjsLib'] && window['pdfjsLib'].GlobalWorkerOptions) {
        console.log('PDF.js already loaded, starting parsing...');
        processPDFWithLibrary(data, resolve, reject);
        return;
      }
      
      // PDF.js'i yükle
      console.log('Loading PDF.js library...');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('lib/pdf.min.js');
      
      script.onload = () => {
        console.log('PDF.js script loaded, checking library...');
        
        // Kısa bir bekleme ile kütüphanenin hazır olmasını bekle
        const checkLibrary = () => {
          if (window['pdfjsLib'] && window['pdfjsLib'].GlobalWorkerOptions) {
            console.log('PDF.js library ready, setting worker path...');
            processPDFWithLibrary(data, resolve, reject);
          } else {
            console.log('Library not ready yet, waiting...');
            setTimeout(checkLibrary, 100);
          }
        };
        
        checkLibrary();
      };
      
      script.onerror = (error) => {
        console.error('PDF.js loading error:', error);
        reject(new Error('PDF.js yüklenemedi'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  // PDF işleme fonksiyonu
  async function processPDFWithLibrary(data, resolve, reject) {
    try {
      // Worker path ayarla
      window['pdfjsLib'].GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');
      console.log('Worker path set, creating PDF document...');
      
      // PDF'i parse et
      const loadingTask = window['pdfjsLib'].getDocument({ data });
      const pdf = await loadingTask.promise;
      
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let fullText = '';
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log('Processing page', pageNum);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      console.log('PDF text extraction completed');
      resolve(fullText);
    } catch (error) {
      console.error('PDF parsing error:', error);
      reject(error);
    }
  }

  // Spritz oynatıcı: basit implementasyon
  class SpritzPlayer{
    constructor(container){
      this.container = container;
      this.wpm = 250; // Varsayılan, ayarlardan yüklenir
      this.selectedFont = 'georgia'; // Varsayılan font
      this.excludeWords = ''; // Hariç tutulacak kelimeler
      this.interval = null;
      this.words = [];
      this.index = 0;
      this.isPlaying = false;
      this.displayEl = null;
      this.loadSettings(); // Ayarları yükle
    }
    
    // Kullanıcı ayarlarını yükle
    loadSettings(){
      chrome.storage.sync.get(['defaultWPM', 'selectedFont', 'excludeWords'], (res) => {
        this.wpm = res.defaultWPM || 250;
        this.selectedFont = res.selectedFont || 'georgia';
        this.excludeWords = res.excludeWords || '';
        this.setupUI(); // UI'yi ayarlarla birlikte kur
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
          <div id="spritz-display" aria-live="polite"></div>
          <div id="spritz-controls">
            <button id="spritz-play">▶</button>
            <button id="spritz-pause">⏸</button>
            <label>WPM <input id="spritz-wpm" type="number" min="50" max="2000" value="${this.wpm}"></label>
            <button id="spritz-close">✕</button>
          </div>
        </div>
      `;
      this.displayEl = this.container.querySelector('#spritz-display');
      this.container.querySelector('#spritz-play').addEventListener('click', ()=>this.play());
      this.container.querySelector('#spritz-pause').addEventListener('click', ()=>this.pause());
      this.container.querySelector('#spritz-close').addEventListener('click', ()=>this.stop());
      this.container.querySelector('#spritz-wpm').addEventListener('change', (e)=>{ this.wpm = Number(e.target.value); if(this.isPlaying) this.restartInterval(); });
    }
    setText(text){
      console.log('Original text length:', text.length);
      
      // Önce metni cümlelere ayır
      const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
      console.log('Sentences found:', sentences.length);
      
      // Kelime filtresini uygula
      const filteredSentences = this.filterSentences(sentences);
      console.log('Filtered sentences:', filteredSentences.length);
      
      // Filtrelenmiş cümleleri kelimelere ayır
      const filteredText = filteredSentences.join('. ');
      const cleaned = filteredText.replace(/\s+/g,' ').trim();
      this.words = cleaned.split(' ').filter(word => word.trim().length > 0);
      this.index = 0;
      
      console.log('Final word count:', this.words.length);
      if (sentences.length !== filteredSentences.length) {
        console.log(`Filtered out ${sentences.length - filteredSentences.length} sentences`);
      }
    }
    
    filterSentences(sentences) {
      if (!this.excludeWords || this.excludeWords.trim() === '') {
        return sentences;
      }
      
      // Hariç tutulacak kelimeleri virgülle ayır ve temizle
      const excludeList = this.excludeWords
        .split(',')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
      
      if (excludeList.length === 0) {
        return sentences;
      }
      
      console.log('Exclude words:', excludeList);
      
      // Cümleleri filtrele
      const filtered = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        const containsExcluded = excludeList.some(excludeWord => 
          lowerSentence.includes(excludeWord)
        );
        if (containsExcluded) {
          console.log('Filtering out sentence:', sentence.substring(0, 50) + '...');
        }
        return !containsExcluded;
      });
      
      return filtered;
    }
    calcDelay(word){
      // kelime başına ms
      return 60000 / this.wpm;
    }
    showWord(word){
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
      
      this.displayEl.innerHTML = `<span class="spritz-left">${escapeHtml(left)}</span><span class="spritz-pivot">${escapeHtml(pivot)}</span><span class="spritz-right">${escapeHtml(right)}</span>`;
    }
    play(){
      if(this.words.length===0) return;
      if(this.isPlaying) return;
      this.isPlaying = true;
      this.restartInterval();
    }
    restartInterval(){
      if(this.interval) clearInterval(this.interval);
      this.interval = setInterval(()=>{
        if(this.index>=this.words.length){ this.stop(); return; }
        this.showWord(this.words[this.index]);
        this.index++;
      }, this.calcDelay());
    }
    pause(){
      this.isPlaying = false;
      if(this.interval) clearInterval(this.interval);
    }
    stop(){
      this.pause();
      this.container.remove();
    }
  }

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Başlatıcı
  function startSpritz(text){
    if(!text || text.trim().length<1){ alert('Metin bulunamadı. Lütfen bir metin seçin veya sayfada okunabilir bir içerik olduğundan emin olun.'); return; }
    // Root oluştur
    if(document.getElementById(WIDGET_ID)) document.getElementById(WIDGET_ID).remove();
    const root = document.createElement('div');
    root.id = WIDGET_ID;
    document.body.appendChild(root);
    const player = new SpritzPlayer(root);
    player.setText(text);
    player.play();
  }

  // Init
  try{
    injectStyles();
    addControlButton();
  }catch(e){ console.error(e); }

})();
