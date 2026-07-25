#!/usr/bin/env python3
import math
import json
import base64
from pathlib import Path

# Parameters for ~100k items and ~0.3% false positive rate
N_ITEMS = 100000
BIT_SIZE = 1200000  # 1,200,000 bits (150 KB)
NUM_HASHES = 7

# FNV-1a 32-bit hashing implementation matching JS charCodeAt
def fnv1a32(text: str, seed: int = 0x811c9dc5) -> int:
    hash_val = seed
    for char in text:
        code = ord(char)
        hash_val ^= (code & 0xFFFF)
        hash_val = (hash_val * 0x01000193) & 0xFFFFFFFF
    return hash_val

def get_hash_indices(text: str, bit_size: int = BIT_SIZE, num_hashes: int = NUM_HASHES):
    h1 = fnv1a32(text, 0x811c9dc5)
    h2 = fnv1a32(text, 0x050c5d1f)
    if h2 == 0:
        h2 = 1
    indices = []
    for i in range(num_hashes):
        idx = (h1 + i * h2) % bit_size
        indices.append(idx)
    return indices

def build_bloom_filter(input_file: Path, output_file: Path):
    bit_bytes = bytearray(math.ceil(BIT_SIZE / 8))
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        words = [line.strip() for line in f if line.strip()]
    
    words = words[:N_ITEMS]
    print(f"Building Bloom Filter for {len(words)} passwords...")
    
    for word in words:
        indices = get_hash_indices(word)
        for idx in indices:
            byte_idx = idx // 8
            bit_offset = idx % 8
            bit_bytes[byte_idx] |= (1 << bit_offset)
            
    b64_data = base64.b64encode(bit_bytes).decode('ascii')
    
    filter_payload = {
        "size": BIT_SIZE,
        "numHashes": NUM_HASHES,
        "itemCount": len(words),
        "bits": b64_data
    }
    
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(filter_payload, f)
        
    print(f"Successfully generated Bloom Filter asset at {output_file} (Size: {output_file.stat().st_size / 1024:.2f} KB)")

if __name__ == "__main__":
    root = Path(__file__).parent.parent
    input_path = root / "data" / "top_100k_passwords.txt"
    output_path = root / "frontend" / "src" / "assets" / "bloomFilterData.json"
    build_bloom_filter(input_path, output_path)
