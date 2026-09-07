# Status against PROMPT.md

Honest record of what is built, what is stubbed, and what is not done. Written so the next
person does not have to rediscover it.

## Milestones

| Milestone                        | State                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| M0 foundation                    | done                                                                |
| M1 contract delta                | done, merged in `briany-contract`, Spectral-clean, regenerated here |
| M2 Applications, read and manage | done                                                                |
| M3 editor host                   | done                                                                |
| M4 BPMN modeler                  | done                                                                |
| M5 form and DMN editors          | done                                                                |
| M6 descriptor palette            | partial - see below                                                 |
| M7 Processes                     | done                                                                |
| M8 Tasks                         | done                                                                |
| M9 hardening                     | partial - see below                                                 |

## What is stubbed or partial

### M6: the descriptor palette section

`DescriptorPropertiesProvider` is complete and the compiler behind it is pure and fully
unit-tested (every binding and condition case in `BpmnElementDescriptor.yaml`). An element
carrying `briany:descriptorId` gets its generated group, pinned to the descriptor version it
was configured with, plus an unlink action.

What is **not** built is the palette's **Custom** section: `getBpmnPalette` is consumed
(`useBpmnPalette`) and the descriptors are injected into the modeler, but
`BrianyPaletteProvider` does not yet render an entry per descriptor category with its
`icon` data URI. PROMPT 7.5.5 explicitly allows this ordering: "the panel must be built so
descriptors are a first-class group source from day one, even if the palette section ships
later." The seam is in `src/modeling/bpmn/palette/PaletteProvider.ts` - a `Custom` group
alongside the existing ones, reading `brianyDescriptors` from the injector, which is
already wired.

### M9: hardening

Done: empty and error states throughout, three-tier error handling, skeletons matching
final layouts, route-level code splitting with each modeler lazy-loaded, keyboard shortcuts
documented in `/settings`, the axe-core suite over the four main routes in both themes, and
the three Playwright flows. The initial-JS budget is enforced in CI by
`scripts/check-bundle-budget.sh`: 193 KB gzipped against a 250 KB budget, with the three
modeling libraries and the two heavy editors in their own lazily-loaded chunks.

Not done:

- **Table virtualisation.** PROMPT 11 asks for it above 100 rows. Page size is capped at
  50 everywhere, so no table can currently exceed it, but a raised page size would need
  `@tanstack/react-virtual` in `design/components/Table.tsx`.
- **The Playwright flows have not been run green end to end.** They are written against the
  contract, and flows 2 and 3 depend on endpoints the backend has not implemented. They run
  in CI against the MSW build; against a real engine they are unverified.

## Where the spec and reality differ

Two places where building it exposed something the spec assumed incorrectly. Both are
documented at the point of use as well as here.

### `flowable:field` in attribute form is editable after all

PROMPT 7.5.2 states that an imported `flowable:expression` **attribute** lands in moddle's
`$attrs`, re-serialises verbatim, and cannot be edited by the panel.

Measured against `bpmn-moddle` 10: it does not. moddle parses the attribute into the same
modelled property our descriptor declares as a child element, so the value reads and edits
normally - and re-serialises as a child element. The value survives; only the choice
between two equivalent spellings does not.

`stringValue` is the one form that genuinely persists as an attribute, so it is what
`isAttributeForm` reports and what the panel's **Normalise fields** action rewrites. The
round-trip suite pins all of this, and `src/modeling/bpmn/moddle/README.md` carries the
table.

### The instance list cannot filter by definition key as a query parameter

PROMPT 8.3 lists process definition key as an MVP filter on `/processes/instances`. The
contract exposes it as a separate operation - `listProcessProcessInstances`, keyed by path -
rather than as a parameter on `listProcessInstances`. `InstanceTable` selects between the
two, so the filter works and no contract change was needed. It is noted here because the
next filter to be added (business key, started by, a date range) genuinely does need one:
see PROMPT 5.9 and the disabled fields already laid out in the filter panel.

## Backend work this build depends on

Listed in full in [`contract-delta.md`](contract-delta.md). The short version: none of the
Identity, Platform or Task operations exists yet, `getProcessInstance` is in the contract
but 404s because of a stale tag on the generated interface, `ApplicationMapper` does not
populate `deployedResources`, deploy failures do not yet use the
`<fileKey>#<elementId>` convention in `Problem.errors[]`, and the script/shell exclusion is
still configuration rather than an invariant on the engine side.

Until those land, `VITE_MSW=1` serves the missing endpoints from fixtures derived from the
contract's own examples. Every handler is deleted in the same commit as its endpoint
landing.
