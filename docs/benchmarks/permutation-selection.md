# Permutation Selection Benchmark

- Date: 2026-08-28
- Status: observational development result
- Base revision: `07f16c9` with the permutation-domain working tree

## Question

For direct 52-card factoradic unranking, does an order-statistic Fenwick tree justify its additional implementation complexity over selecting from a shrinking array?

## Implementations

- **Shrinking array:** copy the canonical values and remove each factoradic digit with `splice`.
- **Fenwick tree:** keep availability counts in an `Int16Array`, use linear all-ones initialization, cache the highest search bit, and select each digit in logarithmic time.

Both implementations perform equivalent validation, factorial lookup, `bigint` division, output allocation, and result consumption. Candidate tests compare every permutation through eight elements plus 133 indices across the actual 52-card range.

## Environment

- CPU: Intel Core i7-10750H, 6 cores and 12 logical processors
- OS: Windows NT 10.0.26200.0
- Node.js: 26.8.1
- V8: 14.6.202.34-node.28
- Vitest/Tinybench: 4.1.11, pinned by the lockfile
- Power and thermal state: not controlled

These results do not establish browser performance and are not a CI threshold.

## Method

Run `pnpm bench` in three separate processes with no concurrent test or build commands. Each task uses at least 20 warmup iterations over 250 ms, then at least 100 measured iterations over 750 ms.

Boundary cases repeatedly unrank the first, middle, or last index as diagnostics. The mixed workload processes the same precomputed 64-index corpus for both implementations. It contains three boundaries and 61 values from one deterministic pseudorandom sequence. This corpus is reproducible but is not claimed to model a uniform distribution of factoradic digits. A module-level checksum consumes output card IDs so results remain observable.

Each process runs the mixed corpus twice, reversing task registration order. This exposes warmup, power, thermal, and execution-order sensitivity instead of assuming three process medians eliminate it. A corpus operation contains 64 complete deck unrankings.

| Process | Registration order |  Shrinking array |     Fenwick tree |
| ------: | ------------------ | ---------------: | ---------------: |
|       1 | Array first        | 708.05 batches/s | 674.43 batches/s |
|       1 | Fenwick first      | 741.91 batches/s | 699.60 batches/s |
|       2 | Array first        | 658.39 batches/s | 707.79 batches/s |
|       2 | Fenwick first      | 742.26 batches/s | 688.66 batches/s |
|       3 | Array first        | 651.29 batches/s | 645.75 batches/s |
|       3 | Fenwick first      | 704.34 batches/s | 659.65 batches/s |

The array-first measurements include one process where Fenwick led by 7.5%; the Fenwick-first measurements consistently favored the array by 6.0-7.8%. Combining all six observations gives approximately 45,200 decks/s for the array and 43,600 decks/s for Fenwick, but the visible order and run sensitivity makes a precise speedup claim inappropriate.

## Decision

Retain the shrinking array for direct unranking. It is shorter, easier to audit, allocates no tree, and the benchmark found no stable material advantage that could justify the Fenwick tree. The timing evidence is directional and machine-specific; browser and worker measurements can challenge the decision later.

The feed's eventual contiguous-batch strategy is a separate question. It must compare repeated direct unranking against unranking one seed and advancing permutations.
