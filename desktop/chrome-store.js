'use strict';
// Built-in Chrome Web Store CRX3 import for compatible Electron extensions.
// Not Chrome Web Store's own installation API: Electron does not implement it.
const fs=require('fs'),path=require('path'),https=require('https'),crypto=require('crypto');
const AdmZip=require('adm-zip');
const MAX_PACKAGE=40*1024*1024,MAX_UNPACKED=160*1024*1024;
function extensionIdFromURL(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.hostname!=='chromewebstore.google.com')return null;
  const m=u.pathname.match(/^\/detail\/(?:[^/]+\/)?([a-p]{32})\/?$/i);
  return m?m[1].toLowerCase():null;
 }catch{return null}
}
function trustedDownloadURL(raw){
 const u=new URL(raw);
 return u.protocol==='https:'&&['google.com','googleusercontent.com','gvt1.com','googleapis.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));
}
function download(url,redirects=0){
 if(!trustedDownloadURL(url))return Promise.reject(new Error('Unexpected extension download host'));
 if(redirects>6)return Promise.reject(new Error('Too many extension download redirects'));
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36','Accept':'application/x-chrome-extension,application/octet-stream,*/*'}},res=>{
   const code=res.statusCode||0;
   if([301,302,303,307,308].includes(code)){const next=res.headers.location;res.resume();if(!next){reject(new Error('Missing download redirect'));return}let resolved;try{resolved=new URL(next,url).href}catch(e){reject(e);return}download(resolved,redirects+1).then(resolve,reject);return}
   if(code!==200){res.resume();reject(new Error('Chrome Web Store download returned HTTP '+code));return}
   if(Number(res.headers['content-length']||0)>MAX_PACKAGE){res.destroy();reject(new Error('Extension package is too large'));return}
   const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>MAX_PACKAGE){res.destroy(new Error('Extension package exceeds 40 MB'));return}chunks.push(chunk)});res.on('end',()=>resolve(Buffer.concat(chunks)));res.on('error',reject);
  });req.setTimeout(30000,()=>req.destroy(new Error('Extension download timed out')));req.on('error',reject);
 });
}
function extractZipBytes(buffer){
 if(buffer.subarray(0,4).toString('ascii')==='PK\x03\x04')return buffer;
 if(buffer.subarray(0,4).toString('ascii')!=='Cr24'||buffer.length<16)throw new Error('Invalid Chrome extension package');
 const version=buffer.readUInt32LE(4);
 let offset;
 if(version===3){offset=12+buffer.readUInt32LE(8)}
 else if(version===2){offset=16+buffer.readUInt32LE(8)+buffer.readUInt32LE(12)}
 else throw new Error('Unsupported CRX package version');
 if(offset>=buffer.length||buffer.subarray(offset,offset+4).toString('ascii')!=='PK\x03\x04')throw new Error('Chrome extension archive is missing or corrupt');
 return buffer.subarray(offset);
}

// CRX3 signed packages contain a protobuf header and a signed payload.
// Verify the package against the public key which produces the requested
// Chrome extension ID; otherwise a redirect could install another extension.
function fields(bytes){
 const output=new Map();let pos=0;
 function varint(){let n=0,shift=0;while(pos<bytes.length&&shift<56){const b=bytes[pos++];n+=(b&127)*2**shift;if(!(b&128))return n;shift+=7}throw new Error('Invalid CRX3 protobuf integer')}
 while(pos<bytes.length){
  const tag=varint(),number=Math.floor(tag/8),wire=tag%8;
  if(!number)throw new Error('Invalid CRX3 protobuf field');
  let value;
  if(wire===0)value=varint();
  else if(wire===2){const size=varint();if(size>bytes.length-pos)throw new Error('Invalid CRX3 protobuf length');value=bytes.subarray(pos,pos+size);pos+=size}
  else if(wire===1||wire===5){const size=wire===1?8:4;if(size>bytes.length-pos)throw new Error('Invalid CRX3 protobuf length');value=bytes.subarray(pos,pos+size);pos+=size}
  else throw new Error('Unsupported CRX3 protobuf field');
  if(!output.has(number))output.set(number,[]);output.get(number).push(value);
 }
 return output;
}
function extensionIdFromKey(der){
 const digest=crypto.createHash('sha256').update(der).digest();
 return Array.from(digest.subarray(0,16),b=>String.fromCharCode(97+(b>>>4))+String.fromCharCode(97+(b&15))).join('');
}
function verifyCrx3(buffer,expectedId){
 if(buffer.subarray(0,4).toString('ascii')!=='Cr24'||buffer.length<16||buffer.readUInt32LE(4)!==3)throw new Error('Chrome Web Store did not return a signed CRX3 extension');
 const headerSize=buffer.readUInt32LE(8);
 if(headerSize<1||headerSize>2*1024*1024||headerSize+12>=buffer.length)throw new Error('Invalid signed extension header');
 const header=fields(buffer.subarray(12,12+headerSize));
 const signedHeader=header.get(10000)?.[0];
 if(!Buffer.isBuffer(signedHeader))throw new Error('Missing CRX3 signed extension header');
 const crxId=fields(signedHeader).get(1)?.[0];
 if(!Buffer.isBuffer(crxId)||crxId.length!==16)throw new Error('Invalid signed extension identity');
 const expectedBytes=Buffer.from(Array.from(expectedId,c=>c.charCodeAt(0)-97).reduce((a,n,i)=>{if(i%2===0)a.push(n<<4);else a[a.length-1]|=n;return a},[]));
 if(!crxId.equals(expectedBytes))throw new Error('Downloaded extension ID does not match the selected Chrome Web Store page');
 const zip=buffer.subarray(12+headerSize);
 if(zip.subarray(0,4).toString('ascii')!=='PK\x03\x04')throw new Error('Signed extension ZIP payload is missing');
 const signedPrefix=Buffer.from('CRX3 SignedData\0','ascii');
 const signedLength=Buffer.alloc(4);signedLength.writeUInt32LE(signedHeader.length);
 const payload=Buffer.concat([signedPrefix,signedLength,signedHeader,zip]);
 for(const [number,algorithm] of [[2,'rsa'],[3,'ec']]){
  for(const proof of header.get(number)||[]){
   const f=fields(proof),keyBytes=f.get(1)?.[0],signature=f.get(2)?.[0];
   if(!Buffer.isBuffer(keyBytes)||!Buffer.isBuffer(signature)||extensionIdFromKey(keyBytes)!==expectedId)continue;
   try{
    const key=crypto.createPublicKey({key:keyBytes,format:'der',type:'spki'});
    if(key.asymmetricKeyType!==(algorithm==='rsa'?'rsa':'ec'))continue;
    if(crypto.verify('sha256',payload,key,signature))return{zip,key:keyBytes};
   }catch{}
  }
 }
 throw new Error('Chrome extension signature verification failed');
}

function unpack(zipBytes,folder){
 const zip=new AdmZip(zipBytes),entries=zip.getEntries();
 if(!entries.length||entries.length>3000)throw new Error('Invalid number of extension files');
 let total=0;
 for(const entry of entries){
  const raw=entry.entryName.replace(/\\/g,'/');
  const parts=raw.split('/');
  if(!raw||raw.startsWith('/')||parts.some(p=>p==='..'||p==='.')||/^[a-z]:/i.test(raw)||raw.includes('\0'))throw new Error('Unsafe extension archive path');
  const target=path.resolve(folder,raw);
  if(target!==folder&&!target.startsWith(folder+path.sep))throw new Error('Unsafe extension archive path');
  const mode=(entry.header.attr>>>16)&0o170000;
  if(mode===0o120000)throw new Error('Extension archive contains a symbolic link');
  if(entry.isDirectory){fs.mkdirSync(target,{recursive:true});continue}
  total+=entry.header.size;if(total>MAX_UNPACKED||entry.header.size>MAX_PACKAGE)throw new Error('Extension archive expands beyond allowed size');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const data=entry.getData();
  if(data.length>MAX_PACKAGE)throw new Error('Extension file too large');
  fs.writeFileSync(target,data,{flag:'wx'});
 }
 const manifestPath=path.join(folder,'manifest.json');
 if(!fs.existsSync(manifestPath))throw new Error('Chrome extension manifest.json is missing');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(!manifest.name||![2,3].includes(manifest.manifest_version))throw new Error('Unsupported Chrome extension manifest');
 return manifest;
}
async function prepareExtension({id,userData,chromeVersion}){
 if(!/^[a-p]{32}$/.test(id))throw new Error('Invalid Chrome Web Store extension ID');
 const root=path.join(userData,'Extensions');fs.mkdirSync(root,{recursive:true});
 const dest=path.join(root,id);
 if(fs.existsSync(dest))throw new Error('This extension is already downloaded. Remove it before reinstalling.');
 const version=String(chromeVersion||'131.0.0.0').replace(/[^\d.]/g,'')||'131.0.0.0';
 const url='https://clients2.google.com/service/update2/crx?response=redirect&prodversion='+encodeURIComponent(version)+'&acceptformat=crx3&x='+encodeURIComponent('id='+id+'&uc');
 const buffer=await download(url);
 const verified=verifyCrx3(buffer,id);
 const temp=path.join(root,'.tmp-'+id+'-'+crypto.randomBytes(5).toString('hex'));
 fs.mkdirSync(temp,{recursive:true});
 try{
  const manifest=unpack(verified.zip,temp);
  // Keep Chromium's original ID (derived from the CRX signing key)
  // rather than letting Electron derive a different ID from a temp path.
  if(manifest.key&&manifest.key!==verified.key.toString('base64'))throw new Error('Manifest public key differs from signed CRX3 identity');
  manifest.key=verified.key.toString('base64');
  fs.writeFileSync(path.join(temp,'manifest.json'),JSON.stringify(manifest,null,2));
  return{temp,dest,manifest};
 }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e}
}
module.exports={extensionIdFromURL,prepareExtension,_extractZipBytes:extractZipBytes,_unpack:unpack,_verifyCrx3:verifyCrx3,_extensionIdFromKey:extensionIdFromKey};
