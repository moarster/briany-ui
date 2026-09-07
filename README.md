# briany-ui

Control panel for the Briany BPM platform (embedded Flowable 8). React 19 / Vite 8 /
TypeScript 6.

Three sections:

- **Applications** - a modeling workspace, in the shape of Camunda Web Modeler's process
  application: a folder holding a BPMN entry point plus the decisions and forms it depends
  on, versioned and deployed as one bundle. Includes the BPMN, form and DMN editors.
- **Processes** - Operate-shaped triage: definitions with instance counts, a diagram-first
  instance page, and every filter in the URL.
- **Tasks** - Tasklist-shaped worklist: a filter rail, a task queue, and a detail pane that
  renders the task's form or its raw variables.

## Companion repositories

| Repo                                                             | Role                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`briany-contract`](https://github.com/moarster/briany-contract) | OpenAPI 3.1 contract, source of truth. Consumed here as the `contract/` submodule. |
| `briany-flowable-engine`                                         | Kotlin / Spring Boot 4 / Flowable 8 backend. Implements the same contract.         |
| `briany-ui` (this repo)                                          | The frontend.                                                                      |

**API-first is not negotiable.** If a feature needs data the contract does not expose, the
fix is a change to `contract/rest/openapi-v1.yaml` - never a workaround on the client. No
direct calls to the Flowable REST API, no scraping, no derived state the server should own.
What this build required of the contract is recorded in [`docs/contract-delta.md`](docs/contract-delta.md).

Everything in this repository is English: code, comments, identifiers, commit messages,
docs and UI copy.

## Getting started

    git clone --recurse-submodules git@github.com:moarster/briany-ui.git
    cd briany-ui
    pnpm install
    pnpm dev

Requires Node 22+ and pnpm 12. `pnpm dev` serves on `http://localhost:5173` and proxies
`/api` to `http://localhost:8095`, so the browser stays single-origin: no CORS, and no
credentials in a cross-origin preflight.

Most of the Processes and Tasks endpoints are not implemented in the backend yet. Run
against the mock handlers instead:

    VITE_MSW=1 pnpm dev

The mocks are dev-only and never bundled into a production build.

## Scripts

| Script                 | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `pnpm dev`             | Vite dev server                                            |
| `pnpm build`           | Typecheck then build                                       |
| `pnpm preview`         | Serve the production build                                 |
| `pnpm lint`            | oxlint                                                     |
| `pnpm typecheck`       | `tsc -b`                                                   |
| `pnpm format`          | Prettier                                                   |
| `pnpm test`            | Vitest: unit, component and the modeler round-trip suite   |
| `pnpm test:e2e`        | Playwright: the three flows                                |
| `pnpm api:generate`    | Regenerate the client from the contract submodule          |
| `pnpm api:check`       | Fail if the committed client has drifted from the contract |
| `pnpm contract:update` | Pull the contract submodule and regenerate                 |

## Configuration

Runtime configuration lives in `public/config.json`, fetched once before the app renders:

```json
{
  "apiBaseUrl": "/api",
  "authMode": "basic",
  "productName": "Briany",
  "features": { "glass": true }
}
```

It is deliberately not a build-time env var: one built image has to serve any environment.

Authentication is HTTP Basic against Flowable IDM, with our own login form. The credential
is held in `sessionStorage` under a single key, so closing the tab drops it. Never
`localStorage`, and never a cookie this application sets itself.

## Layout

```
contract/                    git submodule -> briany-contract
docs/contract-delta.md       what this build required of the contract
scripts/                     CI guards
src/
  api/                       the API boundary; nothing outside it fetches
    generated/               @hey-api output, committed, never hand-edited
  app/                       router, providers, routes, shell
  design/                    tokens, glass, components, vendor theming
  features/                  auth, applications, processes, tasks
  modeling/                  the three editors and everything they share
    bpmn/                    palette, panel, lint, moddle, overlays
  lib/
tests/e2e/                   the three Playwright flows
```

## Rules the codebase enforces

These are checked in CI, not just written down.

- **Nothing outside `src/api` imports from `src/api/generated`.** Feature code imports from
  `src/api`, which re-exports. One place to adapt when the contract changes shape.
- **No `fetch` outside `src/api`.** Every request goes through the generated, configured
  client.
- **`src/api/generated` is committed**, and `pnpm api:check` fails the build when it has
  drifted from the contract submodule. A contract change has to land as a code diff a
  reviewer can see.
- **No hardcoded colours, spacings or radii outside `src/design/tokens.css`.**
- **No script or shell task authoring surface anywhere.** `scripts/check-no-script-tasks.sh`
  greps `src/` and fails the build on any hit outside `modeling/bpmn/constants.ts` and
  `modeling/bpmn/lint/`. See below.

## The script and shell exclusion

Briany never executes arbitrary code supplied through a process model. Script tasks
(`bpmn:ScriptTask`, in any language) and shell tasks (`<serviceTask flowable:type="shell">`)
are permanently excluded from the platform.

This is a product decision, not a deployment setting. It is **not** exposed through
`EngineCapabilities`: there is no configuration under which the UI offers them. The palette
and context pad simply do not declare the entries, so no capability response can bring them
back, and `flowable:type` is a closed select whose only value is `http`.

An imported model containing one still opens and round-trips without loss - import is
permissive, authoring is strict - but it raises a blocking lint error, the properties panel
offers only General and Documentation plus a notice, and the engine refuses to deploy it.
The only offered path forward is converting the element to a plain task and rewriting it
against a delegate from the allowlist, the HTTP task, or an element descriptor. Every one of
those is a capability the platform team has vetted, rather than code an author pastes into a
diagram.

The invariant lives in `src/modeling/bpmn/constants.ts` and nowhere else.

## Design

Dark by default, light supported, dense throughout: 34px rows, 13px base, a 4px spacing
grid. Teal is the primary, cinnabar the accent. Danger is rose rather than cinnabar, because
the accent is already a warm red-orange and an alarm in the same hue family would be
indistinguishable at chip size.

Colour carries one meaning at a time: type identity is an icon colour, state is a chip,
severity is a semantic colour plus an icon, and the three vocabularies never share a hue.
Nothing encodes meaning by colour alone - every state chip has a label, every severity has
an icon.

Liquid glass is scoped to chrome and overlays: the sidebar, top bar, command palette,
dialogs, popovers, toasts and the application tiles. Working surfaces - tables, diagram
canvases, forms, code editors - stay opaque. Three escape hatches are mandatory and all
implemented: `@supports not (backdrop-filter)`, `prefers-reduced-transparency: reduce`, and
a switch in `/settings` wired to `config.json`.

## Keyboard

| Keys                         | Action                               |
| ---------------------------- | ------------------------------------ |
| `Cmd/Ctrl + K`               | Command palette                      |
| `Cmd/Ctrl + S`               | Save the active editor or the README |
| Middle click                 | Close an editor tab                  |
| `Space + drag`               | Pan the BPMN canvas                  |
| `Cmd/Ctrl + scroll`          | Zoom the BPMN canvas                 |
| `Cmd/Ctrl + Z` / `Shift + Z` | Undo and redo in a modeler           |
| Arrow keys                   | Move the selected element            |
| `Delete`                     | Remove the selected element          |

The list is also rendered in `/settings`, because the BPMN canvas is not accessible on its
own. Where it is not, the instance history tree is its keyboard-navigable equivalent and is
kept functionally complete.

## Status

Built to PROMPT.md, milestones M0 through M9. What is not done is recorded honestly in
[`docs/status.md`](docs/status.md).
