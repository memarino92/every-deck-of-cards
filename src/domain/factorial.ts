const MAX_FACTORIAL_INPUT = 52

export function factorial(value: number): bigint {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_FACTORIAL_INPUT
  ) {
    throw new RangeError(
      `Factorial requires an integer from 0 through ${MAX_FACTORIAL_INPUT}`,
    )
  }

  let result = 1n

  for (let factor = 2n; factor <= BigInt(value); factor += 1n) {
    result *= factor
  }

  return result
}
