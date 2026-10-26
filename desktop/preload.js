const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('mh',{
 call:(action,data)=>ipcRenderer.invoke('mh:action',action,data),
 on:(event,callback)=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('mh:'+event,listener);return ()=>ipcRenderer.removeListener('mh:'+event,listener)}
});