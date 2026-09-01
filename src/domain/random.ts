import { DECK_COUNT } from './deck-number.ts'

/**
 * Uniformly random permutation index over `0 .. DECK_COUNT - 1`.
 *
 * Entropy comes from an injected byte source so the algorithm is
 * platform-independent and testable; a platform adapter supplies production
 * entropy. Drawn bytes are read as a big-endian integer and rejected when they
 * fall at or above the largest multiple of `DECK_COUNT` that fits in the byte
 * width, so the result is uniform with no modulo bias.
 *
 * `DECK_COUNT` (52!) is about 2^226, so 32 bytes (256 bits) give an
 * acceptance rate above 99.999% — rejection is essentially never observed in
 * practice, but the boundary is exact and tested.
 */

/** Entropy source: fill `bytes` with uniform random bytes and return it. */
export type EntropySource = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array

const BYTE_COUNT = 32
const DRAW_SPACE = 1n << BigInt(BYTE_COUNT * 8)
const ACCEPT_LIMIT = DRAW_SPACE - (DRAW_SPACE % DECK_COUNT)
const MAX_ATTEMPTS = 1024

function readBigEndian(bytes: Uint8Array): bigint {
  let value = 0n

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte)
  }

  return value
}

export function randomPermutationIndex(entropy: EntropySource): bigint {
  const bytes = new Uint8Array(new ArrayBuffer(BYTE_COUNT))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const draw = readBigEndian(entropy(bytes))

    if (draw < ACCEPT_LIMIT) {
      return draw % DECK_COUNT
    }
  }

  // A single draw is accepted with probability > 1 - 2^-29, so 1024
  // consecutive rejections are possible but astronomically unlikely.
  throw new Error('Entropy source never produced an acceptable draw')
}
