const MAX_FACTORIAL_INPUT = 52

const FACTORIALS: readonly bigint[] = Object.freeze(
  Array.from({ length: MAX_FACTORIAL_INPUT + 1 }).reduce<bigint[]>(
    (values, _, value) => {
      values.push(
        value === 0 ? 1n : (values[value - 1] as bigint) * BigInt(value),
      )
      return values
    },
    [],
  ),
)

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

  return FACTORIALS[value] as bigint
}
