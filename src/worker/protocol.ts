export interface BatchRequest {
  readonly seq: number
  readonly startIndex: bigint
  readonly count: number
}

export interface BatchResponse {
  readonly seq: number
  readonly startIndex: bigint
  readonly count: number
  readonly cards: Uint8Array
}

export class BatchCancelledError extends Error {}
