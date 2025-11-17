// background.js - Context menu ile eklenti kontrolü
console.log('Background script starting...');

// Extension kurulduğunda context menu oluştur
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Spritz extension installed/updated');
  
  // Ana hızlı okuma menüsü
  chrome.contextMenus.create({
    id: 'spritz-read',
    title: '🚀 Hızlı Okuma (Spritz)',
    contexts: ['page', 'selection']
  });

  // PDF dosya yükleme menüsü  
  chrome.contextMenus.create({
    id: 'spritz-upload-pdf',
    title: '📄 PDF Yükle ve Oku',
    contexts: ['page']
  });
  
  // Tüm açık sayfalara bildirim gönder
  try {
    const tabs = await chrome.tabs.query({});
    console.log('Found', tabs.length, 'open tabs');
    
    for (const tab of tabs) {
      // chrome:// ve edge:// gibi özel sayfaları atla
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'extensionUpdated' });
        } catch (e) {
          // Content script yüklü değilse hata normal
          console.log('Could not notify tab', tab.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to notify tabs:', error);
  }
});

// Context menu tıklamaları
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    // Mesajı göndermeyi dene
    let response;
    try {
      if (info.menuItemId === 'spritz-read') {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'showSpritz'
        });
      } else if (info.menuItemId === 'spritz-upload-pdf') {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'showFileUploader'  
        });
      }
    } catch (messageError) {
      // Content script yüklü değilse, yükle ve tekrar dene
      console.log('Content script not loaded, injecting...');
      
      try {
        // Önce PDF.js'i yükle
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['lib/pdf.min.js']
        });
        
        // Sonra content.js'i yükle
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content.js']
        });
        
        console.log('Scripts injected successfully');
      } catch (injectError) {
        console.error('Failed to inject scripts:', injectError);
        return;
      }
      
      // Kısa bir gecikme sonra tekrar dene
      setTimeout(async () => {
        try {
          if (info.menuItemId === 'spritz-read') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'showSpritz'
            });
          } else if (info.menuItemId === 'spritz-upload-pdf') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'showFileUploader'  
            });
          }
        } catch (retryError) {
          console.error('Failed to send message after injection:', retryError);
        }
      }, 200);
    }
  } catch (error) {
    console.error('Context menu error:', error);
  }
});

console.log('Background script ready');
