// API adapted from Steffest's file.js, Copyright (c) 2019 Steffest.
// MIT license: see ../THIRD_PARTY_LICENSES.md.
export class BinaryStream {
  constructor(buffer) {
    if (!(buffer instanceof ArrayBuffer))
      throw new TypeError("ArrayBuffer erwartet.");
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    this.index = 0;
  }
  get length() {
    return this.buffer.byteLength;
  }
  check(count) {
    if (
      !Number.isInteger(count) ||
      count < 0 ||
      this.index + count > this.length
    )
      throw new RangeError(
        `Ungültige .info-Datei: Dateigrenze bei Byte ${this.index}.`,
      );
  }
  goto(position) {
    if (!Number.isInteger(position) || position < 0 || position > this.length)
      throw new RangeError("Ungültige Dateiposition.");
    this.index = position;
    return this;
  }
  jump(count) {
    return this.goto(this.index + count);
  }
  readNumber(size, method) {
    this.check(size);
    const value = this.view[method](this.index, false);
    this.index += size;
    return value;
  }
  writeNumber(value, size, method, min, max) {
    if (!Number.isInteger(value) || value < min || value > max)
      throw new RangeError(`Ungültiger Integer: ${value}.`);
    this.check(size);
    this.view[method](this.index, value, false);
    this.index += size;
  }
  readUbyte() {
    return this.readNumber(1, "getUint8");
  }
  readWord() {
    return this.readNumber(2, "getUint16");
  }
  readDWord() {
    return this.readNumber(4, "getUint32");
  }
  readShort() {
    return this.readNumber(2, "getInt16");
  }
  readLong() {
    return this.readNumber(4, "getInt32");
  }
  writeUbyte(v) {
    this.writeNumber(v, 1, "setUint8", 0, 255);
  }
  writeWord(v) {
    this.writeNumber(v, 2, "setUint16", 0, 65535);
  }
  writeDWord(v) {
    this.writeNumber(v, 4, "setUint32", 0, 0xffffffff);
  }
  writeShort(v) {
    this.writeNumber(v, 2, "setInt16", -32768, 32767);
  }
  writeLong(v) {
    this.writeNumber(v, 4, "setInt32", -0x80000000, 0x7fffffff);
  }
  readBytes(count) {
    this.check(count);
    const result = this.bytes.slice(this.index, this.index + count);
    this.index += count;
    return result;
  }
  writeBytes(bytes) {
    this.check(bytes.length);
    this.bytes.set(bytes, this.index);
    this.index += bytes.length;
  }
  readString(count) {
    return Array.from(this.readBytes(count), (b) => String.fromCharCode(b))
      .join("")
      .split("\0")[0];
  }
  writeString(value) {
    for (let i = 0; i < value.length; i++) this.writeUbyte(value.charCodeAt(i));
  }
  // MSB first; random bit access, does not advance the byte cursor.
  readBits(count, bitPosition = 0, position = this.index) {
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 32 ||
      !Number.isInteger(bitPosition) ||
      bitPosition < 0 ||
      !Number.isInteger(position) ||
      position < 0 ||
      position * 8 + bitPosition + count > this.length * 8
    )
      throw new RangeError("Ungültiger Bitbereich.");
    let value = 0;
    for (let i = 0; i < count; i++) {
      const bit = position * 8 + bitPosition + i;
      value =
        value * 2 + ((this.bytes[Math.floor(bit / 8)] >> (7 - (bit % 8))) & 1);
    }
    return value;
  }
  // Writes a bit array at the byte cursor, pads its final byte with zeroes.
  writeBits(bits) {
    if (Array.from(bits).some((b) => b !== 0 && b !== 1))
      throw new RangeError("Nur Bits 0/1 erlaubt.");
    this.check(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i += 8) {
      let value = 0;
      for (let j = 0; j < 8; j++) value = (value << 1) | (bits[i + j] || 0);
      this.writeUbyte(value);
    }
  }
}
