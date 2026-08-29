# 0003: Use factoradic permutation indexing

- Status: accepted
- Date: 2026-08-28

## Context

The application must compute a deck from any index and recover that index from any valid deck without generating preceding permutations. The mapping must cover all and only the `52!` unique orderings.

## Decision

Use lexicographic ranking and unranking through the factorial number system. Internal indices are zero-based `bigint` values. Public numbers add one at the application boundary.

The initial production implementation selects from a shrinking array. An order-statistic Fenwick tree remains a benchmark candidate, not production complexity by default.

## Alternatives Considered

- Enumerating prior permutations is computationally impossible for arbitrary indices.
- Random seeds do not guarantee a portable bijection across algorithms or runtime versions.
- Lehmer codes are the digit representation used by the selected factoradic method, not a competing mapping.
- A Fenwick tree improves asymptotic selection but may lose at 52 elements because of setup and traversal overhead.

## Consequences

Any index can be addressed in bounded work and every valid permutation can become a favorite with an exact public number. The canonical ordering and lexicographic convention become compatibility contracts.

## Evidence

The domain suite exhaustively checks all permutations through eight elements and representative 52-card indices. Benchmarks compare selection structures separately.

Three standalone Node.js benchmark processes, each running a deterministic mixed corpus in both registration orders, found no stable material Fenwick advantage. Results were order-sensitive and generally favored the shrinking array, so simplicity remains the primary reason for the choice rather than a precise speed claim.

## Related Material

- [Permutation domain plan](../plans/completed/2026-08-28-permutation-domain.md)
- [Factoradic explainer plan](../plans/completed/2026-08-28-factoradic-explainer.md)
- [Permutation selection benchmark](../benchmarks/permutation-selection.md)
