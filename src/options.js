// options.js - Options page için ayrı script dosyası (CSP uyumlu)
const fontSelect = document.getElementById('font-select');
const wpmInput = document.getElementById('default-wpm');
const excludeWordsInput = document.getElementById('exclude-words');
const status = document.getElementById('status');

// Ayarları yükle
chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords'], (res) => {
  console.log('Options loading settings:', res);
  fontSelect.value = res.selectedFont || 'georgia';
  wpmInput.value = res.defaultWPM || 250;
  excludeWordsInput.value = res.excludeWords || '';
  console.log('Settings loaded successfully');
});

// Kaydet butonunu bağla
document.getElementById('save').addEventListener('click', () => {
  const settings = {
    selectedFont: fontSelect.value,
    defaultWPM: parseInt(wpmInput.value) || 250,
    excludeWords: excludeWordsInput.value.trim()
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
  chrome.storage.sync.get(['selectedFont', 'defaultWPM', 'excludeWords'], (res) => {
    const excludeWordsDisplay = res.excludeWords && res.excludeWords.trim() ? res.excludeWords : 'Yok';
    status.innerHTML = `
      <strong>📊 Mevcut Ayarlar:</strong><br>
      🅰️ Font: ${res.selectedFont || 'georgia'}<br>
      ⏱️ WPM: ${res.defaultWPM || 250}<br>
      🚫 Hariç Kelimeler: ${excludeWordsDisplay}
    `;
    status.style.color = '#17a2b8';
    status.style.borderLeftColor = '#17a2b8';
    setTimeout(() => status.innerText = '', 5000);
  });
});