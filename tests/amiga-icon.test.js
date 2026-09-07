import { AmigaIcon } from '../js/amiga-icon.js';
import { pattern, sizes } from './bitplanes.test.js';
import { test, equal, bytesEqual, throws, assert } from './harness.js';
for (const [w,h,d] of sizes) for (let k=0;k<6;k++) test(`DiskObject Roundtrip ${w}×${h}/${d}, Muster ${k}`, () => {
  const normalPixels=pattern(w,h,d,k), selectedPixels=pattern(w,h,d,(k+1)%6);
  const icon=AmigaIcon.create({width:w,height:h,depth:d,normalPixels,selectedPixels});
  const bytes=AmigaIcon.write(icon), parsed=AmigaIcon.parse(bytes);
  bytesEqual(parsed.normal.pixels,normalPixels); bytesEqual(parsed.selected.pixels,selectedPixels);
  bytesEqual(new Uint8Array(AmigaIcon.write(parsed)),new Uint8Array(bytes));
});
test('WB1.3 feste Headerwerte, Imageoffsets und Dateigröße', () => {
  const buffer=AmigaIcon.write(AmigaIcon.create()), view=new DataView(buffer);
  equal(buffer.byteLength,886);
  equal(view.getUint16(0),0xe310); equal(view.getUint16(2),1);
  equal(view.getUint16(12),48); equal(view.getUint16(14),32);
  equal(view.getUint16(16),6); equal(view.getUint16(18),3); equal(view.getUint16(20),1);
  equal(view.getUint32(22),1); equal(view.getUint32(26),1);
  equal(view.getUint32(44),0); equal(view.getUint8(48),3);
  equal(view.getUint32(58),0x80000000); equal(view.getUint32(62),0x80000000);
  equal(view.getUint32(74),16384);
  for (const offset of [78,482]) {
    equal(view.getUint16(offset+4),48); equal(view.getUint16(offset+6),32);
    equal(view.getUint16(offset+8),2); equal(view.getUint32(offset+10),1);
    equal(view.getUint8(offset+14),3); equal(view.getUint8(offset+15),0); equal(view.getUint32(offset+16),0);
  }
});
test('Selected bewusst deaktiviert / fehlend', () => {
  const icon=AmigaIcon.create({selectedPixels:null});
  const buffer=AmigaIcon.write(icon); equal(buffer.byteLength,482);
  equal(new DataView(buffer).getUint16(16),4); equal(AmigaIcon.parse(buffer).selected,null);
  icon.selectedEnabled=true; throws(() => AmigaIcon.write(icon), /Selected/);
});
test('Signed Positionen, Textdaten und userData-Normalisierung', () => {
  const icon=AmigaIcon.create({currentX:-20,currentY:100,userData:1,defaultTool:'SYS:Tools/ÄTool',toolTypes:['PORT=1234','DEBUG=YES'],toolWindow:'CON:0/0/300/100/Test'});
  const parsed=AmigaIcon.parse(AmigaIcon.write(icon));
  equal(parsed.currentX,(-20)>>>0); equal(parsed.currentY,100); equal(parsed.userData,0);
  equal(parsed.defaultTool,icon.defaultTool); equal(parsed.toolTypes.join('\n'),icon.toolTypes.join('\n')); equal(parsed.toolWindow,icon.toolWindow);
});
test('DrawerData erhalten und fehlende Daten blockieren', () => {
  for (const type of [1,2,5]) {
    throws(() => AmigaIcon.write(AmigaIcon.create({type})),/DrawerData/);
    const data=Uint8Array.from({length:56},(_,i)=>i);
    bytesEqual(AmigaIcon.parse(AmigaIcon.write(AmigaIcon.create({type,drawerData:data}))).drawerData,data);
  }
});
test('Alle Dateiverkürzungen ohne stilles Lesen abweisen', () => {
  const data=AmigaIcon.write(AmigaIcon.create({defaultTool:'Tool',toolTypes:['A=B']}));
  for (let i=0;i<data.byteLength;i++) throws(() => AmigaIcon.parse(data.slice(0,i)));
});
test('Neue Formate und beschädigte Strukturen abweisen', () => {
  throws(() => AmigaIcon.parse(new Uint8Array([137,80,78,71]).buffer), /neueres/);
  const buffer=AmigaIcon.write(AmigaIcon.create());
  for (const [offset,size,value] of [[0,2,0],[2,2,2],[44,4,1],[86,2,9],[94,4,1],[92,1,0]]) {
    const copy=buffer.slice(0), view=new DataView(copy); view[`setUint${size*8}`](offset,value);
    throws(() => AmigaIcon.parse(copy));
  }
  const extended=new Uint8Array(buffer.byteLength+12); extended.set(new Uint8Array(buffer));
  extended.set(new TextEncoder().encode('FORMxxxxICON'),buffer.byteLength);
  throws(() => AmigaIcon.parse(extended.buffer),/neueres/);
  throws(() => AmigaIcon.write(AmigaIcon.create({toolTypes:['IM1=abc']})),/neueres/);
});
test('Exportvalidierung', () => {
  for (const stackSize of [0,-1,1.1,NaN,0x80000000]) throws(() => AmigaIcon.write(AmigaIcon.create({stackSize})),/StackSize/);
  throws(() => AmigaIcon.write(AmigaIcon.create({type:8})),/Type/);
  throws(() => AmigaIcon.write(AmigaIcon.create({defaultTool:'😀'})),/Latin-1/);
  throws(() => AmigaIcon.write(AmigaIcon.create({currentX:NaN})),/Position/);
  const icon=AmigaIcon.create(); icon.normal.pixels[0]=6;
  throws(() => AmigaIcon.write(icon),/Pen 6/);
  assert(AmigaIcon.NO_ICON_POSITION > 0);
});
