import { writeFile } from 'node:fs/promises';
import { AmigaIcon } from '../js/amiga-icon.js';
function make(width,height,type) {
  const pixels=new Uint8Array(width*height);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    let pen=0;
    if(x>=6&&x<width-6&&y>=5&&y<height-5) pen=1;
    if((x===6||x===width-7)&&y>=5&&y<height-5 || (y===5||y===height-6)&&x>=6&&x<width-6) pen=2;
    if(x>8&&x<width-9&&y>=8&&y<=11) pen=3;
    if(x>10&&x<width-12&&y>=16&&y%4===0) pen=2;
    pixels[y*width+x]=pen;
  }
  return AmigaIcon.create({width,height,type,normalPixels:pixels,selectedPixels:pixels.map(p=>p===1?2:p===2?1:p)});
}
for (const [name,w,h,type] of [
  ['wb13-tool-48x32-4colors.info',48,32,3],
  ['wb13-project-48x32-4colors.info',48,32,4],
  ['wb13-padding-test-47x31.info',47,31,3],
  ['Test.info',48,32,3]
]) {
  const bytes=AmigaIcon.write(make(w,h,type));
  AmigaIcon.parse(bytes);
  await writeFile(new URL(`../samples/${name}`,import.meta.url),new Uint8Array(bytes));
}
