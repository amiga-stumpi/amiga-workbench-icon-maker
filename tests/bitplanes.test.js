import { encode, decode, byteSize } from '../js/amiga-bitplanes.js';
import { BinaryStream } from '../js/binary-stream.js';
import { test, equal, bytesEqual, throws } from './harness.js';
export const sizes = [[16,16,1], [32,32,2], [48,32,2], [47,31,2], [17,16,2], [33,16,2], [48,32,3]];
export function pattern(width, height, depth, kind = 0) {
  return Uint8Array.from({ length: width * height }, (_, i) => {
    const x = i % width, y = Math.floor(i / width), max = (1 << depth) - 1;
    return [x & max, y & max, ((x + y) & 1) * max,
      (Math.floor(x / 5) + Math.floor(y / 3)) & max,
      (x === 0 || y === 0 || x === width - 1 || y === height - 1) ? max : 0,
      x === y ? max : (x * 3 + y * 5) & max][kind];
  });
}
for (const [w,h,d] of sizes) for (let kind = 0; kind < 6; kind++) test(`Bitplanes ${w}×${h}/${d}, Muster ${kind}`, () => {
  const pixels = pattern(w,h,d,kind), bytes = encode(pixels,w,h,d);
  equal(bytes.length, byteSize(w,h,d));
  bytesEqual(decode(bytes,w,h,d),pixels);
  // Independent bit-by-bit oracle, including every padding bit.
  const rowBits = Math.ceil(w / 16) * 16;
  for (let p = 0; p < d; p++) for (let y = 0; y < h; y++) for (let x = 0; x < rowBits; x++) {
    const bit = (p * h + y) * rowBits + x;
    equal((bytes[Math.floor(bit / 8)] >> (7 - bit % 8)) & 1, x < w ? Math.floor(pixels[y*w+x] / 2**p) % 2 : 0);
  }
});
test('Bekannte Bitreihenfolge und Zeilenpadding 17×2', () => {
  const pixels = new Uint8Array(34); pixels[0]=1; pixels[16]=2; pixels[17]=3;
  bytesEqual(encode(pixels,17,2,2), [0x80,0,0,0, 0x80,0,0,0, 0,0,0x80,0, 0x80,0,0,0]);
});
test('PlanePick / PlaneOnOff abbilden', () => {
  bytesEqual(decode(new Uint8Array([0x80,0]),2,1,1,4,3),[7,3]);
  throws(() => decode(new Uint8Array(2),2,1,1,3),/PlanePick/);
});
test('Ungültige Pens und Dimensionen ablehnen', () => {
  throws(() => encode([6],1,1,2), /Pen 6/);
  throws(() => encode([-1],1,1,2)); throws(() => encode([1.5],1,1,2));
  throws(() => encode([],0,1,2)); throws(() => encode([0],1,1,4));
  throws(() => decode(new Uint8Array(1),1,1,1));
});
test('BinaryStream Big Endian, signed, Bits und Strings', () => {
  const s = new BinaryStream(new ArrayBuffer(24));
  s.writeUbyte(0xe3); s.writeWord(0x1234); s.writeDWord(0x80000000);
  s.writeShort(-2); s.writeLong(-123); s.writeString('ÄA');
  s.writeBits([1,0,1,0,1,0,1,0,1]);
  bytesEqual(new Uint8Array(s.buffer).slice(0,7),[0xe3,0x12,0x34,0x80,0,0,0]);
  s.goto(0); equal(s.readUbyte(),0xe3); equal(s.readWord(),0x1234); equal(s.readDWord(),0x80000000);
  equal(s.readShort(),-2); equal(s.readLong(),-123); equal(s.readString(2),'ÄA');
  equal(s.readBits(9),341); equal(s.readBits(2,7),1); s.jump(2); equal(s.index,17);
  s.goto(24); throws(() => s.readUbyte()); throws(() => s.writeWord(1));
  throws(() => s.goto(-1)); throws(() => s.goto(25)); throws(() => s.goto(NaN));
  s.goto(0); throws(() => s.writeDWord(-1)); throws(() => s.writeWord(65536));
  throws(() => s.readBits(33)); throws(() => s.readBits(8,0,24));
});
