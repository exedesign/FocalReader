// popup.js - Popup için ayrı script dosyası (CSP uyumlu)
document.getElementById('start').addEventListener('click', async ()=>{
  try {
    const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
    
    if (!tab) {
      alert('Aktif sekme bulunamadı!');
      return;
    }
    
    // chrome:// ve edge:// gibi özel sayfaları kontrol et
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
      alert('⚠️ Bu sayfa türünde eklenti çalışamaz!\n\nLütfen normal bir web sayfasında deneyin.');
      return;
    }
    
    // Content script'e mesaj gönder
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'showSpritz' });
      window.close();
    } catch (error) {
      console.error('Message send error:', error);
      
      // Content script yüklü değilse, background.js inject edecek
      // Context menu çağrısı yapalım
      alert('🔄 İlk kullanım için sayfayı yenileyin veya sağ tık menüsünden başlatın.');
    }
  } catch (error) {
    console.error('Popup error:', error);
    alert('❌ Hata: ' + error.message);
  }
});

document.getElementById('options').addEventListener('click', ()=>{ 
  chrome.runtime.openOptionsPage(); 
  window.close();
});