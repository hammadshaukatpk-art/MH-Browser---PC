'use strict';
// Runs only with --mh-smoke-navigation in CI. Tests real click -> navigation
// and Back behavior using two distinct local website origins.
const http=require('node:http');
const assert=require('node:assert/strict');
function listen(handler){return new Promise((resolve,reject)=>{const server=http.createServer(handler);server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server))})}
function close(server){return new Promise(resolve=>server.close(()=>resolve()))}
function urlOf(server){return 'http://127.0.0.1:'+server.address().port}
async function waitFor(wc,target,ms=9000){
 if(wc.getURL()===target)return;
 await new Promise((resolve,reject)=>{
  let timer;const done=()=>{clearTimeout(timer);wc.removeListener('did-navigate',check);wc.removeListener('did-navigate-in-page',check)};
  const check=()=>{if(wc.getURL()===target){done();resolve()}};
  timer=setTimeout(()=>{done();reject(new Error('Navigation timeout waiting for '+target+' (actual '+wc.getURL()+')'))},ms);
  wc.on('did-navigate',check);wc.on('did-navigate-in-page',check);
 });
}
async function run({tab,navigate,canBack,goBack,tabs}){
 let first,second;
 try{
  second=await listen((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><title>Second site</title><p>Cross-site destination</p>')});
  first=await listen((req,res)=>{
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   res.end('<!doctype html><title>First site</title><a id="more" target="_blank" href="'+urlOf(second)+'/more">View more</a><a id="normal" href="/details">Download details</a>');
  });
  const wc=tab.view.webContents,initialTabs=tabs.size;
  const firstURL=urlOf(first)+'/',otherURL=urlOf(second)+'/more',detailsURL=urlOf(first)+'/details';
  navigate(tab,firstURL);await waitFor(wc,firstURL);
  await wc.executeJavaScript('document.getElementById("more").click()',true);
  await waitFor(wc,otherURL);
  assert.equal(tabs.size,initialTabs,'ordinary target=_blank hyperlink must stay in current tab');
  assert.equal(canBack(wc),true,'cross-site navigation must enable Back');
  assert.equal(goBack(wc),true);await waitFor(wc,firstURL);
  await wc.executeJavaScript('document.getElementById("normal").click()',true);
  await waitFor(wc,detailsURL);
  assert.equal(canBack(wc),true,'normal hyperlink must enable Back');
  assert.equal(goBack(wc),true);await waitFor(wc,firstURL);
  return true;
 }finally{if(first)await close(first);if(second)await close(second)}
}
module.exports={run};
