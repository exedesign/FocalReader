// options.js - Options page için ayrı script dosyası (CSP uyumlu)
const fontSelect = document.getElementById('font-select');
const wpmInput = document.getElementById('default-wpm');
const excludeWordsInput = document.getElementById('exclude-words');
const status = document.getElementById('status');

// Ayarları yükle
const showGainsCheckbox = document.getElementById('show-gains');
const enablePdfCleanupCheckbox = document.getElementById('enable-pdf-cleanup');
const pdfCleanupRegexInput = document.getElementById('pdf-cleanup-regex');
const pdfCleanupReplacementInput = document.getElementById('pdf-cleanup-replacement');

chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords', 'showGains', 'enablePdfCleanup', 'pdfCleanupRegex', 'pdfCleanupReplacement'], (res) => {
  console.log('Options loading settings:', res);
  fontSelect.value = res.selectedFont || 'georgia';
  wpmInput.value = res.defaultWPM || 250;
  excludeWordsInput.value = res.excludeWords || '';
  showGainsCheckbox.checked = res.showGains !== false; // Varsayılan: true
  enablePdfCleanupCheckbox.checked = res.enablePdfCleanup !== false; // Varsayılan: true
  pdfCleanupRegexInput.value = res.pdfCleanupRegex || '([a-zğüşıöç]+)\\s+([ğüşıöçĞÜŞİÖÇ])\\s+([a-zğüşıöç]+)';
  pdfCleanupReplacementInput.value = res.pdfCleanupReplacement || '$1$2$3';
  console.log('Settings loaded successfully');
});

// Kaydet butonunu bağla
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    selectedFont: fontSelect.value,
    defaultWPM: parseInt(wpmInput.value) || 250,
    excludeWords: excludeWordsInput.value.trim(),
    showGains: showGainsCheckbox.checked,
    enablePdfCleanup: enablePdfCleanupCheckbox.checked,
    pdfCleanupRegex: pdfCleanupRegexInput.value.trim(),
    pdfCleanupReplacement: pdfCleanupReplacementInput.value.trim()
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
  chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords', 'showGains', 'enablePdfCleanup', 'pdfCleanupRegex', 'pdfCleanupReplacement'], (res) => {
    const excludeWordsDisplay = res.excludeWords && res.excludeWords.trim() ? res.excludeWords : 'Yok';
    const showGainsDisplay = res.showGains !== false ? 'Açık ✅' : 'Kapalı ❌';
    const pdfCleanupDisplay = res.enablePdfCleanup !== false ? 'Açık ✅' : 'Kapalı ❌';
    const regexDisplay = res.pdfCleanupRegex || 'Varsayılan';
    status.innerHTML = `
      <strong>📊 Mevcut Ayarlar:</strong><br>
      🅰️ Font: ${res.selectedFont || 'georgia'}<br>
      ⏱️ WPM: ${res.defaultWPM || 250}<br>
      🚫 Hariç Kelimeler: ${excludeWordsDisplay}<br>
      📈 Kazanım Göster: ${showGainsDisplay}<br>
      🔧 PDF Temizleme: ${pdfCleanupDisplay}<br>
      📝 Regex: ${regexDisplay}
    `;
    status.style.color = '#17a2b8';
    status.style.borderLeftColor = '#17a2b8';
    setTimeout(() => status.innerText = '', 5000);
  });
});