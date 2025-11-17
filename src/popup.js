// popup.js - Popup için ayrı script dosyası (CSP uyumlu)
document.getElementById('start').addEventListener('click', async ()=>{
  try {
    const [tab] = await chrome.tabs.query({active:true,lastFocusedWindow:true});
    chrome.scripting.executeScript({
      target:{tabId:tab.id},
      func: ()=>{ 
        const btn = document.getElementById('spritz-control-btn'); 
        if(btn) {
          btn.click(); 
        } else {
          alert('Sayfa yüklenirken lütfen bekleyin ve tekrar deneyin.'); 
        }
      }
    });
    window.close();
  } catch (error) {
    console.error('Popup error:', error);
    alert('Hata: ' + error.message);
  }
});

document.getElementById('options').addEventListener('click', ()=>{ 
  chrome.runtime.openOptionsPage(); 
  window.close();
});