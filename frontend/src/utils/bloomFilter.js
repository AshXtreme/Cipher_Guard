import bloomData from '../assets/bloomFilterData.json';

// FNV-1a 32-bit hash matching build script exactly
function fnv1a32(str, seed = 0x811c9dc5) {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) & 0xffff;
    hash ^= code;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export class LocalBloomFilter {
  constructor(payload) {
    this.size = payload.size || 1200000;
    this.numHashes = payload.numHashes || 7;
    this.itemCount = payload.itemCount || 100000;

    // Decode base64 bit array into Uint8Array
    const binaryString = typeof atob !== 'undefined' 
      ? atob(payload.bits) 
      : Buffer.from(payload.bits, 'base64').toString('binary');

    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    this.bitArray = bytes;
  }

  /**
   * Performs instant synchronous Bloom filter query.
   * Returns true if candidate password MIGHT be in top-100k common passwords.
   * Returns false if candidate password is DEFINITELY NOT in top-100k list.
   */
  check(password) {
    if (!password) return false;

    const h1 = fnv1a32(password, 0x811c9dc5);
    let h2 = fnv1a32(password, 0x050c5d1f);
    if (h2 === 0) h2 = 1;

    for (let i = 0; i < this.numHashes; i++) {
      const idx = (h1 + i * h2) % this.size;
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;

      if ((this.bitArray[byteIdx] & (1 << bitOffset)) === 0) {
        return false; // Definite negative
      }
    }
    return true; // Possible match (top-100k common password)
  }
}

// Singleton instance loaded synchronously on app start
const instance = new LocalBloomFilter(bloomData);

export function checkBloomFilter(password) {
  return instance.check(password);
}
