'use strict';
const {app,BrowserWindow,WebContentsView,ipcMain,session,dialog,shell,Menu,clipboard,nativeTheme}=require('electron');
const fs=require('fs'),path=require('path');
const HOME='mh://home',STATE_FILE='state.json';
let mainWindow,tabs=new Map(),activeId=null,serial=0,privateCount=0,downloads=new Map(),filters=new Set(),settings={theme:'dark',adblock:true,trackers:true,restoreTabs:true};
let state={bookmarks:[],history:[],shortcuts:[{title:'Google',url:'https://www.google.com'},{title:'YouTube',url:'https://www.youtube.com'},{title:'Facebook',url:'https://www.facebook.com'},{title:'WhatsApp',url:'https://web.whatsapp.com'}],tabs:[],active:null};
const userFile=()=>path.join(app.getPath('userData'),STATE_FILE);
function load(){try{const obj=JSON.parse(fs.readFileSync(userFile(),'utf8'));if(obj&&typeof obj==='object'){state={...state,...obj};settings={...settings,...obj.settings}}}catch{}}
function save(){if(!mainWindow)return;state.settings=settings;state.tabs=[...tabs.values()].filter(t=>!t.private).map(t=>({url:t.url===HOME?HOME:t.url}));state.active=tabs.get(activeId)?.private?0:[...tabs.values()].filter(t=>!t.private).findIndex(t=>t.id===activeId);try{fs.writeFileSync(userFile(),JSON.stringify(state,null,2))}catch{}}
function matchHost(host,domain){return host===domain||host.endsWith('.'+domain)}
function blocked(details){if(!settings.adblock&&!settings.trackers)return{};try{const u=new URL(details.url),host=u.hostname.toLowerCase();if(/^(localhost|127\.0\.0\.1)$/.test(host))return{};if(settings.adblock&&[...filters].some(d=>matchHost(host,d)))return{cancel:true};if(settings.trackers&&['google-analytics.com','hotjar.com','clarity.ms','scorecardresearch.com','mixpanel.com'].some(d=>matchHost(host,d)))return{cancel:true}}catch{}return{}}
async function initFilters(){const defaults=['doubleclick.net','googlesyndication.com','googleadservices.com','adnxs.com','taboola.com','outbrain.com','pubmatic.com','popads.net','criteo.com','adsrvr.org','adsterra.com','exoclick.com'];defaults.forEach(d=>filters.add(d));}
function configureSession(s){if(s.__mhSetup)return;s.__mhSetup=true;s.setPermissionRequestHandler((wc,permission,callback)=>{if(permission==='fullscreen'){callback(true);return}const granted=['media','geolocation','notifications','display-capture'].includes(permission);if(!granted){callback(false);return}dialog.showMessageBox(mainWindow,{type:'question',buttons:['Deny','Allow'],defaultId:0,cancelId:0,message:'Allow '+permission+' for '+(wc.getURL()||'this site')+'?'}).then(r=>callback(r.response===1)).catch(()=>callback(false))});s.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(d,cb)=>cb(blocked(d)));s.on('will-download',(_e,item)=>{const id=Date.now()+'-'+Math.random().toString(36).slice(2,7),url=item.getURL(),name=path.basename(item.getFilename()).replace(/[\\/]/g,'_');const location=path.join(app.getPath('downloads'),name);item.setSavePath(location);const row={id,url,name,path:location,start:Date.now(),received:0,total:item.getTotalBytes(),status:'Downloading'};downloads.set(id,{item,row});notify();item.on('updated',()=>{row.received=item.getReceivedBytes();row.total=item.getTotalBytes();row.status=item.isPaused()?'Paused':'Downloading';notify()});item.once('done',(_event,status)=>{row.status=status==='completed'?'Completed':status==='cancelled'?'Cancelled':'Failed';row.received=item.getReceivedBytes();notify()})})}
function notify(){send('downloads',getDownloads())}
function getDownloads(){return [...downloads.values()].map(d=>d.row).sort((a,b)=>b.start-a.start)}
function send(event,data){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('mh:'+event,data)}
function usableURL(value){const s=String(value||'').trim();if(!s||s===HOME)return HOME;if(/^https?:\/\//i.test(s))return s;if(/^about:blank$/i.test(s))return HOME;if(/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(s))return 'https://'+s;return 'https://www.google.com/search?q='+encodeURIComponent(s)}
function metadata(t){return{id:t.id,title:t.title||'New Tab',url:t.url,private:t.private,loading:t.loading,back:t.view.webContents.canGoBack(),forward:t.view.webContents.canGoForward(),favorite:state.bookmarks.some(b=>b.url===t.url)}}
function emit(){send('tabs',{tabs:[...tabs.values()].map(metadata),active:activeId});save()}
function layout(){if(!mainWindow)return;const [w,h]=mainWindow.getContentSize();for(const t of tabs.values()){const selected=t.id===activeId&&t.url!==HOME;t.view.setVisible(selected);if(selected)t.view.setBounds({x:0,y:132,width:Math.max(w,1),height:Math.max(h-132,1)})}send('viewport',{width:w,height:h})}
function hideOrShow(t){if(t.url===HOME){t.view.setVisible(false);send('home',{active:true})}else{send('home',{active:false})}layout()}
function createTab(url=HOME,priv=false,activate=true){const id=++serial,partition=priv?'mh-private-'+id:'persist:mh-regular';const ses=session.fromPartition(partition);configureSession(ses);const view=new WebContentsView({webPreferences:{session:ses,contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});view.setBackgroundColor('#ffffff');mainWindow.contentView.addChildView(view);const t={id,url:HOME,title:'New Tab',private:priv,loading:false,view};tabs.set(id,t);if(priv)privateCount++;const wc=view.webContents;wc.setWindowOpenHandler(({url})=>{createTab(url,priv,true);return{action:'deny'}});wc.on('page-title-updated',(_e,title)=>{t.title=title;emit()});wc.on('did-start-loading',()=>{t.loading=true;emit()});wc.on('did-stop-loading',()=>{t.loading=false;emit()});wc.on('did-navigate',(_e,url)=>navigation(t,url));wc.on('did-navigate-in-page',(_e,url)=>navigation(t,url));wc.on('will-navigate',(e,target)=>{if(!/^https?:/i.test(target)){e.preventDefault();shell.openExternal(target).catch(()=>{})}});wc.on('context-menu',(_e,params)=>{const items=[];if(params.linkURL)items.push({label:'Open Link in New Tab',click:()=>createTab(params.linkURL,priv,true)},{label:'Copy Link',click:()=>clipboard.writeText(params.linkURL)});if(params.selectionText)items.push({label:'Copy',role:'copy'});items.push({label:'Reload',click:()=>wc.reload()},{label:'Inspect',click:()=>wc.openDevTools()});Menu.buildFromTemplate(items).popup({window:mainWindow})});if(activate)activeId=id;if(url!==HOME)navigate(t,url);else hideOrShow(t);emit();return id}
function navigation(t,url){t.url=url;t.title=t.view.webContents.getTitle()||url;const now=Date.now();if(!t.private&&/^https?:/.test(url)){const old=state.history[0];if(!old||old.url!==url||now-old.at>15000)state.history.unshift({url,title:t.title,at:now});state.history=state.history.slice(0,3000)}if(t.id===activeId)hideOrShow(t);emit()}
function navigate(t,value){if(!t)return;const url=usableURL(value);t.url=url;if(url===HOME){t.title='New Tab';t.view.webContents.loadURL('about:blank');hideOrShow(t);emit();return}t.view.webContents.loadURL(url).catch(()=>{});if(t.id===activeId)hideOrShow(t);emit()}
function switchTab(id){if(!tabs.has(id))return;activeId=id;hideOrShow(tabs.get(id));emit()}
function closeTab(id){const t=tabs.get(id);if(!t)return;mainWindow.contentView.removeChildView(t.view);t.view.webContents.close();tabs.delete(id);if(t.private)privateCount--;if(activeId===id){activeId=[...tabs.keys()].at(-1)||null;if(!activeId)createTab(HOME,false,true);else switchTab(activeId)}emit()}
const current=()=>tabs.get(activeId);
function applyTheme(){nativeTheme.themeSource=settings.theme==='light'?'light':'dark';send('settings',settings)}
function init(){load();initFilters();mainWindow=new BrowserWindow({width:1350,height:850,minWidth:750,minHeight:500,title:'MH Browser',backgroundColor:'#071326',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});mainWindow.loadFile(path.join(__dirname,'ui','index.html'));mainWindow.on('resize',layout);mainWindow.on('close',save);mainWindow.on('closed',()=>{mainWindow=null});mainWindow.webContents.on('did-finish-load',()=>{applyTheme();if(settings.restoreTabs&&state.tabs?.length){for(const t of state.tabs)createTab(t.url,false,false);const normal=[...tabs.keys()];switchTab(normal[Math.max(0,Math.min(state.active||0,normal.length-1))])}else createTab();layout()});Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Browser',submenu:[{label:'New Tab',accelerator:'CmdOrCtrl+T',click:()=>createTab()},{label:'New Private Tab',accelerator:'CmdOrCtrl+Shift+N',click:()=>createTab(HOME,true)},{label:'Close Tab',accelerator:'CmdOrCtrl+W',click:()=>closeTab(activeId)},{role:'quit'}]},{label:'Navigation',submenu:[{label:'Back',accelerator:'Alt+Left',click:()=>current()?.view.webContents.goBack()},{label:'Forward',accelerator:'Alt+Right',click:()=>current()?.view.webContents.goForward()},{label:'Reload',accelerator:'CmdOrCtrl+R',click:()=>current()?.view.webContents.reload()},{label:'Find',accelerator:'CmdOrCtrl+F',click:()=>send('find',true)},{label:'Focus Address',accelerator:'CmdOrCtrl+L',click:()=>send('focus',true)},{label:'Downloads',accelerator:'CmdOrCtrl+J',click:()=>send('panel','downloads')},{label:'History',accelerator:'CmdOrCtrl+H',click:()=>send('panel','history')}]}]))}
app.whenReady().then(init);app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});app.on('before-quit',save);
ipcMain.handle('mh:action',async(_event,action,data)=>{const t=current();switch(action){
case 'init':return{tabs:[...tabs.values()].map(metadata),active:activeId,settings,state:{bookmarks:state.bookmarks,history:state.history,shortcuts:state.shortcuts},downloads:getDownloads()};
case 'new':return createTab(HOME,!!data);
case 'switch':switchTab(Number(data));return true;
case 'close':closeTab(Number(data));return true;
case 'go':navigate(t,data);return true;
case 'home':navigate(t,HOME);return true;
case 'back':if(t?.view.webContents.canGoBack())t.view.webContents.goBack();return true;
case 'forward':if(t?.view.webContents.canGoForward())t.view.webContents.goForward();return true;
case 'reload':t?.view.webContents.reload();return true;
case 'stop':t?.view.webContents.stop();return true;
case 'bookmark':if(!t||t.url===HOME)return false;{const i=state.bookmarks.findIndex(b=>b.url===t.url);if(i>=0)state.bookmarks.splice(i,1);else state.bookmarks.unshift({url:t.url,title:t.title});save();emit();return state.bookmarks}
case 'history':return state.history;
case 'bookmarks':return state.bookmarks;
case 'shortcuts':return state.shortcuts;
case 'add-shortcut':{const url=usableURL(data.url);if(url===HOME)return false;state.shortcuts.push({title:String(data.title||new URL(url).hostname).slice(0,50),url});save();return state.shortcuts}
case 'remove-shortcut':state.shortcuts.splice(Number(data),1);save();return state.shortcuts;
case 'remove-bookmark':state.bookmarks.splice(Number(data),1);save();return state.bookmarks;
case 'remove-history':state.history=state.history.filter(h=>h.at!==Number(data));save();return state.history;
case 'clear-history':state.history=[];save();return true;
case 'clear-data':await session.fromPartition('persist:mh-regular').clearStorageData();state.history=[];save();return true;
case 'settings':settings={...settings,...data};applyTheme();save();return settings;
case 'downloads':return getDownloads();
case 'pause-download':downloads.get(data)?.item.pause();return true;
case 'resume-download':downloads.get(data)?.item.resume();return true;
case 'cancel-download':downloads.get(data)?.item.cancel();return true;
case 'open-download':{const d=downloads.get(data);if(d)await shell.openPath(d.row.path);return true}
case 'show-download':{const d=downloads.get(data);if(d)shell.showItemInFolder(d.row.path);return true}
case 'remove-download':{const d=downloads.get(data);if(d){if(d.row.status==='Downloading')d.item.cancel();downloads.delete(data);notify()}return true}
case 'delete-download':{const d=downloads.get(data);if(d){if(d.row.status==='Downloading')d.item.cancel();try{fs.unlinkSync(d.row.path)}catch{}downloads.delete(data);notify()}return true}
case 'find':t?.view.webContents.findInPage(String(data));return true;
case 'stop-find':t?.view.webContents.stopFindInPage('clearSelection');return true;
case 'zoom':if(t){const v=t.view.webContents;v.setZoomFactor(Math.min(3,Math.max(.5,v.getZoomFactor()+Number(data))))}return true;
case 'external':if(/^https?:\/\//i.test(String(data)))await shell.openExternal(data);return true;
default:return null}});