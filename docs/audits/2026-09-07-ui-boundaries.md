# UI duplication and boundary audit

Audited 2026-09-07 against `58ae999`, with an initially clean worktree.

Implementation follow-up: the findings below preserve the audited baseline. See the [completed implementation plan](../plans/completed/2026-09-07-ui-boundaries.md) for changes and verification, and [decision 0014](../decisions/0014-ui-feature-ownership.md) for the adopted contracts.

The highest-value work is to separate Explorer and Arrange into feature state,
browser interaction, and presentation, then repair the contracts of the existing
interactive documentation components. The domain, virtual-position mathematics,
worker sequencing, and card face renderer already provide useful boundaries.

This is an audit and an extraction proposal. No application changes or new
architectural decisions have been adopted. Priorities below describe recommended
sequencing, not production incident severity. File line numbers refer to the
audited revision.

## Findings

### 1. Explorer owns almost every layer of its feature — high priority

**Evidence:** `src/ExplorerPage.tsx:139–894` contains route query handling,
position/strip derivation, worker creation, response decoding and caching, jump
animation, momentum, wheel/keyboard/touch handling, rail pointer capture, element
measurement, resize correction, and document scroll ownership. Its render starts
at line 896; the module is 1,014 lines.

These are different reasons to change. A transport change currently touches the
same component as a keyboard policy or toolbar layout change. Moving the entire
closure into one `useExplorer` function would preserve that coupling.

**Recommended boundaries:**

- `ExplorerControls`: draft deck-number input and navigation actions, with
  explicit values/callbacks and no worker or scroll implementation.
- `ExplorerFeed` and the existing `DeckRow`: bounded rows, loading/error
  presentation, and strip translation. Pass row geometry explicitly.
- `ScrollRail`: rail/thumb DOM, pointer capture, grab offset, and fraction input.
  The explorer controller translates fractions to exact `FeedPosition` values.
- An explorer position controller: exact position, navigation, bounds, and the
  finite-intro/feed transition. Move the pure arithmetic in
  `advanceSurface` (`494–560`) to a pure virtualization module; keep browser event
  interpretation outside it.
- A browser surface adapter: wheel/touch/keyboard listeners, measurements, and
  their cleanup. A separate data adapter owns worker-backed rows; see finding 4.

Keep one owner of position. Children should receive the values and actions they
need, rather than a shared bag of setters and DOM references.

### 2. Arrange mixes editing transactions with DOM and animation — high priority

**Evidence:** `src/ArrangePage.tsx:100–562` combines ordering and selection,
history synchronization, gesture arbitration, horizontal momentum, and shuffle
animation. The JSX at `602–650` also derives accessible interaction labels and
implements click suppression. The module is 658 lines.

The page discovers the scroll container through `spreadTrack.parentElement`
(`157`, `313`, `373`). Hit testing queries `.arrange-card` (`389–398`); shuffle
animation queries the same class and reconstructs identity from `data-card-id`
(`493–500`, `522–527`). Inserting a wrapper or changing card markup can therefore
break input or motion without changing the apparent component interface.

Cancellation also crosses responsibilities: `cancelShuffle` stops pan momentum
and can write browser history (`240–251`), and starting a pointer session calls
it (`302`). That orchestration should remain explicit when decomposing the page.

**Recommended boundaries:** an editor model for ordering, selection, rank, and
settled edit commands; `ArrangeSpread` for the scroll container, track, card
element registry, and geometry; a gesture controller for tap/pan/long-press/drag
sessions; and a shuffle animator for measurements, animations, completion, and
cancellation. `ArrangeCard` can own the button semantics and accessible labels.

Give the spread an explicit scroller reference and keyed card references. Let
the editor coordinator decide when a transaction updates the URL; animation
internals should report completion/cancellation rather than call the router.
Preserve the existing policy that interruption settles the exact shuffle target.

The pure `moveCard`, `positionFromPointer`, and `shuffleLiftForCard` exports
(`29–75`) should live in feature logic/geometry/motion modules. Their tests
currently import the route module simply to test pure functions
(`src/ArrangePage.test.tsx:5–10`). Reordering logic need not move into the
permutation mathematics layer to become independent of Solid.

### 3. Shared motion code has already diverged — medium priority

**Evidence:** Explorer's constants (`47–51`) and momentum integration
(`298–371`) match Arrange's constants (`23–27`) and integration (`146–204`):
velocity limits, decay, frame scheduling, stop threshold, and cancellation.

The sampling policies differ: Explorer retains a predecessor across the sample
window (`673–682`), while Arrange drops old samples (`351–354`). The
reduced-motion helpers also give opposite answers when `matchMedia` is absent
(`ExplorerPage.tsx:64–68`, `ArrangePage.tsx:88–92`). These are confirmed policy
differences, not evidence that the two gestures should behave identically:
Arrange must also arbitrate long-press dragging.

**Recommendation:** share the scalar momentum integrator and its start/cancel/
dispose lifecycle, with a feature-provided delta consumer and boundary stop
decision. Centralize the reduced-motion policy. Keep touch recognition and
feature bounds separate: Explorer advances an exact virtual position and
Arrange observes native `scrollLeft` clamping. Make sampling differences explicit
before deciding whether they should share a helper.

Do not combine Explorer jump interpolation and Arrange's Web Animations shuffle
into a general motion framework. The active talk-motion plan correctly defers
that choice until there is a concrete need.

### 4. Worker transport leaks into rendering, and failures disappear — high priority

**Evidence:** `ExplorerPage.tsx:234–278` decodes flat worker responses by
`CARD_COUNT`, slices rows, evicts cache entries, and catches every request
rejection with `ignoreRejection`. `884–894` constructs the worker itself.
`DeckRow` then converts the typed array and casts values to `CardId` (`89–113`).

`src/worker/DeckBatchSource.ts:42–46` rejects actual worker errors, but
supersession (`56`) and termination (`82`) also use ordinary `Error` objects.
The UI discards all three. An injected worker error in Chromium produced 19
loading rows, zero cards, and no error presentation. A failed pending batch
therefore looks like ongoing “Shuffling…”.

**Recommendation:** extract a worker-backed row resource that owns factory
lifetime, the bounded cache, decoding, and status. Keep transport sequencing in
`DeckBatchSource`; define distinguishable cancellation and failure outcomes.
Expose per-index cards plus loading/error/retry state to presentation. Establish
the card-ID interpretation at this adapter boundary instead of asserting it in
the row renderer. Move message interfaces from the executable worker entry to a
neutral protocol module when changing that interface; the current type-only
imports are erased and are not a runtime worker import bug.

Preserve synchronous deck labels, bounded memory, and stale-response suppression.

### 5. Route and page-shell contracts are implicit — medium priority

**Evidence:** `firstSearchParam`, initial-read suppression, and the
`ownDeckParam` echo guard are duplicated in Explorer (`71–75`, `431–469`) and
Arrange (`82–86`, `225–277`). Arrange imports its URL parser from
`virtualization/deck-param.ts` even though it does not use virtualization.
Explorer also uses that URL parser for submitted form text (`471–472`).

The `intro?: JSX.Element` prop appears general, but Explorer assumes supplied
content contains the ID `hero-title` (`902–904`), which Home happens to provide
(`HomePage.tsx:11–13`). It also adds a body class (`785`, `847`) whose CSS changes
the enclosing `main` layout (`styles.css:787–797`) and consumes `--page-gutter`
defined by that layout (`34–40`, `661–665`). Reuse requires knowledge that is
absent from the prop contract.

**Recommendation:** put deck text/URL normalization in a navigation boundary
and factor the shared query/history mechanism into a narrow Solid adapter.
Keep commit timing feature-owned: Explorer commits navigation immediately;
Arrange commits settled interactions. Do not bind every scroll or drag frame
to the query string.

Have the route/layout explicitly own viewport mode and document scroll locking.
Pass an accessible label or labelled-by ID for supplied intro content. Retain
Home's intro slot: it is a useful composition mechanism once its actual contract
is explicit. Its 29-line wrapper does not itself need further subdivision.

### 6. The stepper has conflicting state owners — high priority

**Evidence:** `src/UnrankStepper.tsx:21–30` reads
`props.index ?? chosenIndex()`, but its editable input only calls
`setChosenIndex`; there is no change callback for controlled use. Both How
(`64–68`) and Talk (`58–62`) supply `index` from their own four-card signal.

**Chromium reproduction:** on `/how`, advance the four-card stepper once and
enter `5`. The input returns to `0`, and the displayed trace still belongs to
index zero. Advance to step 3 and select table row 5: the index changes to 5,
but the progress remains “step 3 of 4”, despite the page promising to replay the
selected ordering. `chooseIndex` resets progress; a parent index change does not.

**Recommendation:** define one controlled contract, such as `index` plus
`onIndexChange`, and put optional local ownership in a wrapper if needed. Handle
index/size transitions in the walkthrough controller so every selection follows
the same progress-reset policy. Then split controls from a trace-driven stage
where reuse by the talk requires it. An ownership fix matters more than the
number of resulting files.

### 7. Talk owns keys belonging to its embedded controls — high priority

**Evidence:** `src/TalkPage.tsx:100–113` installs a window-level key handler
without checking the event target or whether an embedded control has handled
the event. Explorer already protects interactive targets (`582–589`).

**Chromium reproduction:** open Talk, advance to the three-card slide, focus its
index input, and press Right Arrow. The presentation advances to the four-card
slide. Presentation navigation can therefore remove the component while the
visitor is editing it. Space is also globally intercepted.

**Recommendation:** extract presentation navigation and scope shortcuts to the
presentation surface with an explicit interactive-target/default-prevented
policy. Keep slide rendering and content independent of window listeners.
Reuse a small target predicate if both Explorer and Talk need the same policy;
sharing all keyboard handlers would conflate different navigation semantics.

### 8. How and Talk share widgets but duplicate the walkthrough — medium priority

**Evidence:** `HowPage.tsx:34–79` and `TalkPage.tsx:31–77` repeat the 2/3/4/5-card
sequence, initial indices 4 and 73, factorial headings, and the four-card
table/stepper wiring. Both pages own the four-card selection signal. Fixing the
coupling in finding 6 would currently require updating both compositions.

**Recommendation:** extract a `FourCardWalkthrough` with explicit state
ownership and reusable example definitions for the fixed demonstrations. How
composes article sections; Talk composes slides around the same examples.
Keep their differently paced prose separate where that serves the format.
Preserve Talk's current selection lifetime across slide navigation by keeping
the shared example controller above conditional slide mounts where needed.
As talk motion evolves, expose mathematical state from these examples without
importing the whole How page or selecting behavior through a growing `mode` prop.

Why's 77 lines are largely cohesive prose. There is little benefit in turning
each of its paragraphs into a component. Extract semantic sections when they
gain state or an actual reuse site.

### 9. CSS crosses component boundaries and duplicates control styling — medium priority

**Evidence:** How uses `class="why how"` and `why-title`
(`HowPage.tsx:16–18`) to obtain its article layout. Hero typography is declared
on every `h1` and `h1 span` (`styles.css:113–126`), then other headings override
it. `.why p` (`410–414`) reaches into nested steppers and outranks
`.stepper-math`/`.stepper-result` (`555–565`). At a 1280px Chromium viewport, the
math paragraph computed to 17.92px type, 29.568px line height, and 16px bottom
margin, overriding its own 0.9rem type and 0.5rem bottom margin.

Button border/background/color/cursor and hover declarations recur in Arrange
(`216–236`), Stepper (`506–523`), Talk (`613–631`), and Jump (`755–776`). Sizes
and some visual treatments intentionally differ.

**Recommendation:** establish shared design tokens and an action-button base
with a few explicit variants; CSS classes may be enough without a wrapper
component. Give article layout a neutral name such as `article-layout` or
`ProseLayout`, and scope prose typography so interactive children own their
styles. Scope hero heading rules to the hero. Split CSS by feature/shared
component ownership while preserving cascade order and colocating responsive
rules with their owners. Splitting the existing file into imports alone would
not fix these leaks.

### 10. Card faces are shared; spread geometry is duplicated — lower priority

**Evidence:** Explorer (`104–113`) and Arrange (`625–629`) both assign a card
position and reversed stacking order. `.arrange-card` and `.deck-card` repeat
the same right-to-left placement formula with `/ 51`
(`styles.css:284`, `940`), while Arrange also computes the inverse hit-test
mapping (`ArrangePage.tsx:51–68`). Explorer hardcodes its stack size as 52.

**Recommendation:** give spread placement one documented geometry contract,
with shared CSS variables or a small slot-style helper. Keep interactive
Arrange buttons separate from passive Explorer wrappers. Explicitly preserve
position zero as the rightmost/topmost card. A single configurable “deck”
component encompassing both scrolling features would recreate the current
ownership problem.

`PlayingCard` is already a good presentation boundary. Its pip/court data table
accounts for much of its size; it does not need to become many tiny components.
Card naming can be centralized in a presentation helper if accessibility labels
and developer captions are brought into alignment. Its inherited `--card-width`
is a reasonable styling contract to document, not automatically a defect.

## Additional correctness findings in the shared examples

- **Factorial notation is applied twice.** `UnrankStepper.tsx:91` prints
  `current.blockSize` followed by `!`, but `domain/trace.ts:8–9` defines that
  value as an already-computed factorial. Chromium displays
  “digit 3 × 24! = 72” for the initial five-card example. Render “3 × 24 = 72”,
  or derive the factorial argument when displaying factorial notation. Keep
  symbolic formatting distinct from the domain's computed block size.
- **Selectable table rows have no keyboard control.**
  `PermutationTable.tsx:38–43` attaches `onClick` to a `tr`, without a focusable
  action. Chromium found zero buttons or tab stops in the four-card table body.
  Put a real selection button in a cell and let the shared table own its
  keyboard semantics. This affects both How and Talk.

`PermutationTable` also accepts an unrestricted `size: number` while eagerly
enumerating `size!` rows (`13–24`). Current callers use only 2 and 4, so this is
an API precondition to document/enforce during extraction, not a current
large-table performance finding. There are no benchmark-based performance
claims in this audit.

## Suggested implementation order

1. Fix the stepper ownership/progress contract, Talk keyboard boundary, table
   keyboard selection, and factorial notation. Add focused behavioral coverage
   for those observable defects.
2. Extract the worker row resource and distinguish cancellation from failure;
   cover initial load, supersession, error presentation, retry, and cleanup.
3. Extract deck query synchronization and motion primitives with explicit
   policies, preserving the pages' different commit/gesture semantics.
4. Decompose Explorer and Arrange along the owners described above. Keep state
   ownership and DOM lifetime stable during each extraction; avoid one large
   simultaneous rewrite.
5. Compose How/Talk from shared examples and move styles alongside their
   owners, introducing neutral article and control styling as needed.

Expected route composition after these changes:

| Route/feature       | Rendering parts                                                 | Logical owners                                                                      |
| ------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Home / Explorer     | Intro, controls, feed, row, rail                                | Route query, exact position, browser surface input/measurement, worker row resource |
| Arrange             | Actions, deck-number status, spread, card button                | Editor transactions, gesture session, shuffle animator, route query                 |
| How                 | Article sections, shared examples                               | Example selection and walkthrough progress                                          |
| Talk                | Presentation shell, slide, navigation controls, shared examples | Presentation navigation, example selection and progress                             |
| Shared presentation | PlayingCard, article layout, action styles                      | Card labels/geometry and design tokens where genuinely shared                       |

These are ownership targets, not a requirement to create a file for every JSX
fragment or a public abstraction for every helper.

## Verification and limits

Inspected all UI route/shared component source, the complete stylesheet, the
worker interface and implementation, domain trace/card/index contracts,
virtualization exports, relevant architecture decisions (0007–0009, 0012–0013),
active Explorer/talk plans, and relevant existing unit/browser coverage.

Targeted installed Playwright/Chromium probes against a local Vite+ dev server
confirmed the stepper input/progress defects, Talk key interception, incorrect
factorial notation, absent table selection tab stops, CSS specificity result,
and worker-error loading state. The worker failure was deliberately injected;
this does not claim a spontaneous production worker failure. No page errors
occurred in the ordinary walkthrough probes.

Existing browser coverage is substantial for Explorer/Arrange motion, bounds,
history, and layout. `mobile-layout.spec.ts` exercises Stepper Next/Back, but
does not cover the controlled input, table replay, or Talk shortcut findings.
Existing `DeckBatchSource` tests cover success, supersession, stale responses,
and termination, but not the UI's failure presentation.

Full application quality gates were not rerun for this documentation-only
audit. Any implementation touching input, motion, geometry, or cancellation
must run the existing Playwright suite as well as focused tests and the normal
quality gates. Pure tests remain useful for extracted arithmetic and state
transitions; they do not replace browser verification.

The environment's fallback `pnpm.cmd dev` attempted dependency maintenance and
aborted before serving. The installed local `vp.cmd` started the dev server
successfully. The newly created local store artifact was removed; no dependency
or lockfile changes were retained. Chromium required execution outside the
filesystem sandbox because its initial process launch returned `EPERM`.
The audit dev server was stopped after the probes. Both audit documents were
formatted with the installed Vite+ formatter.
