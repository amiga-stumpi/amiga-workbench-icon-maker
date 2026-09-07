import { quantizeRGBA } from './palette.js';
export async function importPNG(file,width,height,palette,mode='fit',threshold=128) {
  if(file.size>32*1024*1024) throw new Error('PNG ist zu groß (maximal 32 MiB).');
  const header=new DataView(await file.slice(0,24).arrayBuffer());
  if(header.byteLength<24 || header.getUint32(0)!==0x89504e47 || header.getUint32(4)!==0x0d0a1a0a || header.getUint32(12)!==0x49484452)
    throw new Error('PNG konnte nicht geladen werden: ungültige PNG-Datei.');
  if(header.getUint32(16)*header.getUint32(20)>16777216) throw new Error('PNG überschreitet 16 Megapixel.');
  const url=URL.createObjectURL(file);
  try {
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('PNG konnte nicht geladen werden.'));img.src=url;});
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.imageSmoothingEnabled=false;
    if(mode==='original') ctx.drawImage(img,0,0);
    else {
      const scale=mode==='crop'?Math.max(width/img.width,height/img.height):Math.min(width/img.width,height/img.height);
      const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
      ctx.drawImage(img,Math.floor((width-w)/2),Math.floor((height-h)/2),w,h);
    }
    return quantizeRGBA(ctx.getImageData(0,0,width,height).data,palette,threshold);
  } finally { URL.revokeObjectURL(url); }
}
export function pixelsToCanvas(img,palette) {
  const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
  const ctx=canvas.getContext('2d'), data=ctx.createImageData(img.width,img.height);
  img.pixels.forEach((pen,i)=> {data.data.set([...palette[pen],255],i*4);});
  ctx.putImageData(data,0,0); return canvas;
}
export function download(blob,name) {
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export function iconFilename(name) {
  const base=name.trim().replace(/(?:\.info)+$/i,'');
  if(!base || /[\x00-\x1f\x7f/:\\]/.test(base) || base==='.' || base==='..') throw new Error('Bitte einen gültigen Dateinamen ohne Pfadzeichen eingeben.');
  // Amiga OFS/FFS component names are limited to 30 bytes, including .info.
  if(base.length>25 || /[^\x20-\xff]/.test(base)) throw new Error('Name: maximal 25 Latin-1-Zeichen (plus .info).');
  return base+'.info';
}
