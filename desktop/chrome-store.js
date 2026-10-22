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
 const temp=path.join(root,'.tmp-'+id+'-'+crypto.randomBytes(5).toString('hex'));
 fs.mkdirSync(temp,{recursive:true});
 try{const manifest=unpack(extractZipBytes(buffer),temp);return{temp,dest,manifest}}catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e}
}
module.exports={extensionIdFromURL,prepareExtension,_extractZipBytes:extractZipBytes,_unpack:unpack};
