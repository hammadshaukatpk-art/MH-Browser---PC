'use strict';
// Windows Electron integration test: extension loading, stable ID and removal.
const {app,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const { _extensionIdFromKey }=require('../chrome-store');
app.whenReady().then(async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mh-extension-smoke-'));
 try{
  const {publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  const key=publicKey.export({format:'der',type:'spki'});
  fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({
   manifest_version:3,name:'MH Browser Extension Smoke',version:'1.0.0',
   key:key.toString('base64'),action:{default_popup:'popup.html'},
   content_scripts:[{matches:['https://example.com/*'],js:['content.js']}]
  }));
  fs.writeFileSync(path.join(root,'popup.html'),'<!doctype html><title>Extension smoke</title><p>Extension loaded</p>');
  fs.writeFileSync(path.join(root,'content.js'),'window.__mhExtensionSmoke=true;');
  const ses=session.fromPartition('persist:mh-extension-smoke');
  const ext=await ses.loadExtension(root,{allowFileAccess:false});
  assert.equal(ext.id,_extensionIdFromKey(key),'Loaded extension must retain its signed public-key ID');
  assert.equal(ext.name,'MH Browser Extension Smoke');
  assert.equal(ses.getAllExtensions().length,1);
  ses.removeExtension(ext.id);
  assert.equal(ses.getAllExtensions().length,0);
  console.log('MH Browser Electron extension load, ID, popup manifest and removal smoke test passed');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
 app.quit();
}).catch(error=>{console.error('Extension integration smoke test FAILED:',error);process.exitCode=1;app.quit()});
