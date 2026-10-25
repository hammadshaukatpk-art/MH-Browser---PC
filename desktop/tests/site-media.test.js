'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const filename=path.join(__dirname,'..','site-media.js');
const source=fs.readFileSync(filename,'utf8');
const exports={};
const module={exports};
const ctx={module,exports,require(name){if(name==='electron')return{app:{}};return require(name)},process,Buffer,URL,console,setTimeout,clearTimeout};
vm.runInNewContext(source,ctx,{filename});
const site=module.exports;
assert.equal(site.eligible('https://www.youtube.com/watch?v=123'),true);
assert.equal(site.eligible('https://example.com/'),false);
for(const detail of ['ERROR: [youtube] Sign in to confirm you are not a bot. See https://github.com/yt-dlp','HTTP Error 429: Too Many Requests']){
 const message=site.publicError(detail);
 assert.ok(message.includes('signed-in session'));
 assert.ok(!message.includes('yt-dlp'));
 assert.ok(!message.includes('github.com'));
}
assert.ok(site.publicError('Media lookup timed out').includes('too long'));
assert.ok(!site.publicError('Unknown extractor internal error').includes('internal error'));
assert.ok(source.includes("sessionCookieFile(cookies)"),'Both probe and download must use signed-in site session');
assert.ok(source.includes("cleanupCookieFile(cookieFile)"),'Ephemeral site cookies must be cleaned');
console.log('Media fallback errors, native download isolation and temporary session cleanup checks passed');
