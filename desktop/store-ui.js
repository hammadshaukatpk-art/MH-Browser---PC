'use strict';
// In-page control on Chrome Web Store detail pages. It does not impersonate
// Chrome or claim to enable Google's disabled "Add to Chrome" API.
function overlayScript(){
 return `(()=>{
  try{
   if(location.hostname!=='chromewebstore.google.com'||!/^\\/detail\\/(?:[^/]+\\/)?[a-p]{32}\\/?$/i.test(location.pathname))return;
   const id='mh-native-extension-install';
   const install=()=>{
    let b=document.getElementById(id);
    if(!b){
     b=document.createElement('button');b.id=id;b.type='button';
     b.textContent='＋ Install in MH Browser';
     b.title='Install this compatible extension directly in MH Browser (without Google Chrome)';
     b.style.cssText='all:initial!important;position:fixed!important;right:26px!important;top:230px!important;z-index:2147483646!important;padding:14px 19px!important;border-radius:28px!important;background:#1558d6!important;color:#fff!important;font:600 14px Arial,sans-serif!important;box-shadow:0 5px 18px #0003!important;cursor:pointer!important;';
     b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.open('mh-browser-extension://install','_blank')});
    }
    if(!b.isConnected)document.body?.appendChild(b);
    // Only suppress the Chrome-only installation banner when MH Browser's
    // replacement action has actually been mounted.
    if(!b.isConnected)return;
    for(const node of document.querySelectorAll('div,[role="alert"]')){
     if(node.id===id||node.contains(b))continue;
     const message=(node.innerText||'').trim();
     if(message.length>180||!message.includes('Switch to Chrome to install extensions and themes'))continue;
     const parent=node.parentElement;
     if(parent&&parent.innerText?.trim().length<200&&parent.querySelectorAll('button').length<=2)parent.style.display='none';
     else node.style.display='none';
    }
   };
   install();
   if(!window.__mhStoreObserver){
    let timer;
    const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(install,250)});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.__mhStoreObserver=observer;
   }
  }catch(e){console.debug('MH Browser extension install control:',e)}
 })()`;
}
module.exports={overlayScript};
