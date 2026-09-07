import { hex } from './palette.js';
export class PixelEditor {
  constructor(canvas,{getImage,getPalette,getTool,getPen,onPick,onCommit,onActive}) {
    Object.assign(this,{canvas,getImage,getPalette,getTool,getPen,onPick,onCommit,onActive});
    this.zoom=10;this.grid=true;this.drawing=false;this.changed=false;this.cursor=[0,0];
    canvas.addEventListener('pointerdown',e=>this.start(e));
    canvas.addEventListener('pointermove',e=>this.move(e));
    for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,()=>this.finish());
    canvas.addEventListener('keydown',e=>this.key(e));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('focus',()=>this.onActive());
  }
  render() {
    const img=this.getImage();if(!img)return;
    const {canvas,zoom}=this;
    const w=img.width*zoom,h=img.height*zoom;
    if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
    const ctx=canvas.getContext('2d'), palette=this.getPalette();
    for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++) {
      ctx.fillStyle=hex(palette[img.pixels[y*img.width+x]]);
      ctx.fillRect(x*zoom,y*zoom,zoom,zoom);
    }
    if(this.grid&&zoom>=5) {
      ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1;ctx.beginPath();
      for(let x=0;x<=w;x+=zoom){ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,h);}
      for(let y=0;y<=h;y+=zoom){ctx.moveTo(0,y+.5);ctx.lineTo(w,y+.5);}
      ctx.stroke();
    }
  }
  point(e) {
    const r=this.canvas.getBoundingClientRect(),img=this.getImage();
    return [Math.max(0,Math.min(img.width-1,Math.floor((e.clientX-r.left)/r.width*img.width))),
      Math.max(0,Math.min(img.height-1,Math.floor((e.clientY-r.top)/r.height*img.height)))];
  }
  start(e) {
    if(e.button!==0||this.drawing)return;e.preventDefault();this.canvas.focus();this.onActive();
    this.canvas.setPointerCapture(e.pointerId);this.drawing=true;this.changed=false;
    this.last=this.point(e);this.cursor=this.last;this.apply(...this.last);this.render();
  }
  move(e) {
    if(!this.drawing)return;
    const point=this.point(e);
    if(['pencil','eraser'].includes(this.getTool()))this.line(this.last,point);
    this.last=point;this.cursor=point;this.render();
  }
  finish() {
    if(!this.drawing)return;this.drawing=false;
    if(this.changed)this.onCommit();this.changed=false;
  }
  line([x0,y0],[x1,y1]) {
    const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;
    let err=dx+dy;
    while(true) {this.apply(x0,y0);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
  }
  apply(x,y) {
    const img=this.getImage(),index=y*img.width+x,tool=this.getTool(),pen=tool==='eraser'?0:this.getPen();
    if(tool==='picker'){this.onPick(img.pixels[index]);return;}
    if(img.pixels[index]===pen)return;
    this.changed=true;
    if(tool!=='fill'){img.pixels[index]=pen;return;}
    const target=img.pixels[index],stack=[index];img.pixels[index]=pen;
    while(stack.length) {
      const i=stack.pop(),px=i%img.width,py=Math.floor(i/img.width);
      for(const n of [px>0?i-1:-1,px<img.width-1?i+1:-1,py>0?i-img.width:-1,py<img.height-1?i+img.width:-1])
        if(n>=0&&img.pixels[n]===target){img.pixels[n]=pen;stack.push(n);}
    }
  }
  key(e) {
    const img=this.getImage(),moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(moves[e.key]) {
      e.preventDefault();const [dx,dy]=moves[e.key];
      this.cursor=[Math.max(0,Math.min(img.width-1,this.cursor[0]+dx)),Math.max(0,Math.min(img.height-1,this.cursor[1]+dy))];
      this.render();const ctx=this.canvas.getContext('2d');ctx.strokeStyle='#f00';ctx.strokeRect(this.cursor[0]*this.zoom+.5,this.cursor[1]*this.zoom+.5,this.zoom-1,this.zoom-1);
    } else if(e.key===' '||e.key==='Enter') {
      e.preventDefault();this.changed=false;this.apply(...this.cursor);this.render();if(this.changed)this.onCommit();this.changed=false;
    }
  }
}
