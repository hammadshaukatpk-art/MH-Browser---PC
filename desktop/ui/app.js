'use strict';
const $=id=>document.getElementById(id);document.querySelectorAll('img[src="assets/mh-logo-clean.png"]').forEach(img=>img.addEventListener('error',()=>{img.src='assets/mh-logo.webp'},{once:true}));let snapshot={tabs:[],active:null},panel=null,filter='All',downloads=[],bookmarks=[],history=[],shortcuts=[],settings={},selectedDownloads=new Set(),downloadSelecting=false,selectedHistory=new Set(),historySelecting=false,mediaResult=null,mediaUrl='';
const call=(action,data)=>window.mh.call(action,data);
function themedDialog(kind,message,initial=''){return new Promise(resolve=>{
 const backdrop=$('dialogBackdrop'),title=$('dialogTitle'),body=$('dialogMessage'),input=$('dialogInput'),ok=$('dialogOK'),cancel=$('dialogCancel');
 title.textContent=kind==='prompt'?'MH Browser · Enter details':kind==='confirm'?'MH Browser · Confirmation':'MH Browser · Notice';
 body.textContent=String(message);input.hidden=kind!=='prompt';input.value=initial;cancel.hidden=kind==='alert';ok.textContent=kind==='alert'?'OK':kind==='prompt'?'Save':'Continue';
 backdrop.hidden=false;call('dialog-visible',true).catch(()=>{});let done=false;const finish=result=>{if(done)return;done=true;backdrop.hidden=true;call('dialog-visible',false).catch(()=>{});ok.onclick=null;cancel.onclick=null;document.removeEventListener('keydown',keys,true);resolve(result)};
 const keys=e=>{if(e.key==='Escape'){e.preventDefault();finish(kind==='prompt'?null:false)}if(e.key==='Enter'){e.preventDefault();finish(kind==='prompt'?input.value:true)}};
 ok.onclick=()=>finish(kind==='prompt'?input.value:true);cancel.onclick=()=>finish(kind==='prompt'?null:false);document.addEventListener('keydown',keys,true);(kind==='prompt'?input:ok).focus();
})}
const askConfirm=message=>themedDialog('confirm',message),askText=(message,initial='')=>themedDialog('prompt',message,initial),notice=message=>themedDialog('alert',message);function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function button(label,action,cls){const b=el('button',cls,label);b.onclick=action;return b}
function navigate(v){call('go',v);hidePanel()}
function hidePanel(){$('panel').hidden=true;panel=null;call('panel-visible',false)}
function renderTabs(){const host=$('tabs');host.replaceChildren();for(const t of snapshot.tabs){const wrap=el('div','tab'+(t.id===snapshot.active?' active':'')+(t.private?' private':''));wrap.append(button((t.private?'◈ Private • ':'')+(t.loading?'◌ ':'')+t.title,()=>call('switch',t.id),'name'));wrap.append(button('×',()=>call('close',t.id),'close'));host.append(wrap)}host.append(button('+',()=>call('new',false)));const t=snapshot.tabs.find(x=>x.id===snapshot.active);document.body.classList.toggle('private',!!t?.private);$('privateIntro').hidden=!t?.private;$('quickTitle').hidden=!!t?.private;$('shortcuts').hidden=!!t?.private;$('searchForm').hidden=!!t?.private;$('address').value=t?.url==='mh://home'?'':t?.url||'';$('favorite').textContent=t?.favorite?'★':'☆';$('media').hidden=!t?.media;$('back').disabled=!t?.back;$('forward').disabled=!t?.forward}
function renderHome(){const host=$('shortcuts');host.replaceChildren();for(let i=0;i<shortcuts.length;i++){const s=shortcuts[i],tile=el('div','shortcut');const img=el('img');const localIcons={'web.whatsapp.com':'whatsapp.svg','www.instagram.com':'instagram.svg','www.pinterest.com':'pinterest.svg','www.google.com':'google-g.svg','google.com':'google-g.svg'};try{const u=new URL(s.url);img.src=localIcons[u.hostname]?'assets/'+localIcons[u.hostname]:'https://www.google.com/s2/favicons?domain='+encodeURIComponent(u.hostname)+'&sz=64'}catch{}img.onerror=()=>img.remove();img.title='Open '+s.title;img.style.cursor='pointer';img.onclick=()=>navigate(s.url);tile.append(img,button(s.title,()=>navigate(s.url)));tile.append(button('Remove',async()=>{shortcuts=await call('remove-shortcut',i);renderHome()},'secondary'));host.append(tile)}const plus=button('+ Add Shortcut',async()=>{const title=await askText('Shortcut name');if(title===null)return;const url=await askText('Website URL');if(!url)return;shortcuts=await call('add-shortcut',{title,url});renderHome()},'shortcut');host.append(plus)}
const dateLabel=t=>new Date(t).toLocaleString();function within(t){const now=new Date(),d=new Date(t),mid=new Date(now.getFullYear(),now.getMonth(),now.getDate());if(filter==='All')return true;if(filter==='Custom')return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')===window.mhDate;if(filter==='Today')return d>=mid;if(filter==='Previous Day')return d>=new Date(mid.getTime()-86400000)&&d<mid;if(filter==='Week')return d>=new Date(mid.getTime()-7*86400000);if(filter==='Monthly')return d>=new Date(now.getFullYear(),now.getMonth(),1);if(filter==='Yearly')return d>=new Date(now.getFullYear(),0,1);return true}
function filters(host){const bar=el('div','filter');['Today','Previous Day','Week','Monthly','Yearly','All'].forEach(f=>bar.append(button(f,()=>{filter=f;renderPanel()},f===filter?'chosen':'')));host.append(bar)}
async function showPanel(name){panel=name;$('panel').scrollTop=0;$('panel').hidden=false;call('panel-visible',true);$('panelTitle').textContent=({downloads:'Downloads',history:'History',bookmarks:'Bookmarks',settings:'Settings',menu:'Menu',media:'Media downloads',proxy:'Proxy settings',network:'Network diagnostics',profile:'Google Account',extensions:'Extensions',about:'About MH Browser'})[name]||name;await refreshPanel();if(name==='media'){const t=snapshot.tabs.find(x=>x.id===snapshot.active);mediaUrl=t?.url||'';mediaResult=null;renderPanel();try{mediaResult=await call('media-formats',mediaUrl);if(panel==='media')renderPanel()}catch(e){mediaResult={error:e.message||String(e)};if(panel==='media')renderPanel()}}}
async function refreshPanel(){if(panel==='downloads')downloads=await call('downloads');if(panel==='history')history=await call('history');if(panel==='bookmarks')bookmarks=await call('bookmarks');if(panel==='shortcuts')shortcuts=await call('shortcuts');renderPanel()}
function entry(host,title,detail,actions=[]){const e=el('div','entry');e.append(el('strong',null,title),el('small',null,detail));const buttons=el('div','actions');for(const [text,fn]of actions)buttons.append(button(text,fn));e.append(buttons);host.append(e)}
function renderPanel(){const host=$('panelContent');host.replaceChildren();if(panel==='menu'){
const section=title=>host.append(el('div','menu-group',title));
const descriptions={'New tab':'Open a new browsing tab','New private tab':'Separate private browsing session','Bookmarks':'Saved websites and quick access','History':'Find and remove visited pages','Downloads':'Files, filters and selective deletion','Extensions':'Installed add-ons and toolbar icons','Find on page':'Search within the current page','Print':'Print the active page','Save page':'Save a complete webpage','Translate page':'Translate using Google Translate','Desktop / Mobile site':'Switch website layout','Copy page link':'Copy current website address','Clear browsing data':'Clear cookies and browsing history','Settings':'Privacy, proxy, themes and network','About MH Browser':'Version and developer information'};
const item=(symbol,title,shortcut,action)=>{const b=el('button','menu-row'),words=el('span','menu-title-wrap');words.append(el('span','menu-title',title),el('small','menu-description',descriptions[title]||''));b.append(el('span','menu-icon',symbol),words,el('span','menu-shortcut',shortcut||''));b.onclick=action;host.append(b)};
const action=(name,data,close=true)=>async()=>{try{await call(name,data);if(close)hidePanel()}catch(e){notice(e.message||String(e))}};
section('Browsing');
item('＋','New tab','Ctrl+T',action('new',false));
item('◈','New private tab','Ctrl+Shift+N',action('new',true));
section('Your browser');
item('☆','Bookmarks','',()=>showPanel('bookmarks'));
item('◷','History','Ctrl+H',()=>showPanel('history'));
item('▤','Clear your browsing history','Ctrl+Shift+Del',async()=>{if(await askConfirm('Clear all saved browsing history? Website cookies and saved downloads will remain.')){await call('clear-history');hidePanel();await notice('Browsing history cleared')}});
item('⇩','Downloads','Ctrl+J',()=>showPanel('downloads'));
item('▣','Extensions','',()=>showPanel('extensions'));
section('Page tools');
item('⌕','Find on page','Ctrl+F',async()=>{hidePanel();const q=await askText('Find in page');if(q)call('find',q)});
item('⎙','Print','Ctrl+P',action('print'));
item('▣','Save page','Ctrl+S',action('save-page'));
item('文','Translate page','',action('translate'));
item('⇄','Desktop / Mobile site','',action('desktop-site'));
item('↗','Copy page link','',action('share'));
section('Zoom and display');
const zoom=el('div','zoom-control'),minus=button('−',async()=>{await call('zoom',-.1);updateZoom()},'secondary'),value=el('strong',null,'100%'),plus=button('+',async()=>{await call('zoom',.1);updateZoom()},'secondary'),full=button('⛶',action('fullscreen'),'secondary');
const updateZoom=async()=>{try{value.textContent=Math.round(await call('zoom-level')*100)+'%'}catch{}};zoom.append(el('span',null,'Zoom'),minus,value,plus,full);host.append(zoom);updateZoom();
section('Privacy and settings');
item(settings.theme==='dark'?'☼':'☾',settings.theme==='dark'?'Switch to light theme':'Switch to dark theme','',async()=>{settings=await call('settings',{theme:settings.theme==='dark'?'light':'dark'});applyTheme();renderPanel()});
item('⚙','Settings','',()=>showPanel('settings'));
item('ⓘ','About MH Browser','',()=>showPanel('about'));
return}
if(panel==='profile'){
 const card=el('div','profile-card'),avatar=el('div','profile-avatar'),g=el('img');g.src='assets/google-g.svg';g.alt='Google';avatar.append(g);const detail=el('div');detail.append(el('strong',null,'Google Account'),el('small',null,'Google website sign-in'));card.append(avatar,detail);host.append(card);
 const link=(label,url)=>host.append(button(label,()=>navigate(url),'account-action'));
 link('Sign in to Google','https://accounts.google.com/');
 link('Manage Google Account','https://myaccount.google.com/');
 link('Open Gmail','https://mail.google.com/');
 link('Open YouTube','https://www.youtube.com/');
 host.append(button('Sign out of Google websites',async()=>{if(await askConfirm('Open Google sign-out page?')){await call('google-signout');hidePanel()}},'account-action'));
 host.append(el('p','profile-note','Google may offer a passkey or Windows Security prompt. If you prefer a password, cancel that prompt and select “Try another way” on Google’s page, when available. MH Browser cannot disable Google’s verification requirements.'));
 return}
if(panel==='extensions'){
 host.append(el('h3','extensions-heading','Chrome Web Store Extensions'));
 const tools=el('div','extensions-actions');
 tools.append(button('Chrome Web Store ↗',()=>call('external','https://chromewebstore.google.com/'),'secondary'));
 tools.append(button('Load unpacked extension',async()=>{try{await call('load-extension');renderPanel()}catch(e){await notice(e.message)}},'action'));
 host.append(tools);
 host.append(el('h4','extensions-subheading','Installed extensions'));
 const list=el('div','extensions-list');host.append(list);
 call('extensions').then(items=>{if(panel!=='extensions')return;if(!items.length){list.append(el('p','empty-state','No extensions installed.'));return}for(const ext of items){const row=el('div','extension-row'),name=el('div','setting-words');name.append(el('strong',null,ext.name),el('small',null,'Version '+ext.version));row.append(name,button('Remove',async()=>{if(await askConfirm('Remove '+ext.name+'?')){await call('remove-extension',ext.id);renderPanel()}},'secondary'));list.append(row)}}).catch(e=>notice(e.message));
 host.append(el('p','extensions-note','Compatible unpacked Chromium extensions can be loaded. Direct Chrome Web Store installation is not yet supported.'));
 return}
if(panel==='about'){
 const head=el('div','about-brand'),logo=el('img');logo.src='assets/mh-logo-clean.png';logo.alt='MH Browser';const names=el('div');names.append(el('h3',null,'MH Browser'),el('small',null,'Version 1.0.0'));head.append(logo,names);host.append(head);
 const info=el('div','about-information');const row=(label,value)=>{const r=el('div','about-row');r.append(el('span',null,label),el('strong',null,value));info.append(r)};row('Company','MasoomDev');row('Developer','MH Developers');host.append(info);return}
if(panel==='proxy'){
 const proxy=settings.proxy||{},form=el('form','proxy-form'),fields={};
 const enabledRow=el('label','proxy-switch'),enabled=el('input');enabled.type='checkbox';enabled.checked=!!proxy.active;
 enabledRow.append(el('strong',null,'Use a proxy server'),enabled);form.append(enabledRow);
 const addField=(name,label,kind,placeholder)=>{const wrap=el('label','proxy-field');wrap.append(el('span',null,label));const input=el(kind==='select'?'select':'input');if(kind!=='select')input.type=kind;input.placeholder=placeholder||'';input.value=proxy[name]||'';wrap.append(input);fields[name]=input;return wrap};
 const pair=el('div','proxy-pair');const protocol=addField('scheme','Protocol','select');for(const p of ['http','https','socks5']){const opt=el('option',null,p.toUpperCase());opt.value=p;fields.scheme.append(opt)}fields.scheme.value=proxy.scheme||'http';pair.append(protocol,addField('port','Port','number','8080'));form.append(pair);
 form.append(addField('host','Server address / IP','text','proxy.example.com'));
 form.append(addField('user','Username (optional)','text','Proxy username'));
 form.append(addField('password','Password (session only)','password','Proxy password'));
 form.append(el('p','proxy-hint','Proxy credentials are kept in memory for this browser session. Changes apply to active browsing sessions.'));
 form.append(button('Apply proxy settings',async()=>{try{const p={active:enabled.checked,scheme:fields.scheme.value,host:fields.host.value.trim(),port:fields.port.value.trim(),user:fields.user.value,password:fields.password.value};settings.proxy=await call('proxy',p);await notice('Proxy settings saved.');showPanel('settings')}catch(e){notice(e.message)}},'action'));
 form.onsubmit=e=>e.preventDefault();host.append(form);return}
if(panel==='network'){host.append(el('p',null,'Checking network interfaces…'));call('network').then(data=>{if(panel!=='network')return;host.replaceChildren();entry(host,'System',data.platform+' '+data.release+' • '+data.timezone+' • '+data.locale);for(const row of data.interfaces)entry(host,row.name,row.address);host.append(button('Look up public IP and approximate region',async()=>{if(!await askConfirm('This sends your public IP to ipwho.is. Continue?'))return;try{const result=await call('public-ip');entry(host,result.ip,[result.city,result.region,result.country].filter(Boolean).join(', '))}catch(e){notice(e.message)}},'secondary'))});return}
if(panel==='media'){
 if(!mediaResult){host.append(el('p','media-loading','Checking available media formats…'));return}
 if(mediaResult.error){host.append(el('p','media-status','Media detection unavailable: '+mediaResult.error));return}
 const header=el('div','media-heading');header.append(el('strong',null,mediaResult.title||'Detected media'));host.append(header);
 if(!mediaResult.choices?.length){host.append(el('p','media-status','No downloadable media found. Start playback, then reopen Media. Some websites require sign-in or protect their streams.'));return}
 const videos=mediaResult.choices.filter(c=>c.type!=='audio'),audios=mediaResult.choices.filter(c=>c.type==='audio');
 for(const [heading,rows] of [['Video downloads',videos],['Audio downloads',audios]]){if(!rows.length)continue;host.append(el('div','media-section-title',heading));for(const choice of rows){const row=el('button','media-choice');const label=el('span','media-choice-label');label.append(el('strong',null,choice.label),el('small',null,choice.description||''));row.append(el('span','media-choice-icon',choice.type==='audio'?'♫':'▶'),label,el('span','media-choice-download','↓'));row.onclick=async()=>{try{await call('media-start',{url:mediaUrl,choice});showPanel('downloads')}catch(e){notice('Cannot start download: '+e.message)}};host.append(row)}}
 return}
if(panel==='settings'){
 const category=(name,subtitle)=>{const details=el('details','settings-category');const summary=el('summary','settings-category-head');const words=el('span','setting-words');words.append(el('strong',null,name),el('small',null,subtitle));summary.append(words,el('span','settings-chevron','⌄'));details.append(summary);const body=el('div','settings-category-body');details.append(body);host.append(details);return body};
 const toggle=(target,key,title,description)=>{const row=el('label','setting-toggle'),words=el('span','setting-words');words.append(el('strong',null,title),el('small',null,description));const check=el('input');check.type='checkbox';check.checked=!!settings[key];check.onchange=async()=>{try{settings=await call('settings',{[key]:check.checked});if(['javascript','desktopDefault'].includes(key))await notice('This change applies to newly opened tabs.')}catch(e){check.checked=!check.checked;await notice(e.message)}};row.append(words,check);target.append(row)};
 const link=(target,title,description,action)=>{const b=el('button','setting-link'),words=el('span','setting-words');words.append(el('strong',null,title),el('small',null,description));b.append(words,el('span','settings-chevron','›'));b.onclick=action;target.append(b)};
 const general=category('General','Tabs, websites and browsing preferences');
 toggle(general,'restoreTabs','Restore previous tabs','Reopen normal tabs when the browser starts');
 toggle(general,'desktopDefault','Desktop site by default','Use desktop layouts for new tabs');
 toggle(general,'javascript','Enable JavaScript','Required by many interactive websites');
 toggle(general,'images','Load website images','Display images on visited websites');
 const appearance=category('Appearance','MH Browser colors and display');
 link(appearance,settings.theme==='dark'?'Dark theme':'Light theme','Change MH Browser theme',async()=>{settings=await call('settings',{theme:settings.theme==='dark'?'light':'dark'});applyTheme();renderPanel()});
 const privacy=category('Privacy and security','Website permissions and browsing data');
 toggle(privacy,'adblock','Block known ad domains','Built-in domain filtering');
 toggle(privacy,'trackers','Block known trackers','Limited built-in tracker list');
 toggle(privacy,'dnt','Send Do Not Track','Request websites not to track your browsing');
 toggle(privacy,'allowLocation','Allow location requests','Each website still needs permission');
 link(privacy,'Clear browsing data','Remove cookies, cache and history',async()=>{if(await askConfirm('Clear browsing data?')){await call('clear-data');await notice('Browsing data cleared')}});
 const tools=category('Tools and advanced','Proxy, extensions, downloads and diagnostics');
 link(tools,'Proxy settings','HTTP, HTTPS and SOCKS5',()=>showPanel('proxy'));
 link(tools,'Network diagnostics','Check network and IP information',()=>showPanel('network'));
 link(tools,'Downloads','Manage downloaded files',()=>showPanel('downloads'));
 link(tools,'Browsing history','Find and delete selected visits',()=>showPanel('history'));
 link(tools,'Extensions','Manage installed extensions',()=>showPanel('extensions'));
 const information=category('Information','Version and developer');
 link(information,'About MH Browser','Company and developer information',()=>showPanel('about'));
 return}
if(panel==='downloads'){filters(host);const tools=el('div','filter');tools.append(button(downloadSelecting?'Done selecting':'Select downloads',()=>{downloadSelecting=!downloadSelecting;selectedDownloads.clear();renderPanel()},'secondary'));if(downloadSelecting)tools.append(button('Select all',()=>{const visible=downloads.filter(d=>within(d.start)).map(d=>d.id);const all=visible.every(id=>selectedDownloads.has(id));for(const id of visible)all?selectedDownloads.delete(id):selectedDownloads.add(id);renderPanel()},'secondary'));if(downloadSelecting)tools.append(button('Delete selected ('+selectedDownloads.size()+')',async()=>{if(!selectedDownloads.size)return;if(!await askConfirm('Delete '+selectedDownloads.size+' selected downloaded files?'))return;let failures=0;for(const id of [...selectedDownloads]){try{await call('delete-download',id)}catch(e){failures++;await notice('Cannot delete '+id+': '+e.message)}}selectedDownloads.clear();downloadSelecting=false;await refreshPanel();if(failures)await notice(failures+' file(s) could not be deleted.')},'secondary'));const dateWrap=el('label','date-control');dateWrap.append(el('span',null,'Date'));const date=el('input');date.type='date';date.setAttribute('aria-label','Filter by date');date.value=window.mhDate||'';date.onchange=()=>{window.mhDate=date.value;filter=date.value?'Custom':'All';renderPanel()};dateWrap.append(date);host.append(tools,dateWrap);if(!downloads.filter(d=>within(d.start)).length)host.append(el('div','empty-state','No downloads for this period.'));for(const d of downloads.filter(d=>within(d.start))){const wrap=el('div');if(downloadSelecting){const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=selectedDownloads.has(d.id);checkbox.onchange=()=>{checkbox.checked?selectedDownloads.add(d.id):selectedDownloads.delete(d.id);renderPanel()};wrap.append(checkbox)}entry(wrap,d.name,d.status+' · '+dateLabel(d.start)+' · '+(d.total?Math.round(d.received/d.total*100)+'%':'Size unknown'),[['Open',()=>call('open-download',d.id)],['Folder',()=>call('show-download',d.id)],...(d.status==='Downloading'?[...(d.type==='stream'?[]:[['Pause',()=>call('pause-download',d.id)]]),['Cancel',()=>call('cancel-download',d.id)]]:d.status==='Paused'?[['Resume',()=>call('resume-download',d.id)]]:[]),['Remove',async()=>{await call('remove-download',d.id);refreshPanel()}],['Delete file',async()=>{if(await askConfirm('Delete downloaded file permanently?')){await call('delete-download',d.id);refreshPanel()}}]]);host.append(wrap)}return}
if(panel==='history'){
 filters(host);const tools=el('div','filter');
 tools.append(button(historySelecting?'Done selecting':'Select history',()=>{historySelecting=!historySelecting;selectedHistory.clear();renderPanel()},'secondary'));
 if(historySelecting){tools.append(button('Select all shown',()=>{const visible=history.filter(h=>within(h.at)).map(h=>h.at);const all=visible.every(id=>selectedHistory.has(id));for(const id of visible)all?selectedHistory.delete(id):selectedHistory.add(id);renderPanel()},'secondary'));
 tools.append(button('Delete selected ('+selectedHistory.size()+')',async()=>{if(!selectedHistory.size)return;if(!await askConfirm('Delete '+selectedHistory.size+' selected history entries?'))return;for(const id of selectedHistory)history=await call('remove-history',id);selectedHistory.clear();historySelecting=false;renderPanel()},'secondary'))}
 tools.append(button('Clear all history',async()=>{if(await askConfirm('Clear all browsing history?')){await call('clear-history');history=[];selectedHistory.clear();renderPanel()}},'secondary'));host.append(tools);
 const shown=history.filter(h=>within(h.at));if(!shown.length){host.append(el('p','empty-state','No history for this period.'));return}
 const groups=new Map();for(const h of shown){const day=new Date(h.at).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});if(!groups.has(day))groups.set(day,[]);groups.get(day).push(h)}
 for(const [day,rows] of groups){const heading=el('div','history-group');heading.append(el('strong',null,day));if(historySelecting)heading.append(button('Select period',()=>{const all=rows.every(h=>selectedHistory.has(h.at));for(const h of rows)all?selectedHistory.delete(h.at):selectedHistory.add(h.at);renderPanel()},'secondary'));host.append(heading);
 for(const h of rows){const wrap=el('div','history-entry');if(historySelecting){const check=el('input');check.type='checkbox';check.checked=selectedHistory.has(h.at);check.onchange=()=>{check.checked?selectedHistory.add(h.at):selectedHistory.delete(h.at)};wrap.append(check)}
 entry(wrap,h.title||h.url,dateLabel(h.at)+' · '+h.url,[['Open',()=>navigate(h.url)],['Delete',async()=>{history=await call('remove-history',h.at);selectedHistory.delete(h.at);renderPanel()}]]);host.append(wrap)}}return}
if(panel==='bookmarks'){host.append(button('☆ Save current page',async()=>{const result=await call('bookmark');if(result===false)await notice('Open a website before saving a bookmark.');else{bookmarks=result;renderPanel()}},'action'));for(let i=0;i<bookmarks.length;i++){const b=bookmarks[i];entry(host,b.title,b.url,[['Open',()=>navigate(b.url)],['Delete',async()=>{bookmarks=await call('remove-bookmark',i);renderPanel()}]])}return}}
function renderExtensionToolbar(items){const host=$('extensionTools');host.replaceChildren();for(const ext of (items||[]).slice(0,4)){const b=button(ext.name,async()=>{if(ext.popup){try{await call('extension-popup',ext.id)}catch(e){notice(e.message)}}else showPanel('extensions')},'extension-chip');b.title=ext.name;b.textContent='';if(ext.icon){const img=el('img');img.src=ext.icon;b.append(img)}else b.textContent='🧩';host.append(b)}}
function applyTheme(){document.body.classList.toggle('light',settings.theme==='light');document.body.dataset.theme=settings.theme||'dark'}
$('googleLogin').onclick=()=>showPanel('profile');$('addressForm').onsubmit=e=>{e.preventDefault();navigate($('address').value);$('address').blur()};$('searchForm').onsubmit=e=>{e.preventDefault();navigate($('search').value)};for(const [id,action]of [['back','back'],['forward','forward'],['reload','reload'],['home','home']])$(id).onclick=()=>call(action);$('favorite').onclick=async()=>{bookmarks=await call('bookmark');};$('downloads').onclick=()=>showPanel('downloads');$('media').onclick=()=>showPanel('media');$('menu').onclick=()=>showPanel('menu');$('profileButton').onclick=()=>showPanel('profile');$('extensionsButton').onclick=()=>showPanel('extensions');$('closePanel').onclick=hidePanel;
window.mh.on('tabs',s=>{snapshot=s;renderTabs()});window.mh.on('home',d=>{$('homepage').hidden=!d.active});window.mh.on('downloads',d=>{downloads=d;if(panel==='downloads')renderPanel()});window.mh.on('settings',d=>{settings=d;applyTheme()});window.mh.on('extensions',d=>renderExtensionToolbar(d));window.mh.on('extension-error',d=>notice(d));window.mh.on('permission-request',async d=>{const allow=await askConfirm('Allow '+d.permission+' for '+d.origin+'?');await call('permission-response',{id:d.id,allow})});window.mh.on('panel',name=>showPanel(name));window.mh.on('focus',()=>{$('address').focus();$('address').select()});window.mh.on('find',async()=>{const q=await askText('Find in page');if(q)call('find',q)});document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='l'){e.preventDefault();$('address').focus();$('address').select()}if(e.ctrlKey&&(e.key==='+'||e.key==='='||e.key==='-')){e.preventDefault();call('zoom',e.key==='-'?-.1:.1)}if(e.ctrlKey&&e.key==='0'){e.preventDefault();call('zoom-reset')}});call('init').then(s=>{snapshot=s;settings=s.settings;bookmarks=s.state.bookmarks;history=s.state.history;shortcuts=s.state.shortcuts;downloads=s.downloads;applyTheme();renderTabs();renderHome();call('extensions').then(renderExtensionToolbar).catch(()=>{});$('homepage').hidden=!s.home});
