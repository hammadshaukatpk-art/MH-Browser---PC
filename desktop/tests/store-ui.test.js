'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {overlayScript}=require('../store-ui');
const script=overlayScript();
new Function(script);
assert.equal(script.includes('document.createElement'),false,'Must not add a floating installation button');
function run(originalLabel,bannerLabel){
 const handlers={},events={};let opened='';
 const button={
  innerText:originalLabel,textContent:originalLabel,disabled:true,dataset:{},
  attributes:{disabled:'', 'aria-disabled':'true'},
  style:{setProperty(key,value){this[key]=value}},
  getAttribute(key){return this.attributes[key]??null},
  hasAttribute(key){return Object.hasOwn(this.attributes,key)},
  removeAttribute(key){delete this.attributes[key]},
  setAttribute(key,value){this.attributes[key]=value},
  closest(selector){return selector==='[data-mh-store-button="yes"]'&&this.dataset.mhStoreButton==='yes'?this:null}
 };
 const banner={
  innerText:bannerLabel,textContent:bannerLabel,dataset:{},
  style:{setProperty(key,value){this[key]=value}},
  querySelector(){return null},parentElement:null
 };
 const document={
  documentElement:{},
  querySelectorAll(selector){
   if(selector==='button,[role="button"]')return [button];
   if(selector==='div,aside,section,[role="alert"]')return [banner];
   return [];
  },
  addEventListener(name,handler){handlers[name]=handler}
 };
 const window={
  open(url){opened=url},
  addEventListener(name,handler){events[name]=handler}
 };
 const context={window,document,location:{hostname:'chromewebstore.google.com',pathname:'/detail/volume-booster/ejiikneibegknkgjimmihdpcbcedgmpo'},MutationObserver:class{observe(){}},setTimeout(){},console};
 vm.runInNewContext(script,context);
 assert.equal(button.dataset.mhStoreButton,'yes');
 assert.equal(button.disabled,false);
 assert.equal(button.hasAttribute('disabled'),false);
 assert.equal(button.getAttribute('aria-disabled'),'false');
 assert.equal(button.textContent,'Add to MH Browser');
 assert.equal(banner.style.display,'none');
 let stopped=false;
 handlers.click({target:button,preventDefault(){stopped=true},stopImmediatePropagation(){stopped=true}});
 assert.equal(stopped,true);
 assert.equal(opened,'mh-browser-extension://install');
 events['mh-extension-installed']();
 assert.equal(button.textContent,'Installed in MH Browser');
}
run('Usar no Chrome','Mude para o Chrome para instalar extensões e temas Instalar o Google Chrome');
run('Add to Chrome','Switch to Chrome to install extensions and themes Install Chrome');
console.log('Chrome Web Store existing-button integration and Portuguese/English banner hiding passed');
