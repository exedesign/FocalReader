// options.js - Options page için ayrı script dosyası (CSP uyumlu)
const fontSelect = document.getElementById('font-select');
const wpmInput = document.getElementById('default-wpm');
const excludeWordsInput = document.getElementById('exclude-words');
const status = document.getElementById('status');

// Ayarları yükle
const showGainsCheckbox = document.getElementById('show-gains');
const enablePdfCleanupCheckbox = document.getElementById('enable-pdf-cleanup');

// PDF metin işleme yöntemi checkbox'ları
const pdfMethodCharacterFix = document.getElementById('pdf-method-character-fix');
const pdfMethodNormalize = document.getElementById('pdf-method-normalize');
const pdfMethodDialogue = document.getElementById('pdf-method-dialogue');

chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords', 'showGains', 'enablePdfCleanup', 'pdfProcessingMethods'], (res) => {
  console.log('Options loading settings:', res);
  fontSelect.value = res.selectedFont || 'georgia';
  wpmInput.value = res.defaultWPM || 250;
  excludeWordsInput.value = res.excludeWords || '';
  showGainsCheckbox.checked = res.showGains !== false; // Varsayılan: true
  enablePdfCleanupCheckbox.checked = res.enablePdfCleanup !== false; // Varsayılan: true
  
  // PDF işleme yöntemlerini ayarla (Array olarak, varsayılan: boş)
  const methods = res.pdfProcessingMethods || [];
  pdfMethodCharacterFix.checked = methods.includes('characterFix');
  pdfMethodNormalize.checked = methods.includes('normalize');
  pdfMethodDialogue.checked = methods.includes('dialogue');
  
  console.log('Settings loaded successfully');
});

// Kaydet butonunu bağla
document.getElementById('save').addEventListener('click', () => {
  // Seçili PDF işleme yöntemlerini array olarak topla
  const pdfProcessingMethods = [];
  if (pdfMethodCharacterFix.checked) pdfProcessingMethods.push('characterFix');
  if (pdfMethodNormalize.checked) pdfProcessingMethods.push('normalize');
  if (pdfMethodDialogue.checked) pdfProcessingMethods.push('dialogue');
  
  const settings = {
    selectedFont: fontSelect.value,
    defaultWPM: parseInt(wpmInput.value) || 250,
    excludeWords: excludeWordsInput.value.trim(),
    showGains: showGainsCheckbox.checked,
    enablePdfCleanup: enablePdfCleanupCheckbox.checked,
    pdfProcessingMethods: pdfProcessingMethods
  };
  
  console.log('Saving settings:', settings);
  
  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      console.error('Settings save error:', chrome.runtime.lastError);
      status.innerText = '❌ Hata: Ayarlar kaydedilemedi';
      status.style.color = '#dc3545';
      status.style.borderLeftColor = '#dc3545';
    } else {
      console.log('Settings saved successfully');
      status.innerText = '✅ Ayarlar başarıyla kaydedildi!';
      status.style.color = '#28a745';
      status.style.borderLeftColor = '#28a745';
    }
    setTimeout(() => status.innerText = '', 3000);
  });
});

// Değişiklik dinleyicileri
fontSelect.addEventListener('change', () => {
  status.innerText = '✏️ Değişiklik yapıldı - Kaydet butonuna tıklayın';
  status.style.color = '#ffc107';
  status.style.borderLeftColor = '#ffc107';
});

wpmInput.addEventListener('change', () => {
  status.innerText = '✏️ Değişiklik yapıldı - Kaydet butonuna tıklayın';
  status.style.color = '#ffc107';
  status.style.borderLeftColor = '#ffc107';
});

excludeWordsInput.addEventListener('input', () => {
  status.innerText = '✏️ Değişiklik yapıldı - Kaydet butonuna tıklayın';
  status.style.color = '#ffc107';
  status.style.borderLeftColor = '#ffc107';
});

// Test butonu - ayarları kontrol et
document.getElementById('test-settings').addEventListener('click', () => {
  chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords', 'showGains', 'enablePdfCleanup', 'pdfProcessingMethods'], (res) => {
    const excludeWordsDisplay = res.excludeWords && res.excludeWords.trim() ? res.excludeWords : 'Yok';
    const showGainsDisplay = res.showGains !== false ? 'Açık ✅' : 'Kapalı ❌';
    const pdfCleanupDisplay = res.enablePdfCleanup !== false ? 'Açık ✅' : 'Kapalı ❌';
    
    // PDF işleme yöntemleri display (array)
    const methodMap = {
      'characterFix': 'Karakter Düzeltme',
      'normalize': 'Normalleştirme',
      'dialogue': 'Diyalog Çıkarma'
    };
    const methods = res.pdfProcessingMethods || [];
    const methodDisplay = methods.length > 0 
      ? methods.map(m => methodMap[m]).join(', ') 
      : 'Yok';
    
    status.innerHTML = `
      <strong>📊 Mevcut Ayarlar:</strong><br>
      🅰️ Font: ${res.selectedFont || 'georgia'}<br>
      ⏱️ WPM: ${res.defaultWPM || 250}<br>
      🚫 Hariç Kelimeler: ${excludeWordsDisplay}<br>
      📈 Kazanım Göster: ${showGainsDisplay}<br>
      🔧 PDF Türkçe Düzeltme: ${pdfCleanupDisplay}<br>
      🔧 PDF İşleme Yöntemleri: ${methodDisplay}
    `;
    status.style.color = '#17a2b8';
    status.style.borderLeftColor = '#17a2b8';
    setTimeout(() => status.innerText = '', 5000);
  });
});