'use strict';
// Runs inside the visited webpage, not the privileged Electron renderer.
// A genuine click on this in-page control gives HTMLMediaElement the user
// activation required by Chromium's requestPictureInPicture().
function overlayScript(enabled){
  return `(()=>{
    try{
      if(window.__mhPipOverlay?.stop)window.__mhPipOverlay.stop();
      if(!${enabled===true})return;
      let button=null,observer=null,queued=false;
      const video=()=>Array.from(document.querySelectorAll('video')).find(v=>!v.disablePictureInPicture&&v.readyState>0&&!v.paused)
        ||Array.from(document.querySelectorAll('video')).find(v=>!v.disablePictureInPicture);
      const update=()=>{
        queued=false;
        if(!document.documentElement)return;
        const visible=!!video()&&!!document.pictureInPictureEnabled;
        if(!visible){if(button)button.hidden=true;return}
        if(!button){
          button=document.createElement('button');
          button.type='button';
          button.id='mh-pip-floating-control';
          button.textContent='▣ PiP';
          button.title='Picture-in-Picture — float the current video';
          button.setAttribute('aria-label','Play video in Picture-in-Picture');
          button.style.cssText='all:initial!important;position:fixed!important;right:18px!important;bottom:116px!important;z-index:2147483646!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;min-width:74px!important;height:38px!important;padding:0 12px!important;border:1px solid #69d5ff!important;border-radius:13px!important;background:#102a48!important;color:#ffffff!important;font:600 13px Segoe UI,Arial,sans-serif!important;box-shadow:0 4px 16px #0009!important;cursor:pointer!important;';
          button.addEventListener('click',async e=>{
            e.preventDefault();e.stopPropagation();
            try{
              const v=video();
              if(!v)throw Error('No video found');
              if(document.pictureInPictureElement){await document.exitPictureInPicture();return}
              if(!document.pictureInPictureEnabled||v.disablePictureInPicture)throw Error('This video does not allow Picture-in-Picture');
              await v.requestPictureInPicture();
            }catch(err){button.title='PiP unavailable: '+(err?.message||String(err))}
          });
        }
        button.hidden=false;
        if(!button.isConnected)document.documentElement.appendChild(button);
      };
      const schedule=()=>{if(queued)return;queued=true;setTimeout(update,150)};
      observer=new MutationObserver(schedule);
      observer.observe(document.documentElement,{childList:true,subtree:true});
      document.addEventListener('play',schedule,true);
      document.addEventListener('loadedmetadata',schedule,true);
      document.addEventListener('emptied',schedule,true);
      window.__mhPipOverlay={stop(){observer?.disconnect();document.removeEventListener('play',schedule,true);document.removeEventListener('loadedmetadata',schedule,true);document.removeEventListener('emptied',schedule,true);button?.remove();button=null}};
      update();
    }catch(e){console.debug('MH PiP overlay unavailable',e)}
  })()`;
}
const actionScript=`(async()=>{
  const videos=[...document.querySelectorAll('video')];
  const v=videos.find(x=>x.readyState>0&&!x.paused&&!x.disablePictureInPicture)
    ||videos.find(x=>!x.disablePictureInPicture);
  if(!v)return {status:'no-video'};
  if(document.pictureInPictureElement){await document.exitPictureInPicture();return {status:'closed'}}
  if(!document.pictureInPictureEnabled)return {status:'unsupported'};
  try{await v.requestPictureInPicture();return {status:'opened'}}
  catch(e){return {status:'error',message:e?.message||String(e)}}
})()`;
module.exports={overlayScript,actionScript};
