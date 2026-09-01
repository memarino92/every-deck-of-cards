import type { EntropySource } from '../domain/random.ts'

/** Browser entropy adapter for the domain's injected random-index algorithm. */
export const cryptoEntropy: EntropySource = (bytes) => {
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}
