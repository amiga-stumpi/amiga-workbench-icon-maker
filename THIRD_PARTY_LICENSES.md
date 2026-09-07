# Third-party licenses

## Amiga-Icon-Editor

Source: https://github.com/steffest/Amiga-Icon-Editor

The BinaryStream API and classic DiskObject/Image field read/write sequence in
`js/binary-stream.js` and `js/amiga-icon.js` are adapted from `_script/lib/file.js`
and `_script/lib/icon.js`. The WB1.3 palette also follows the reference.
The UI, bitplane conversion, history, and PNG conversion are new implementations.
`main.js`, `imageProcessing.js`, and `quantize.js` were reviewed but not copied.
No application framework code is included. Modern-format adaptations are listed separately below.

Original per-file notices:

Copyright (c) 2019 Steffest - dev@stef.be

Copyright (c) 2019-2021 Steffest - dev@stef.be

Repository license (retained in full):

MIT License

Copyright (c) 2020 Steffest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Amiga-Icon-converter

Source: https://github.com/steffest/Amiga-Icon-converter

Reference revision: `8718bdb1a0b7be42c5ea1d1ca0cfb7f05065f5dc`.

ColorIcon field decoding and bit-aligned RLE, NewIcon 7-bit symbol decoding,
and ARGB field sequencing in `js/modern-icon-codecs.js` are adapted from
`icon.js`. The OS2+/MagicWB preview palette in `js/icon-import.js` follows the
same reference. Bounds checking, multi-line palette handling, native bounded
zlib decompression, and PNG container handling are new implementations.
Neither its bundled zlib library nor third-party icon artwork is redistributed.

Original per-file notice:

Copyright (c) 2019-2023 Steffest - dev@stef.be

Repository license (retained in full):

MIT License

Copyright (c) 2019 Steffest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
