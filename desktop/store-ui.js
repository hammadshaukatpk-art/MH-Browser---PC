'use strict';
// Patches only the Chrome Web Store's existing install button, not an overlay.
// Runs in the website's renderer and forwards explicit user clicks to MH Browser.
function pageControl(){
 if(location.hostname!=='chromewebstore.google.com')return;
 const matchesDetail=()=>/^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/i.test(location.pathname);
 const state=window.__mhStoreControl||(window.__mhStoreControl={installed:false,lastPath:location.pathname});
 const label=n=>String(n?.innerText||n?.textContent||'').replace(/\s+/g,' ').trim();
 const installText=/^(add to chrome|use in chrome|install(?: extension)?|usar no chrome|adicionar ao chrome|instalar(?: extensão)?|añadir a chrome|agregar a chrome|usar en chrome|ajouter à chrome|utiliser dans chrome|zu chrome hinzufügen|in chrome verwenden|aggiungi a chrome|usa in chrome|chrome に追加|chromeに追加|添加至 chrome|加到 chrome|chrome에 추가|chrome'a ekle|tambahkan ke chrome|добавить в chrome|dodaj do chrome|chrome में जोड़ें|chrome میں شامل کریں|إضافة إلى chrome|add to mh browser|installed in mh browser)$/i;
 const warningText=/switch to chrome to install|mude para o chrome para instalar|cambia a chrome para instalar|passez à chrome pour installer|wechseln sie zu chrome|passa a chrome per installare|chrome に切り替え|перейдите в chrome|chrome'a geçerek|beralih ke chrome untuk menginstal|chrome.*install.*extensions and themes/i;
 const chromeLink=/install chrome|install google chrome|instalar o google chrome|instalar google chrome|installer chrome|chrome installieren|installa chrome|chrome をインストール/i;
 function existingButton(){
  for(const node of document.querySelectorAll('button,[role="button"]')){
   if(node.dataset.mhStoreButton==='yes')return node;
   if(installText.test(label(node))||installText.test(node.getAttribute('aria-label')||''))return node;
  }
  return null;
 }
 function hideBanner(){
  for(const node of document.querySelectorAll('div,aside,section,[role="alert"]')){
   if(node.dataset.mhStoreBanner==='yes')continue;
   const t=label(node);
   if(t.length<20||t.length>450||!warningText.test(t))continue;
   let target=node;
   for(let i=0;i<4&&target.parentElement;i++){
    const p=target.parentElement,pt=label(p);
    if(pt.length>500||p.querySelector('[data-mh-store-button="yes"]'))break;
    target=p;
    if(chromeLink.test(pt))break;
   }
   target.dataset.mhStoreBanner='yes';
   target.style.setProperty('display','none','important');
  }
 }
 function update(){
  if(!matchesDetail())return;
  if(state.lastPath!==location.pathname){state.lastPath=location.pathname;state.installed=false}
  const b=existingButton();
  if(b){
   b.dataset.mhStoreButton='yes';
   b.disabled=false;
   b.removeAttribute('disabled');
   b.setAttribute('aria-disabled',state.installed?'true':'false');
   b.style.setProperty('pointer-events','auto','important');
   b.style.setProperty('opacity','1','important');
   b.style.setProperty('cursor',state.installed?'default':'pointer','important');
   b.style.setProperty('background-color',state.installed?'#23784d':'#0b57d0','important');
   b.style.setProperty('color','#fff','important');
   const desired=state.installed?'Installed in MH Browser':'Add to MH Browser';
   if(label(b)!==desired)b.textContent=desired;
   b.title=state.installed?'Installed in MH Browser':'Install this extension directly in MH Browser';
  }
  hideBanner();
 }
 if(!state.listener){
  state.listener=true;
  document.addEventListener('click',e=>{
   const b=e.target?.closest?.('[data-mh-store-button="yes"]');
   if(!b||!matchesDetail())return;
   e.preventDefault();e.stopImmediatePropagation();
   if(!state.installed)window.open('mh-browser-extension://install','_blank');
  },true);
  window.addEventListener('mh-extension-installed',()=>{state.installed=true;update()});
  window.addEventListener('mh-extension-uninstalled',()=>{state.installed=false;update()});
  let pending=false;
  const observer=new MutationObserver(()=>{
   if(pending)return;
   pending=true;
   setTimeout(()=>{pending=false;update()},220);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','aria-disabled']});
  window.addEventListener('popstate',()=>setTimeout(update,100));
 }
 update();
}
function overlayScript(){return '('+pageControl.toString()+')()'}
module.exports={overlayScript};
