'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const AdmZip=require('adm-zip');
const store=require('../chrome-store');
const id='aapbdbdomjkkjkaonfhkkikfgjllcleb';
assert.equal(store.extensionIdFromURL('https://chromewebstore.google.com/detail/google-translate/'+id),id);
assert.equal(store.extensionIdFromURL('https://chromewebstore.google.com/detail/'+id+'?hl=en'),id);
assert.equal(store.extensionIdFromURL('https://evil.example/detail/name/'+id),null);
assert.equal(store.extensionIdFromURL('https://chromewebstore.google.com/category/extensions'),null);
assert.equal(store.extensionIdFromURL('javascript:alert(1)'),null);
const zip=new AdmZip();
zip.addFile('manifest.json',Buffer.from(JSON.stringify({name:'CI Test Extension',version:'1.0.0',manifest_version:3})));
zip.addFile('content.js',Buffer.from('console.log("test");'));
const bytes=zip.toBuffer();
const header=Buffer.alloc(12);
header.write('Cr24',0,'ascii');header.writeUInt32LE(3,4);header.writeUInt32LE(0,8);
const crx=Buffer.concat([header,bytes]);
assert.deepEqual(store._extractZipBytes(crx),bytes);
assert.throws(()=>store._extractZipBytes(Buffer.from('invalid package')),/Invalid/);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mh-crx-test-'));
try{
 const manifest=store._unpack(store._extractZipBytes(crx),dir);
 assert.equal(manifest.name,'CI Test Extension');
 assert.equal(fs.readFileSync(path.join(dir,'content.js'),'utf8'),'console.log("test");');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
console.log('Chrome Web Store ID parsing, CRX3 extraction and unpack validation passed');
