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

const crypto=require('node:crypto');
function vi(n){const out=[];while(n>127){out.push((n&127)|128);n=Math.floor(n/128)}out.push(n);return Buffer.from(out)}
function pb(number,data){return Buffer.concat([vi(number*8+2),vi(data.length),data])}
const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const der=publicKey.export({type:'spki',format:'der'});
const signedId=store._extensionIdFromKey(der);
const digest=crypto.createHash('sha256').update(der).digest().subarray(0,16);
const signedHeader=pb(1,digest);
const length=Buffer.alloc(4);length.writeUInt32LE(signedHeader.length);
const message=Buffer.concat([Buffer.from('CRX3 SignedData\0','ascii'),length,signedHeader,bytes]);
const signature=crypto.sign('sha256',message,privateKey);
const proof=Buffer.concat([pb(1,der),pb(2,signature)]);
const crxHeader=Buffer.concat([pb(2,proof),pb(10000,signedHeader)]);
const h=Buffer.alloc(12);h.write('Cr24',0,'ascii');h.writeUInt32LE(3,4);h.writeUInt32LE(crxHeader.length,8);
const signedCrx=Buffer.concat([h,crxHeader,bytes]);
assert.equal(store._verifyCrx3(signedCrx,signedId).key.toString('base64'),der.toString('base64'));
assert.throws(()=>store._verifyCrx3(signedCrx,id),/does not match/);
const tampered=Buffer.from(signedCrx);tampered[tampered.length-2]^=1;
assert.throws(()=>store._verifyCrx3(tampered,signedId),/signature verification failed/);
assert.throws(()=>store._verifyCrx3(bytes,signedId),/signed CRX3/);

console.log('Chrome Web Store parsing, signed CRX3 verification, tamper rejection and unpack validation passed');
