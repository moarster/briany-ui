# Briany UI - build prompt

Control panel for the Briany BPM platform (embedded Flowable 8). This document is the
single specification for building the frontend. It is written to be executed
top-to-bottom by an engineer or an agent.

Companion repositories:

| Repo                                                                    | Role                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `briany-contract` (`github.com/moarster/briany-contract`)               | OpenAPI 3.1 contract, source of truth. Consumed here as a git submodule.   |
| `briany-flowable-engine` (`github.com/moarster/briany-flowable-engine`) | Kotlin / Spring Boot 4 / Flowable 8 backend. Implements the same contract. |
| `briany-ui` (this repo)                                                 | React 19 / Vite 8 / TypeScript 6 frontend.                                 |

**API-first is not negotiable.** If a feature needs data the contract does not expose,
the fix is a change to `briany-contract/rest/openapi-v1.yaml`, never a workaround on the
client (no direct calls to the Flowable REST API, no scraping, no derived state that the
server should own). Section 5 lists every contract change this build requires; it is a
deliverable of the same weight as the UI code.

Everything in this repository is English: code, comments, identifiers, commit messages,
docs, and UI copy.

---

## 0. Fixed decisions

These were settled during analysis. Do not relitigate them.

| Topic                        | Decision                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP shape                    | Applications deep (grid, app page, three editors, deploy). Processes and Tasks minimal but genuinely usable.                                                   |
| Router / data / state        | TanStack Router (file-based, typed search params) + TanStack Query + Zustand (UI state only)                                                                   |
| Styling                      | Tailwind CSS v4 (CSS-first tokens) + Radix primitives, own components on top                                                                                   |
| Codegen                      | `@hey-api/openapi-ts` - types + SDK + TanStack Query plugin, output committed                                                                                  |
| Auth                         | HTTP Basic against Flowable IDM, own login form. No OIDC in this iteration.                                                                                    |
| New editor file              | Client generates a starter template from a New file dialog, uploads via the existing multipart endpoint                                                        |
| Editor save                  | Explicit Save, dirty indicator, Cmd/Ctrl+S, navigation guard. No autosave.                                                                                     |
| BPMN properties panel        | Own panel built on `@bpmn-io/properties-panel` primitives. Two group sources: hand-written Flowable groups plus groups generated from `BpmnElementDescriptor`. |
| Engine constraints           | Driven by a new `GET /api/v1/engine-capabilities`. The UI never offers something the engine will reject.                                                       |
| BPMN palette                 | Trimmed to the engine activity whitelist                                                                                                                       |
| Script and shell tasks       | Permanently excluded from the product, hardcoded, not configurable. See 1.5.                                                                                   |
| Processes contract additions | BPMN XML, activity history, variables, instance operations, start process                                                                                      |
| Tasks contract additions     | list, get, form, claim/unclaim/assign, complete, plus `GET /api/v1/me`                                                                                         |
| Form binding                 | Combobox with two groups (this application / deployed) plus free text and inline actions                                                                       |
| Identity                     | `GET /api/v1/me` only. No user/group directory in this iteration.                                                                                              |
| Liquid glass                 | Chrome and overlays only. Working surfaces (tables, canvases, forms) stay opaque.                                                                              |
| Theme                        | Light and dark, dark by default, dense layout                                                                                                                  |
| Palette accents              | teal primary, cinnabar accent, danger deliberately NOT cinnabar (see 10.2)                                                                                     |

> Explicitly deferred to a later iteration, with contract sketches provided in 5.9 so the
> backend can plan: incidents and dead-letter jobs, extended process instance filters
> (business key, variable, date range, started by), batch operations, process instance
> modification and migration, saved task filters, user and group directory, element
> descriptor authoring UI, CMMN, multi-tenancy, OIDC.

---

## 1. What we take from the reference products

The brief names four references. This section records what each one actually does well
and what of it lands where. Build to this table, not to a vague resemblance.

### 1.1 Camunda Web Modeler -> Applications

Web Modeler's central idea since 8.10 is the **process application**: a folder holding a
BPMN entry point plus the DMN diagrams and forms it depends on, versioned and deployed
**as one bundle** rather than file by file. Our `ModelerApp` is exactly this concept, and
the contract already matches it (`state: draft | synced | ahead`, aggregate content hash,
`POST /{key}/deploy`).

Take:

- **Project grid as the home screen.** Large cards, a persistent "new" affordance in the
  grid itself rather than only a toolbar button.
- **File list inside the application**, typed by icon, with per-file status.
- **Bundle deploy** with a single deploy control at application level, plus a visible
  sync state. Web Modeler shows a per-file and per-app deployment state; our
  `draft/synced/ahead` triple is the same idea, sharper.
- **Editor split into Design and Implement concerns.** Web Modeler separates "draw the
  shape" from "wire it to the engine". We do the same by grouping the properties panel:
  General and Documentation first, engine wiring below.
- **Element templates.** Web Modeler's connector and element templates turn a generic
  service task into a named, form-configured element. Our `BpmnElementDescriptor` is a
  deliberately simplified version of the same mechanism and is already in the contract.
  This is the project's headline low-code feature; the panel must be built so descriptors
  are a first-class group source from day one, even if the palette section ships later.

Leave:

- Milestones, diff view, collaborative cursors, comments, blueprints, publication
  workflow, CI/CD tokens. Our workspace is mutable and single-user for now.

### 1.2 Camunda Operate -> Processes

Operate is a triage tool. Its shape is: **filters on the left, diagram top-centre,
instance table below**, and a per-instance page with **diagram plus instance history tree
plus a bottom panel of Details / Incidents / Variables tabs**. The dashboard shows
"Process Instances by Name" grouped by definition.

Take:

- **Diagram-first instance inspection.** The BPMN diagram is the primary navigation
  surface: completed path highlighted, active nodes carrying a token count badge,
  clicking a node filters the history tree and the variables.
- **Instance history as a tree**, not a flat log. Flowable's historic activity instances
  give us the same data.
- **Filters live in the URL.** Every filter is a typed search param, so an operator can
  paste a link to a filtered view. This is the single most valuable Operate behaviour and
  it costs almost nothing with TanStack Router.
- **Per-definition counts** on the definitions list, so the operator sees where the load
  and the trouble are before drilling in.
- **Operations column** with confirmation on destructive actions.

Leave for now:

- Incidents and retries. Flowable's equivalent is the dead-letter job, which the contract
  does not model yet. This is the biggest honest gap versus Operate and it is iteration 2
  (sketch in 5.9). Until then the instance page must not pretend a failed instance is
  healthy: surface `state` faithfully and link to the activity where execution stopped.
- Batch operations, modification, migration.

### 1.3 Camunda Tasklist -> Tasks

Tasklist is a two-pane worklist: **filter rail plus task queue on the left, task detail
on the right**. Predefined filters are All open, Assigned to me, Unassigned, Completed.
Sorting is by creation date, due date, follow-up date, or priority. A queue item shows
task name, process name, assignee, priority, creation date, due date. The detail pane
renders the task's form, or the raw variables when there is no form, and offers a
**Process** tab with the BPMN diagram. A separate **Processes** page starts new instances
through their start forms.

Take: all of the above, minus follow-up dates and custom filters.

The backend is already halfway there: `FormedTaskService` resolves a task plus its
`bform` schema plus the bound variables, merging runtime and historic tasks, and
`TaskForm` is already a contract schema. It just has no path. That is the single largest
piece of contract work in this build.

### 1.4 Flowable Modeler -> BPMN editor semantics

Flowable removed its bundled UI in v8, which is why this project exists. What survives is
the **semantics**: what Flowable's BPMN parser and validators actually accept. The editor
must be built against those rules, and the engine in this repository tightens them
further:

| Engine rule                                                                                  | Source                                                    | Consequence for the editor                                   |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Activity whitelist `user_task, service_task, call_activity, sub_process, business_rule_task` | `application.properties`, `CustomActivityBehaviorFactory` | Palette is trimmed to these plus events, gateways and flows  |
| `delegateExpression` identifiers must be in `ALLOWED_DELEGATE_BEANS` (today: `kvDelegate`)   | `SafeBpmnDeploymentValidator`                             | Delegate is a **select**, never free text                    |
| `class="..."` must start with `ru.briany.` or `org.flowable.`                                | same                                                      | Class-based implementation is hidden from the panel entirely |
| Exactly one `<process>` per file                                                             | `ModelerFileIntrospector` (see `modeler-app.md`)          | A second pool/participant must be blocked in the editor      |
| `.bpmn` / `.dmn` / `.bform` only                                                             | same                                                      | New file dialog offers exactly these three                   |

This coupling is the point: the editor is not a generic BPMN tool, it is a tool that
cannot produce a model this engine will refuse. `GET /api/v1/engine-capabilities` makes
the coupling data-driven instead of hardcoded.

### 1.5 Product rule: no script tasks, no shell tasks

**Briany never executes arbitrary code supplied through a process model.** Script tasks
(`bpmn:ScriptTask`, in any script language) and shell tasks
(`<serviceTask flowable:type="shell">`) are permanently excluded from the platform. This
is a product decision, not a deployment setting, and it is **not** exposed through
`EngineCapabilities`: there is no configuration under which the UI offers them.

Consequences that run through the whole document:

- No script task in the palette or the context pad; no Script group in the properties
  panel; no script language selector; no code editor for process logic.
- `flowable:type` is a closed select whose only value is `http`. Any other engine type,
  `shell` included, is unreachable from the UI.
- An imported model containing a script or shell task **opens and round-trips without
  loss** (the import-permissive rule in 7.5.4 still holds) but raises a blocking lint
  error, and deploying it is refused by the engine.
- The only extension paths for custom logic are the delegate allowlist, the HTTP task,
  and element descriptors. That is deliberate: every one of them is a capability the
  platform team has vetted, rather than code an author pastes into a diagram.

Corresponding backend work is listed in 5.8.

---

## 2. Tech stack

Current scaffold is React 19.2 + Vite 8 + TypeScript 6 + oxlint + pnpm 12. Keep it, add:

```
@tanstack/react-router          routing, typed search params, route-level data
@tanstack/router-plugin         file-based route generation (Vite plugin)
@tanstack/react-query           server cache
zustand                         editor session state only
tailwindcss @tailwindcss/vite   v4, CSS-first configuration
radix-ui                        unstyled primitives (single package)
lucide-react                    icons
sonner                          toasts
@tanstack/react-table           headless tables
date-fns                        dates
zod                             search param and runtime validation

bpmn-js                         BPMN modeler and viewer
bpmn-moddle diagram-js          transitive, pin explicitly for the custom moddle
@bpmn-io/properties-panel       properties panel primitives
bpmnlint bpmn-js-bpmnlint       model linting
@bpmn-io/form-js                form editor and viewer
dmn-js dmn-js-properties-panel  DMN editor
@uiw/react-codemirror           README editing and read-only XML viewing only
@codemirror/lang-markdown
@codemirror/lang-xml
react-markdown remark-gfm       README rendering

dev: @hey-api/openapi-ts, msw, vitest, @testing-library/react,
     @playwright/test, prettier, husky, @commitlint/cli
```

Do not add a component kit (Mantine, MUI, shadcn as a whole). Radix primitives plus our
own tokens, because liquid glass and the teal/cinnabar identity have to be ours and
because we already inherit three third-party design languages from bpmn-js, form-js and
dmn-js.

Do **not** depend on `flowable-bpmn-moddle` from npm. It is version 0.0.2 and is a
verbatim copy of `camunda.json` with the prefix swapped. We vendor our own descriptor
(section 7.5.2).

---

## 3. Repository layout

```
briany-ui/
  contract/                      git submodule -> briany-contract
  openapi-ts.config.ts
  vite.config.ts
  .env.example
  public/config.json             runtime config, see 6.1
  src/
    main.tsx
    routeTree.gen.ts             generated, committed
    app/
      router.tsx
      providers.tsx              QueryClient, theme, toasts, error boundary
      routes/                    file-based routes, see 6.2
    api/
      generated/                 @hey-api output, committed, never edited by hand
      client.ts                  configured client: base URL, auth, problem+json
      problem.ts                 RFC 7807 helpers
      queries.ts                 re-exports and query-key helpers
    features/
      auth/
      applications/
      processes/
      tasks/
    modeling/
      shared/                    EditorHost, tab strip, dirty tracking, Problems drawer
      bpmn/
        BpmnEditor.tsx
        moddle/flowable.json
        moddle/briany.json
        palette/
        properties/
          groups/                hand-written Flowable groups
          descriptor/            descriptor -> group compiler
        templates/               starter XML
        lint/                    bpmnlint rules
        overlays/                runtime decorations shared with Processes
      form/
      dmn/
    design/
      tokens.css                 all design tokens, both themes
      glass.css
      vendor/                    bpmn-js / dmn-js / form-js theme overrides
      components/                Button, Table, Dialog, Combobox, Badge, GlassPanel, ...
    lib/
  tests/
    e2e/
  docs/
    contract-delta.md            mirror of section 5, kept in sync
```

---

## 4. Contract integration and codegen

### 4.1 Generation

`openapi-ts.config.ts`:

```ts
import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './contract/rest/openapi-v1.yaml',
  output: { path: './src/api/generated', format: 'prettier', lint: 'oxlint' },
  plugins: [
    '@hey-api/typescript',
    { name: '@hey-api/sdk', asClass: false },
    { name: '@hey-api/client-fetch', runtimeConfigPath: './src/api/client.ts' },
    { name: '@tanstack/react-query', queryOptions: true, mutationOptions: true },
  ],
})
```

Scripts:

```json
{
  "api:generate": "openapi-ts",
  "api:check": "openapi-ts && git diff --exit-code src/api/generated",
  "contract:update": "git submodule update --remote contract && pnpm api:generate"
}
```

Rules:

- `src/api/generated` is **committed**. Reviewers must see the contract delta land as a
  code diff.
- `pnpm api:check` runs in CI. A drift between the submodule and the committed output
  fails the build.
- Nothing outside `src/api` imports from `src/api/generated` directly. Feature code
  imports from `src/api`, which re-exports. This gives one place to adapt when the
  contract changes shape.

### 4.2 Client configuration (`src/api/client.ts`)

- Base URL from runtime config (6.1), not from a build-time env var, so one built image
  serves any environment.
- Request interceptor adds `Authorization: Basic ...` from the auth store.
- Response interceptor: on `401`, clear credentials and redirect to `/login` preserving
  the intended route; on `503` with `Retry-After`, surface a "backend unavailable" state
  rather than a generic error.
- Parse `application/problem+json` into a typed `ProblemError` carrying
  `status`, `title`, `detail`, `code`, and `errors: ValidationError[]`. Every error UI in
  this app renders `detail` and, when present, the per-field list. Never render a raw
  stack or a bare status code.

### 4.3 Query conventions

- Query keys come from the generated `queryOptions`; do not invent parallel keys.
- Lists use `placeholderData: keepPreviousData` so pagination and filtering do not blank
  the table.
- `staleTime`: 30s for catalogue data (applications, definitions, forms), 0 for runtime
  data (instances, tasks). Runtime lists poll on a 5s interval **only while the tab is
  visible and the list is the focused view**; use `refetchInterval` with a function that
  returns `false` when `document.hidden`.
- Every mutation invalidates the narrowest key that can have changed, plus a toast.
  Deploy invalidates the application, its files, the process definition list and the
  forms list.

### 4.4 Working ahead of the backend

The Tasks and Processes endpoints in section 5 will not exist on day one. Use MSW:

- `src/api/mocks/handlers/*` implement the new endpoints against fixtures derived from
  the `examples` already present in the contract schemas.
- Enabled by `VITE_MSW=1` in dev only. Never bundled into production.
- When an endpoint lands for real, delete its handler in the same commit. A handler that
  outlives its endpoint is a lie.

---

## 5. Contract delta

Everything below is a change to `briany-contract/rest/openapi-v1.yaml`. Follow that
repository's rules: English descriptions anchored in real documentation, `operationId`
plus exactly one tag per operation, PascalCase schema names, `x-spring-paginated: true`
on paginated lists, `x-audience` on new tags, Conventional Commits with a PascalCase
scope. Run `pnpm lint` (Spectral) there before committing.

New tags: `Identity`, `Platform`, `Task`. All singular, so the backend generator picks
them up. `ProcessDefinition` and `ProcessInstance` gain operations.

### 5.1 Identity

```
GET /api/v1/me            operationId: getCurrentUser        -> User
```

Tag `Identity`, `x-with-principal: true`. Returns the authenticated principal as the
existing `User` schema (`id`, `displayName`, `groupIds`). Powers "Assigned to me", the
avatar in the top bar, and claim/unclaim.

### 5.2 Platform capabilities

```
GET /api/v1/engine-capabilities   operationId: getEngineCapabilities -> EngineCapabilities
GET /api/v1/bpmn-palette          operationId: getBpmnPalette        -> BpmnPalette
```

Tag `Platform`.

```yaml
EngineCapabilities:
  type: object
  required: [allowedActivityTypes, allowedDelegateBeans, allowedClassPrefixes]
  properties:
    flowableVersion: { type: string }
    allowedActivityTypes: { type: array, items: { type: string } } # from briany.engine.whitelist.activities
    allowedDelegateBeans: { type: array, items: { type: string } } # SafeBpmnDeploymentValidator.ALLOWED_DELEGATE_BEANS
    allowedClassPrefixes: { type: array, items: { type: string } } # ALLOWED_CLASS_PREFIXES
    activityWhitelistEnabled: { type: boolean }
    httpTaskEnabled: { type: boolean }
```

There is deliberately no `allowedScriptFormats` and no script or shell capability flag.
Per 1.5 those task types are excluded at the product level; adding a field for them would
imply a configuration that must never exist. `allowedActivityTypes` must not contain
`script_task`, and the client treats its presence as a server misconfiguration: log it and
ignore it rather than surfacing a script task in the palette.

```yaml
BpmnPalette:
  type: object
  required: [elements]
  properties:
    elements:
      type: array
      items:
        $ref: './components/schemas/BpmnElementDescriptor.yaml'
```

`BpmnElementDescriptor.yaml` already exists in the contract and is currently referenced
by nothing. This wires it up. Since the contract is OpenAPI 3.1, the JSON Schema
2020-12 file with `$defs` refs cleanly.

An empty `elements` array is valid and must be handled: the palette then shows only the
built-in Flowable groups.

### 5.3 Process definition XML

```
GET /api/v1/processes/{key}/xml                       operationId: getProcessXml
GET /api/v1/processes/{key}/versions/{version}/xml    operationId: getProcessVersionXml
```

Tag `ProcessDefinition`. Response `200` with `application/xml`, `type: string`,
`format: binary`, plus `Content-Disposition` carrying the resource name - mirroring the
existing `getModelerAppFileContent`. Without this there is no diagram anywhere in
Processes or Tasks.

### 5.4 Process definition and application statistics

`INIT.md` requires stats on the application tiles ("graphically stats and status") and
the Operate-style definitions list needs the same numbers. Add an opt-in projection so
default listings stay cheap.

```yaml
ProcessInstanceStats:
  type: object
  required: [running, completed, suspended, total]
  properties:
    running: { type: integer }
    completed: { type: integer }
    suspended: { type: integer }
    total: { type: integer }

ModelerAppStats:
  type: object
  required: [processDefinitions, decisions, forms]
  properties:
    processDefinitions: { type: integer }
    decisions: { type: integer }
    forms: { type: integer }
    instances: { $ref: '#/components/schemas/ProcessInstanceStats' }
```

- `ProcessDefinition` gains optional `stats: ProcessInstanceStats`.
- `ModelerAppRef` gains optional `stats: ModelerAppStats`.
- `listProcesses`, `getProcess`, `listModelerApps` and `getModelerApp` gain
  `?includeStats=true` (default `false`).

Without this the client would have to issue one `size=1` request per row to read
`totalElements`, which is the kind of workaround this project forbids.

### 5.5 Process instance detail

```
GET /api/v1/process-instances/{id}/activities  operationId: listProcessInstanceActivities -> ActivityInstance[]
GET /api/v1/process-instances/{id}/variables   operationId: listProcessInstanceVariables  -> Variable[]
```

Tag `ProcessInstance`. Both unpaginated - a single instance's history and variable set
are bounded. If that proves wrong, paginate later.

```yaml
ActivityInstanceState:
  type: string
  enum: [active, completed, terminated]

ActivityInstance:
  type: object
  required: [id, activityId, activityType, state]
  properties:
    id: { type: string }
    activityId: { type: string } # BPMN element id - joins to the diagram
    activityName: { type: string }
    activityType: { type: string } # userTask, serviceTask, exclusiveGateway, ...
    state: { $ref: '#/components/schemas/ActivityInstanceState' }
    executionId: { type: string }
    taskId: { type: string }
    calledProcessInstanceId: { type: string }
    startTime: { type: string, format: date-time }
    endTime: { type: string, format: date-time }
    durationInMillis: { type: integer, format: int64 }

VariableScope:
  type: string
  enum: [global, local]

Variable:
  type: object
  required: [name, scope]
  properties:
    name: { type: string }
    type: { type: string } # string, integer, boolean, json, ...
    value: {} # any JSON
    scope: { $ref: '#/components/schemas/VariableScope' }
    executionId: { type: string }
    taskId: { type: string }
    createTime: { type: string, format: date-time }
    lastUpdatedTime: { type: string, format: date-time }
```

`activityId` is the join key to the BPMN element id. Everything the instance page does -
path highlighting, token badges, click-to-filter - hangs off it.

### 5.6 Process instance operations and start

```
POST   /api/v1/processes/{key}/start          operationId: startProcessInstance   -> 201 ProcessInstance
GET    /api/v1/processes/{key}/start-form     operationId: getProcessStartForm    -> 200 Form | 404
POST   /api/v1/process-instances/{id}/cancel  operationId: cancelProcessInstance  -> 204
DELETE /api/v1/process-instances/{id}         operationId: deleteProcessInstance  -> 204
```

```yaml
StartProcessInstanceRequest:
  type: object
  properties:
    businessKey: { type: string }
    name: { type: string }
    version: { type: integer, description: 'Start a specific version. Latest when omitted.' }
    variables: { type: object, additionalProperties: true }

CancelProcessInstanceRequest:
  type: object
  properties:
    reason: { type: string }
```

`cancel` terminates a running instance and keeps history. `DELETE` removes the historic
record; it is destructive and must be a separate operation with its own confirmation.

`getProcessStartForm` complements the existing `ProcessDefinition.hasStartForm` flag.

Also note: `getProcessInstance` is **already** in the contract but is not implemented. In
the backend's older copy of the spec this operation carried the plural tag
`ProcessInstances`, so it landed on a separate generated interface that no controller
implements, and the path 404s. The contract is now singular, so it belongs on
`ProcessInstanceApi` and `ProcessInstanceController` must implement it. Flag this to the
backend team: the instance detail page in section 8.4 depends on it.

### 5.7 Tasks

Tag `Task`, `x-audience: public`.

```
GET  /api/v1/tasks                 operationId: listTasks     -> TaskPage      x-spring-paginated, x-with-principal
GET  /api/v1/tasks/{id}            operationId: getTask       -> Task
GET  /api/v1/tasks/{id}/form       operationId: getTaskForm   -> TaskForm
POST /api/v1/tasks/{id}/claim      operationId: claimTask     -> Task          x-with-principal
POST /api/v1/tasks/{id}/unclaim    operationId: unclaimTask   -> Task
POST /api/v1/tasks/{id}/assign     operationId: assignTask    -> Task          body AssignTaskRequest
POST /api/v1/tasks/{id}/complete   operationId: completeTask  -> 204           body CompleteTaskRequest
```

`listTasks` query parameters:

| Param                   | Type                                           | Meaning                                                                      |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `state`                 | `active` \| `completed`                        | default `active`                                                             |
| `assignment`            | `any` \| `mine` \| `unassigned` \| `candidate` | resolved server-side against the principal; drives the four Tasklist filters |
| `assignee`              | string                                         | explicit assignee, mutually exclusive with `assignment`                      |
| `processDefinitionKey`  | string                                         |                                                                              |
| `processInstanceId`     | string                                         |                                                                              |
| `taskDefinitionKey`     | string                                         |                                                                              |
| `nameLike`              | string                                         | free-text search over task name                                              |
| `dueBefore`, `dueAfter` | date-time                                      |                                                                              |
| `page`, `size`, `sort`  |                                                | `sort` supports `createdAt`, `dueAt`, `priority`, `name`                     |

`assignment=candidate` means "tasks I could claim": candidate user is the principal or a
candidate group intersects the principal's groups. `unassigned` means `assignee is null`.
Doing this server-side is what `x-with-principal` is for and it keeps `GET /me` out of
the query path.

Schema changes:

- `Task` gains `processDefinitionKey` and `processDefinitionName` so the queue item can
  show the process name without an N+1 lookup.
- `Task.assignee` stays a `User` object.
- `TaskForm` is already defined and already implemented in `FormedTaskService`; expose it
  behind `getTaskForm`. When the task has no `formKey`, return `404` with a `code` of
  `TASK_HAS_NO_FORM` rather than an exception - the UI then renders the raw variables
  editor. (Today `FormedTaskService` throws `IllegalStateException` on a missing
  `formKey`; that has to become a typed `Problem`.)

```yaml
AssignTaskRequest:
  type: object
  required: [userId]
  properties:
    userId: { type: string }

CompleteTaskRequest:
  type: object
  properties:
    variables: { type: object, additionalProperties: true }
```

### 5.8 Cross-cutting backend work

1. **CORS.** `SecurityConfig` has no CORS configuration. Dev works through the Vite proxy
   (5173 -> 8095) and production is single-origin behind Traefik, but the contract stand
   and any future split deployment need it. Add a configurable allowed-origins list.
2. **Deploy failure detail.** `deployModelerApp` returns `400`/`409` with `Problem`. Fix
   the convention rather than the schema: populate `Problem.errors[]` with
   `field = "<fileKey>"` or `"<fileKey>#<bpmnElementId>"` and `message` = the engine
   validation message. The UI maps these straight onto files and diagram elements.
3. **`ApplicationMapper` does not populate `deployedResources`.** `modeler-app.md`
   section 7 already plans `resolveDeployedResources`; the Applications page needs it to
   link a workspace file to its deployed definition.
4. **Make the script and shell exclusion unconditional (per 1.5).** Today it is
   configuration, and configuration can drift:
   - Drop `script_task` from `briany.engine.whitelist.activities` in
     `application.properties`.
   - In `SafeBpmnDeploymentValidator`, replace the `ALLOWED_SCRIPT_FORMATS` check with an
     unconditional rejection of every `ScriptTask`, and reject
     `<serviceTask flowable:type="shell">` in the same pass. Neither should depend on
     `briany.engine.whitelist.enabled`.
   - In `CustomActivityBehaviorFactory`, keep `createShellActivityBehavior` returning
     `DisabledActivityBehavior` unconditionally rather than consulting the whitelist, and
     add the same treatment for script activity behaviour. Defence in depth: the
     validator stops deployment, the behaviour factory stops execution of anything that
     slipped in earlier.
   - Do not add `allowedScriptFormats` to `EngineCapabilities`.

### 5.9 Iteration 2 sketch (do not build now)

Recorded so the backend can shape the domain, not to be implemented in this build.

```
GET  /api/v1/process-instances/{id}/incidents  -> Incident[]     # Flowable dead-letter jobs
POST /api/v1/incidents/{id}/retry              -> 204
GET  /api/v1/users?search=                     -> UserPage       # assignee picker
GET  /api/v1/groups?search=                    -> GroupPage      # candidate groups
listProcessInstances: + businessKey, startedBy, startedAfter/Before, variableName+variableValue
POST /api/v1/modeler-apps/{key}/validate       -> ModelerFileError[]   # dry-run deploy validation
```

---

## 6. Application shell

### 6.1 Runtime configuration

`public/config.json`, fetched once before the app renders and held in a plain module:

```json
{
  "apiBaseUrl": "/api",
  "authMode": "basic",
  "productName": "Briany",
  "features": { "glass": true }
}
```

One build artifact, any environment. In dev, `vite.config.ts` proxies `/api` to
`http://localhost:8095` so no CORS and no credentials in the URL.

### 6.2 Routes

```
/login
/                                   -> redirect to /applications
/applications
/applications/$appKey
/applications/$appKey/files/$fileKey
/processes                          definitions list
/processes/$key                     definition detail (diagram, versions, instances)
/processes/instances                instance list, filters in search params
/processes/instances/$id            instance detail
/tasks                              two-pane worklist, ?taskId= selects
/tasks/start                        start a process from a start form
/settings                           theme, density, glass toggle, about
```

Every route is authenticated except `/login`. Use a `beforeLoad` guard on the root
authenticated layout that redirects to `/login?redirect=<href>`.

Search params are validated with zod through TanStack Router's `validateSearch`. The
instance list and the task list keep their entire filter state there.

### 6.3 Layout

Persistent left sidebar, collapsible to an icon rail, remembered in `localStorage`:

- Product mark, then: Applications, Processes, Tasks.
- Bottom: current user (from `GET /me`), theme toggle, settings, sign out.
- The sidebar is a glass surface (section 10.3).

Top bar per section: breadcrumb, contextual actions, global search entry point.

Command palette on Cmd/Ctrl+K: jump to an application, a process definition, an instance
by id, a task by id; run "Deploy application", "New application", "New file". Cheap to
build on Radix and it is the fastest path through a dense tool.

### 6.4 Auth

Login form: username, password, submit. On submit, encode `Basic`, probe
`GET /api/v1/me`, and on `200` store the credential.

Storage: `sessionStorage` under a single key, so a closed tab drops the credential.
State: a small Zustand store hydrated from `sessionStorage` at boot. Never `localStorage`
for credentials, never a cookie we set ourselves.

Show the authenticated user's `displayName` in the sidebar. Sign out clears
`sessionStorage`, resets the query cache, and navigates to `/login`.

---

## 7. Section: Applications

The deepest section in this iteration. Backed by `/api/v1/modeler-apps`.

### 7.1 Applications grid (`/applications`)

Responsive tile grid, `minmax(320px, 1fr)`, dense gap.

Application tile:

- Application `name` in the display face; `key` beneath in mono, muted.
- **State pill**: `Draft` (slate), `Synced` (teal), `Ahead` (amber). The pill is the
  single most important element on the tile; it answers "does what runs match what I
  edited".
- **File composition**: three small counters with the type icons (process / decision /
  form) from `stats.processDefinitions`, `stats.decisions`, `stats.forms`.
- **Runtime stats**: a compact horizontal bar split running vs completed from
  `stats.instances`, with the running count called out. Suppress entirely when the app
  has never been deployed - an empty chart on a draft is noise.
- Footer: `v{deployedVersion}` and `deployedAt` as relative time, or "Never deployed".
- Error affordance: when any file has `errorCount > 0`, a danger dot on the tile.
- Hover/focus reveals: Open, Deploy, kebab (Undeploy, Delete).

**New application pseudo-tile**: same footprint, dashed border, plus glyph, always last
in the grid (not first - the grid should not shift as applications are added). Opens a
dialog: `key` (required, validated `^[a-zA-Z][a-zA-Z0-9_-]{0,254}$`, uniqueness surfaced
from the `409`), `name`, `description`. On success navigate straight into the new
application.

Toolbar: search (client-side over the loaded page is acceptable at MVP; note the limit in
the empty state), state filter chips (All / Draft / Synced / Ahead, mapped to the existing
`?state=` query param), sort.

Empty state: an illustration-free, honest panel explaining what an application is and a
primary "Create application" action.

### 7.2 Application page (`/applications/$appKey`)

Layout follows `INIT.md` exactly: **files on top, description below**.

```
+--------------------------------------------------------------+
| Header: name  [state pill]  v3 . deployed 2h ago             |
|         key                          [Deploy] [kebab]        |
+--------------------------------------------------------------+
| Files                        [search] [type filter] [+ Add]  |
| +--------+ +--------+ +--------+ +--------+                  |
| | bpmn   | | bform  | | dmn    | | bpmn   |                  |
| +--------+ +--------+ +--------+ +--------+                  |
+--------------------------------------------------------------+
| Details (narrow)      | README (wide)         [Read | Edit]  |
| name                  |                                      |
| description           |  rendered markdown / CodeMirror      |
| key (read-only)       |                                      |
+--------------------------------------------------------------+
```

The lower area is a horizontal split; the divider is draggable and its position persists
per user in `localStorage`.

**Files area.** Grid of file cards by default, list view toggle for many files. Each card:

- Type icon, distinct per type and used consistently everywhere in the app:
  process = flow-chart glyph in teal, decision = table glyph in violet, form = form glyph
  in amber. Icon colour is the type's identity, it never encodes state.
- `name` (derived server-side from content) and `fileKey` in mono.
- **State chip** reusing the same `draft/synced/ahead` vocabulary as the application.
- Error badge with `errorCount` when non-zero, in danger colour with an icon.
- Click opens the editor. Kebab: Open, **Open runtime** (bpmn only, enabled only when
  `engineResourceId` is set, links to `/processes/$fileKey`), Download, Delete.

**Add file.** A menu, never a bare upload button, because the file type must be chosen
explicitly per `INIT.md`:

- `BPMN process` -> dialog (key, name) -> generate starter XML (7.5.3) -> `POST files` ->
  open the editor
- `Form` -> dialog (key, name) -> generate starter `bform` -> upload -> open the editor
- `DMN decision` -> dialog (key, name) -> generate starter DMN -> upload -> open the editor
- `Upload file...` -> file picker limited to `.bpmn,.dmn,.bform`, straight `POST files`

The key field validates as an XML `NCName` (`^[a-zA-Z_][a-zA-Z0-9_.-]*$`) because it
becomes the process/decision/form id, the derived `fileKey`, and the deployed definition
key. Explain that in the dialog's helper text; a user renaming this later means a new
definition, not a rename.

**Details column.** `name` and `description` inline-editable with debounce-on-blur
`PUT /modeler-apps/{key}`; `key` shown read-only with a copy button. Timestamps.
Deployment facts (`deploymentId`, `appDefinitionId`, `deployedVersion`) in a collapsed
"Deployment" disclosure with copy buttons - operators need these for log correlation.

**README column.** Two modes as specified:

- **Read**: `react-markdown` + `remark-gfm`, our typography, sanitised, external links
  get `rel="noreferrer"`.
- **Edit**: CodeMirror 6 with `@codemirror/lang-markdown`, our theme, soft wrap. Save via
  the same `PUT` as the metadata. Dirty state and Cmd/Ctrl+S consistent with the editors.

### 7.3 Deploy

The Deploy control is in the application header and reflects sync state:

| State    | Control                               | Meaning                           |
| -------- | ------------------------------------- | --------------------------------- |
| `draft`  | `Deploy` (primary)                    | never deployed                    |
| `ahead`  | `Deploy changes` (primary, amber dot) | workspace differs from the engine |
| `synced` | `Redeploy` (secondary)                | nothing to do, but allowed        |

Flow:

1. If any open editor is dirty, block and offer "Save all and deploy" / "Cancel".
2. If any file has `errorCount > 0`, block with the list. Do not attempt a deploy the
   server will refuse.
3. `POST /modeler-apps/{key}/deploy` with an optimistic pending state on the header.
4. **Success**: toast, invalidate the application, its files, process definitions and
   forms. The state pill flips to `Synced` and a `deployedApplication` link appears.
5. **Failure** (`400`/`409`): a persistent Deploy failed panel below the header, not a
   toast. It lists `Problem.errors[]` grouped by the `field` convention from 5.8: each row
   is a file name plus a message, and clicking it opens that file's editor, selecting the
   BPMN element when the field carries `#elementId`. This is the single most valuable
   interaction in the whole section - the whole point of a modeler over a ZIP upload.

`Undeploy` lives in the kebab, confirms, and explains that running instances of the
deployed definitions are affected.

`Delete application` confirms with a type-the-key challenge, because the backend cascades
an undeploy.

### 7.4 Editor host (`/applications/$appKey/files/$fileKey`)

One shell for all three editors, so behaviour is identical whichever file you open.

```
+--------------------------------------------------------------+
| App name / file name    [tab] [tab*] [tab]        [Deploy]   |
| [Save] [Revert]  state chip                                  |
+---------------------------------------+----------------------+
|                                       |                      |
|            editor canvas              |   properties /       |
|                                       |   palette            |
|                                       |                      |
+---------------------------------------+----------------------+
| Problems (3)                                          [^]    |
+--------------------------------------------------------------+
```

- **Tab strip.** Open files within the current application. Session state in Zustand,
  mirrored to `sessionStorage` keyed by app. `*` marks dirty. Middle-click closes.
- **Dirty tracking.** Each editor reports content changes upward; the host owns
  `isDirty` by comparing a hash of the serialised content against the last saved value,
  not by counting change events - bpmn-js fires changes for pure viewport moves.
- **Save.** Serialise, `PUT /modeler-apps/{key}/files/{fileKey}` as multipart with the
  file's `resourceName`. On success update the baseline hash and refresh the file
  metadata so the state chip flips to `ahead`. Cmd/Ctrl+S bound at the host.
- **Revert.** Confirm, then re-fetch content and reset.
- **Guard.** TanStack Router blocker on leaving with dirty tabs, plus `beforeunload`.
- **Problems drawer.** Collapsible bottom panel, merging three sources: client lint
  (bpmnlint for BPMN, schema validation for form and DMN), server-side `ModelerAppFile.errors`,
  and the last deploy's `Problem.errors` for this file. Each entry links to the offending
  element. Badge count on the collapsed header.
- **Key immutability.** If the user edits the process/decision/form id inside the editor,
  the derived key changes and `PUT` will reject with a mismatch. Detect this on save,
  explain it plainly, and offer "Save as a new file" (a `POST` that creates a second file)
  or "Revert the id". Do not let the user discover this through a raw 400.

### 7.5 BPMN modeler

The largest single component. Build it for extension - per the brief, this constructor
will be worked on for a long time.

#### 7.5.1 Composition

`bpmn-js` `Modeler` with:

```
additionalModules: [
  brianyPaletteModule,          // trimmed palette provider
  brianyContextPadModule,       // trimmed context pad
  brianyPropertiesPanelModule,  // our panel, see 7.5.5
  bpmnlintModule,               // linting, see 7.5.6
  brianyThemeModule,            // canvas theming hooks
]
moddleExtensions: { flowable: flowableModdle, briany: brianyModdle }
```

Keep every Briany module in its own directory with an `index.ts` exporting a didi module
definition. New capability = new module, never an edit spread across the editor
component.

#### 7.5.2 Moddle descriptors (vendored)

`src/modeling/bpmn/moddle/flowable.json`. Do not use the npm `flowable-bpmn-moddle`
(0.0.2, a copy of `camunda.json`). Derive ours from Flowable's own
`flowable-bpmn-extensions.xsd`. Minimum coverage for this iteration:

| Extends                                 | Attributes                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bpmn:Process`                          | `candidateStarterUsers`, `candidateStarterGroups`, `history`                                                                                                                   |
| `bpmn:StartEvent`                       | `initiator`, `formKey`, `formFieldValidation`                                                                                                                                  |
| `bpmn:UserTask`                         | `assignee`, `candidateUsers`, `candidateGroups`, `dueDate`, `priority`, `formKey`, `formFieldValidation`, `businessCalendarName`, `taskIdVariableName`                         |
| `bpmn:ServiceTask`, `bpmn:SendTask`     | `class`, `type`, `expression`, `delegateExpression`, `resultVariableName`, `skipExpression`, `triggerable`, `useLocalScopeForResultVariable`, `storeResultVariableAsTransient` |
| `bpmn:CallActivity`                     | `calledElementType`, `businessKey`, `inheritBusinessKey`, `sameDeployment`, `fallbackToDefaultTenant`                                                                          |
| `bpmn:Activity`                         | `async`, `exclusive`, `asyncLeave`, `asyncLeaveExclusive`                                                                                                                      |
| `bpmn:MultiInstanceLoopCharacteristics` | `collection`, `elementVariable`, `elementIndexVariable`                                                                                                                        |

Extension element types: `flowable:Field`, `flowable:ExecutionListener`,
`flowable:TaskListener`, `flowable:In`, `flowable:Out`, `flowable:FailedJobRetryTimeCycle`.

`bpmn:ScriptTask` is absent from that table on purpose (1.5). Nothing is lost on import:
`bpmn:ScriptTask` is standard BPMN and bpmn-moddle parses it, while unmodelled
`flowable:` attributes on it land in moddle's `$attrs` and re-serialise verbatim. The
element round-trips; it is simply not editable and it is flagged by lint.

**`flowable:Field` needs a documented compromise.** Flowable's XSD allows the value as
either an attribute (`stringValue`, `expression`) or a child element
(`<flowable:string>`, `<flowable:expression>`). moddle cannot model an attribute and a
child element that share the name `expression` on the same type. Therefore:

```json
{
  "name": "Field",
  "superClass": ["Element"],
  "meta": {
    "allowedIn": [
      "bpmn:ServiceTask",
      "bpmn:SendTask",
      "flowable:ExecutionListener",
      "flowable:TaskListener"
    ]
  },
  "properties": [
    { "name": "name", "isAttr": true, "type": "String" },
    { "name": "stringValue", "isAttr": true, "type": "String" },
    { "name": "string", "type": "String" },
    { "name": "expression", "type": "String" }
  ]
}
```

- `string` and `expression` are **child elements**. The editor **always writes the child
  element form**, which sidesteps escaping problems in JSON request bodies, URLs and
  expressions.
- The `stringValue` attribute is modelled so imported files round-trip.
- An imported file using the `expression` **attribute** keeps it in moddle's `$attrs` and
  re-serialises verbatim, but the panel cannot edit it. Detect this case, show an inline
  notice on the Fields group, and offer a one-click "Normalise fields" action that
  rewrites attribute-form fields into child-element form. Document this in the module's
  README.

`src/modeling/bpmn/moddle/briany.json` - our own modelling-time namespace,
`http://briany.ru/bpmn`, prefix `briany`, attributes on `bpmn:BaseElement`:

```
briany:descriptorId       string
briany:descriptorVersion  integer
```

This is the equivalent of `camunda:modelerTemplate`: it pins an element to the descriptor
version it was configured with, so an older process keeps rendering against its own
descriptor revision - exactly the semantics the `BpmnElementDescriptor.version`
description already promises. Flowable ignores attributes in unknown namespaces, so this
is inert at runtime. Add a one-line note to the contract's vendor-extension table.

#### 7.5.3 Starter template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xmlns:flowable="http://flowable.org/bpmn"
             xmlns:briany="http://briany.ru/bpmn"
             typeLanguage="http://www.w3.org/2001/XMLSchema"
             expressionLanguage="http://www.w3.org/1999/XPath"
             targetNamespace="http://briany.ru/processdef"
             id="Definitions_{KEY}">
  <process id="{KEY}" name="{NAME}" isExecutable="true">
    <documentation></documentation>
    <startEvent id="StartEvent_1" name="Start" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_{KEY}">
    <bpmndi:BPMNPlane id="BPMNPlane_{KEY}" bpmnElement="{KEY}">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>
```

Non-negotiable properties of anything this editor emits:

1. `isExecutable="true"` on `<process>`. Flowable does **not** create a process
   definition for a non-executable process; the file would deploy and then not exist.
   Surface it in the panel and lint it as an error.
2. The `flowable` namespace is declared even when unused, so the moddle round-trip is
   stable and the first `flowable:` attribute does not reshuffle the document.
3. Exactly one `<process>` per file - `ModelerFileIntrospector` rejects zero or many.
4. BPMNDI present for every shape and edge; bpmn-js handles this, but any programmatic
   element creation must go through `modeling.createShape`, never through raw moddle.
5. Element ids are XML `NCName`s. bpmn-js generates compliant ids; validate user edits.

#### 7.5.4 Palette and context pad

Trimmed via a custom `PaletteProvider` and `ContextPadProvider` (replace the defaults,
do not post-filter the DOM). Groups:

- **Events**: Start, Start (timer), Start (message), End, End (error), Boundary (timer),
  Boundary (error), Intermediate catch (timer), Intermediate throw (message)
- **Activities**: Task, User Task, Service Task, **HTTP Task**, Business Rule Task,
  Call Activity, Sub Process (expanded and collapsed). **No Script Task, no Shell Task**
  (1.5) - and not because a capability flag is off, but because the entries do not exist.
- **Gateways**: Exclusive, Parallel, Inclusive, Event-based
- **Structure**: Pool (single), Lane, Text Annotation, Group
- **Custom**: descriptor-driven entries grouped by `BpmnElementDescriptor.category`,
  with `icon` rendered from its data URI. Empty palette response = section absent.

Hard rules:

- **A second participant is blocked.** One pool is fine (one `<process>`); a second
  produces a second `<process>` and the file becomes unwritable. Rule out the palette
  entry once a participant exists and add a lint error for imported files that already
  have two.
- Entries whose activity type is absent from `EngineCapabilities.allowedActivityTypes`
  are hidden when `activityWhitelistEnabled` is true. Hidden, not disabled - a greyed
  palette entry with no path forward is worse than no entry.
- The script and shell exclusion is **not** implemented through that mechanism. Those
  entries are absent from the provider's source, so no capability response can bring them
  back.
- **Import is permissive, authoring is strict.** A foreign file using elements outside our
  palette must still open, render and round-trip; it is only flagged by lint. Never
  silently rewrite someone's model on open.

**HTTP Task** is a first-class palette entry that creates
`<serviceTask flowable:type="http">`. Give it its own renderer decoration (a small globe
glyph in the task corner) via a custom `BpmnRenderer` so it is distinguishable on the
canvas, the way Flowable Modeler does.

#### 7.5.5 Properties panel

Own panel, built from `@bpmn-io/properties-panel` primitives (`TextFieldEntry`,
`SelectEntry`, `CheckboxEntry`, `TextAreaEntry`, `ListEntry`, `CollapsibleEntry`). Groups
come from two providers registered with the same panel:

**A. `FlowablePropertiesProvider`** - hand-written, ordered:

| Group          | Applies to                              | Entries                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General        | all                                     | `id`, `name`; on process also `isExecutable`, `candidateStarterUsers`, `candidateStarterGroups`                                                                                                                                                                                                                                                          |
| Documentation  | all                                     | `bpmn:documentation` as a textarea                                                                                                                                                                                                                                                                                                                       |
| Form           | `startEvent` (none-start), `userTask`   | `flowable:formKey` via the form combobox (7.5.7), `flowable:formFieldValidation`                                                                                                                                                                                                                                                                         |
| Assignment     | `userTask`                              | `assignee`, `candidateUsers`, `candidateGroups`, `dueDate`, `priority`                                                                                                                                                                                                                                                                                   |
| Implementation | `serviceTask`                           | closed selector: `Delegate expression` \| `Expression` \| `HTTP` \| `External`. Delegate is a **select** over `EngineCapabilities.allowedDelegateBeans`, rendered as `${bean}`. Class-based implementation is not offered. `HTTP` is the only value the panel ever writes to `flowable:type`; `shell` and every other engine type are unreachable (1.5). |
| HTTP           | `serviceTask` with `flowable:type=http` | typed editors, see below                                                                                                                                                                                                                                                                                                                                 |
| Fields         | `serviceTask`, listeners                | list editor over `flowable:field`: `name`, value kind (`String` \| `Expression`), value                                                                                                                                                                                                                                                                  |
| Decision       | `businessRuleTask`                      | decision key combobox over this application's `.dmn` files plus deployed decisions                                                                                                                                                                                                                                                                       |
| Called element | `callActivity`                          | process key combobox over this application's `.bpmn` files plus deployed definitions, `inheritBusinessKey`, `sameDeployment`, in/out mappings                                                                                                                                                                                                            |
| Multi-instance | activities                              | loop type, `collection`, `elementVariable`, `elementIndexVariable`, cardinality, completion condition                                                                                                                                                                                                                                                    |
| Async          | activities                              | `async`, `exclusive`, `asyncLeave`, failed job retry cycle                                                                                                                                                                                                                                                                                               |
| Condition      | `sequenceFlow`                          | condition expression; default flow marker on the gateway                                                                                                                                                                                                                                                                                                 |

**The HTTP group is a typed view over the same `flowable:field` list.** Flowable's HTTP
task is configured entirely through fields; do not invent a parallel storage. Fields owned
by the HTTP group are hidden from the raw Fields list so a value has exactly one editor.
Owned names:

```
requestMethod (select: GET POST PUT DELETE PATCH), requestUrl, requestHeaders (textarea),
requestBody, requestBodyEncoding, requestTimeout (number), disallowRedirects (bool),
failStatusCodes, handleStatusCodes, ignoreException (bool), responseVariableName,
saveRequestVariables (bool), saveResponseParameters (bool),
saveResponseParametersTransient (bool), saveResponseVariableAsJson (bool),
resultVariablePrefix
```

There is no Script group, and no group offers a code editor for process logic. Selecting
an imported `bpmn:ScriptTask` or a `flowable:type="shell"` service task shows only
General and Documentation, plus a danger notice stating that Briany does not support the
element and that the model cannot be deployed until it is replaced. Offer a single action
there: convert the element to a plain `bpmn:Task` so the author has a starting point for
rewriting it against a delegate, the HTTP task or a descriptor. Never edit the element in
place, and never delete it silently.

**B. `DescriptorPropertiesProvider`** - generated. When an element carries
`briany:descriptorId`, look up the descriptor (pinned by `briany:descriptorVersion`) and
compile its `properties[]` into one group titled with `descriptor.name`, plus an
"Unlink element" action that strips the annotation and returns the element to the generic
groups.

Descriptor compilation rules, straight from `BpmnElementDescriptor.yaml`:

| Descriptor field                          | Behaviour                                                                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `bpmnActivity`                            | the BPMN element the palette entry creates                                                                                                    |
| `type`                                    | `String`/`Number`/`Text`/`Boolean`/`Dropdown` -> the matching entry component; `Hidden` -> not rendered, `defaultValue` written as a constant |
| `juel: forbidden \| optional \| required` | `optional` renders a constant/expression toggle; `required` locks to expression and validates a leading `${`                                  |
| `required`                                | validation, skipped when the field is hidden by `condition`                                                                                   |
| `pattern`                                 | regex validation with `pattern.message`                                                                                                       |
| `condition`                               | visibility; a hidden field is **not written to XML** and existing XML for it is removed                                                       |
| `editable: false`                         | rendered read-only                                                                                                                            |
| `binding` absent                          | UI-only field, never serialised                                                                                                               |
| `binding` with no `tag`/`attribute`       | `<flowable:field name="{key}">` with a `<flowable:string>` or `<flowable:expression>` body per `juel`                                         |
| `binding.attribute` only                  | attribute on the element root, e.g. `flowable:delegateExpression`                                                                             |
| `binding.tag` + `binding.attribute`       | attribute on that child tag                                                                                                                   |
| `binding.tag` only                        | child tag whose text content is the value                                                                                                     |

Keep this compiler pure and unit-tested: descriptor plus current element state in, a list
of panel entries and a set of moddle write operations out. It is the piece most likely to
grow, so it must never reach into React or bpmn-js directly.

Panel behaviour: search box filtering entries across groups (bpmn-io panels have this and
it matters once there are twenty groups); group open/closed state remembered per element
type; multi-selection shows only General.

#### 7.5.6 Linting

`bpmnlint` via `bpmn-js-bpmnlint`, results feeding both canvas markers and the Problems
drawer. Custom ruleset `src/modeling/bpmn/lint/briany.js`:

| Rule                        | Severity | Check                                                                             |
| --------------------------- | -------- | --------------------------------------------------------------------------------- |
| `executable-process`        | error    | `<process isExecutable="true">`                                                   |
| `single-process`            | error    | exactly one participant / process                                                 |
| `allowed-activity-type`     | error    | element type in `allowedActivityTypes`                                            |
| `delegate-allowlist`        | error    | every identifier in a `delegateExpression` is in `allowedDelegateBeans`           |
| `no-class-implementation`   | error    | no `flowable:class` outside `allowedClassPrefixes`                                |
| `no-script-task`            | error    | no `bpmn:ScriptTask` anywhere in the model (1.5)                                  |
| `no-shell-task`             | error    | no `<serviceTask flowable:type="shell">`, and `flowable:type` is `http` or absent |
| `http-task-required-fields` | error    | `requestMethod` and `requestUrl` present on an HTTP task                          |
| `form-key-resolvable`       | warning  | a `formKey` resolves to a file in this app or a deployed form                     |
| `user-task-has-assignment`  | warning  | assignee or candidate users or candidate groups set                               |
| plus `bpmnlint:recommended` |          | start event, end event, no disconnected elements, no implicit split               |

The first seven rules mirror `SafeBpmnDeploymentValidator` and the activity whitelist
one-for-one. That is the design goal: the model fails in the editor, not at deploy.

`no-script-task` and `no-shell-task` are the only rules in this set that are **not**
derived from `EngineCapabilities`. They are constants, because 1.5 is a product rule
rather than a deployment setting. Their error message must say so and point at the
alternatives (delegate, HTTP task, element descriptor) rather than reading as a
configuration complaint.

#### 7.5.7 Form combobox

Used by the Form group on start events and user tasks, and reused by the decision and
called-element pickers.

- Two option groups: **This application** (files of type `bform` in the current
  `ModelerApp`; their `fileKey` is the form key by construction) and **Deployed**
  (`GET /api/v1/forms`, latest version per key).
- Free text accepted, because a form may be deployed by another application later. A value
  matching neither group renders with a warning icon and a tooltip, and raises the
  `form-key-resolvable` lint warning.
- Inline actions next to the field: **Open form** (navigates to that file's editor, guarded
  by the dirty check) and **Create form in this application** (opens the New file dialog
  prefilled with a key derived from the element, creates the file, and binds it in one
  step). The second action is what makes the modeler feel like a modeler rather than a
  text field over a foreign key.

#### 7.5.8 Extension points to preserve

The brief is explicit that this editor will be developed for a long time. Enforce these
seams in code review:

1. Palette, context pad, renderer, panel and lint are five independent didi modules.
2. The descriptor compiler is pure and framework-free.
3. The moddle descriptors are data files, not code; adding a Flowable attribute is a JSON
   edit plus a panel entry, nothing else.
4. Engine constraints arrive from `EngineCapabilities`; no allowlist is hardcoded in a
   component. The single exception is the script and shell exclusion from 1.5, which is a
   product invariant and lives in `modeling/bpmn/constants.ts` with a comment pointing at
   this document. Never widen that exception to "one more thing we hardcoded".
5. Runtime decorations (7.5.9) live in `modeling/bpmn/overlays` and are consumed by both
   the editor and the Processes viewer, so there is exactly one implementation of
   "highlight this element".

#### 7.5.9 Shared runtime overlay module

One module, two consumers (the read-only viewer in Processes and Tasks, and later the
editor's simulation mode). API:

```ts
applyInstanceDecorations(viewer, {
  activities: ActivityInstance[],
  selectedActivityId?: string,
})
```

Decorations: completed elements get a teal path highlight; active elements get a cinnabar
ring plus a token-count badge; terminated elements get a dashed grey outline; the selected
element gets a focus ring. All colours come from design tokens, never literals.

### 7.6 Form editor (bform)

Deliberately simple, per the brief.

- `@bpmn-io/form-js` `FormEditor` mounted in the editor host. Palette left, canvas centre,
  properties right - the library's own layout, restyled through our tokens.
- The `.bform` file is the form-js schema JSON. `schema.id` is the form key and must equal
  the `fileKey`; the New file dialog sets it and the editor treats it as read-only,
  routing changes through the "Save as new file" path described in 7.4.
- Save serialises `editor.getSchema()` and uploads as `application/json`.
- Preview toggle rendering the same schema in `FormViewer` with sample data, so the author
  sees what the task performer will see. This is cheap and it is the difference between a
  form editor and a JSON editor.
- The contract's `FormComponentType` enum is the source of truth for which components are
  allowed; hide anything form-js offers that the enum omits.
- The variable panel: list the variable names the schema binds (the same extraction
  `FormVariableExtractor` does server-side), so the author can cross-check against the
  process variables the BPMN model uses.

### 7.7 DMN editor

Standard, per the brief.

- `dmn-js` `Modeler` with `dmn-js-properties-panel`, both DRD and decision-table views,
  restyled through our tokens.
- Save serialises `modeler.saveXML({ format: true })`.
- One `<decision>` per file, mirroring the BPMN single-process rule and
  `ModelerFileIntrospector`; lint a second decision as an error.
- The decision id is the `fileKey`, same immutability handling as BPMN.

---

## 8. Section: Processes

Operate-shaped, deliberately scoped down. Read-only plus the four operations from 5.6.

### 8.1 Definitions list (`/processes`)

Dense table (`@tanstack/react-table`), `?includeStats=true`:

| Column      | Content                                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| Name        | `name` with `key` in mono beneath                                                      |
| Version     | `v{version}` chip, with a version count when more than one                             |
| Instances   | inline stacked bar: running (teal) / completed (muted), with the running count as text |
| Start form  | icon when `hasStartForm`                                                               |
| Application | link to the owning application when resolvable via `deployedResources`                 |
| Deployment  | `deploymentId`, truncated, copyable                                                    |
| Actions     | Start instance, View instances, Open diagram                                           |

Row click opens `/processes/$key`. Search on name/key, sort on name, key, version.

### 8.2 Definition detail (`/processes/$key`)

- Header: name, key, version selector (from `listProcessDefinitionVersions`; switching
  versions is a search param, not a route change), deployment facts, `Start instance`.
- Diagram: `bpmn-js` `NavigatedViewer` on the XML from 5.3. Read-only, fit-to-viewport,
  keyboard pan/zoom. When stats are available, overlay a running-instance count badge on
  each activity - this is the Operate behaviour that turns a diagram into a dashboard.
- Below: tabs **Instances** (the instance table scoped to this key) / **Versions**
  (table of all versions with their instance counts) / **XML** (read-only CodeMirror with
  XML highlighting and a copy button).
- `Start instance`: if `hasStartForm`, fetch `getProcessStartForm` and render it with
  form-js `FormViewer` in a dialog; submit maps form data to `variables`. If not, show a
  minimal dialog with `businessKey` and a typed key/value variable editor. On success,
  navigate to the new instance.

### 8.3 Instance list (`/processes/instances`)

Two panes: a collapsible **Filters** panel on the left, the table on the right. Every
filter is a validated search param, so the URL is shareable - the Operate behaviour worth
copying above all others.

MVP filters (the contract's current surface): process definition key, version, state
(`running` / `completed` / `suspended`), plus client-side free text over the loaded page
for instance id and business key. The filter panel must be built so the iteration-2
filters from 5.9 (business key, started by, date range, variable) slot in as additional
fields without a redesign; stub them as disabled fields with a "coming with the next API
version" tooltip rather than pretending they do not exist.

Columns: state dot, `name` or definition name, `businessKey`, `id` (mono, copy), version,
`startTime`, `endTime`, duration (humanised), `startUserId`, actions (Cancel, Delete).

Polling every 5s while visible and while any running instances are on the page.

### 8.4 Instance detail (`/processes/instances/$id`)

Three regions, following Operate:

```
+-------------------+------------------------------------------+
| Instance history  |                                          |
| tree              |            BPMN diagram                  |
|                   |         (path decorated)                 |
|                   |                                          |
+-------------------+------------------------------------------+
| Details | Variables                                          |
+--------------------------------------------------------------+
```

- **Header**: instance id, business key, state pill, definition name and version (linked),
  start and end time, duration, `Cancel` and `Delete` actions with confirmations.
- **Instance history**: a tree built from `listProcessInstanceActivities`, nested by
  sub-process containment, each node showing the activity name, type icon, state and
  duration. Selecting a node selects the matching element on the diagram and filters the
  Variables tab to that scope.
- **Diagram**: `NavigatedViewer` over the definition XML, decorated by the shared overlay
  module (7.5.9). Clicking an element selects the corresponding history node - the link
  works in both directions. Call activities show a "go to called instance" affordance
  when `calledProcessInstanceId` is set.
- **Details tab**: the full instance record plus the definition and deployment ids, each
  copyable.
- **Variables tab**: table of `name`, `type`, `value`, `scope`, `lastUpdatedTime`. JSON
  values render in a collapsible viewer, not as a single truncated line. Read-only in this
  iteration; the panel is laid out so an edit affordance can be added later.

Be honest about failures: when an instance is stalled the UI must show which activity it
stopped at and say plainly that incident detail is not available yet, rather than
rendering a healthy-looking diagram. Link to the section 5.9 note in the internal docs.

---

## 9. Section: Tasks

Tasklist-shaped. Two panes.

### 9.1 Layout (`/tasks`)

```
+----------------+---------------------------------------------+
| Filters        | Task header: name  [Assign to me] [Complete]|
| . All open     +---------------------------------------------+
| . Assigned to me|                                            |
| . Unassigned   |   Form | Variables | Process                |
| . Completed    |                                             |
|                |   form-js FormViewer                        |
| [sort]         |                                             |
|                |                                             |
| task           |                                             |
| task*          |                                             |
| task           |                                             |
+----------------+---------------------------------------------+
```

Selection is `?taskId=`, so a task is linkable.

**Filter rail**: the four predefined filters mapped to `state` + `assignment`:

| Filter         | Query                                |
| -------------- | ------------------------------------ |
| All open       | `state=active`                       |
| Assigned to me | `state=active&assignment=mine`       |
| Unassigned     | `state=active&assignment=unassigned` |
| Completed      | `state=completed&assignment=mine`    |

An `Available to claim` filter (`assignment=candidate`) is worth adding as a fifth; it is
the one Tasklist lacks and the one that makes group-based work usable.

**Sort**: creation date, due date, priority. Follow-up date is not modelled; do not offer
it.

**Queue item**: task name, process definition name beneath, assignee (initials avatar or
"Unassigned"), priority chip when non-default, created time as relative, due date chip
turning danger when overdue. Infinite scroll or a Load more button; keep the selected
task pinned in view across refetches.

### 9.2 Task detail

- **Header**: task name, process name linking to `/processes/instances/$processInstanceId`,
  business key, created, due. Actions: `Assign to me` / `Unassign` (claim/unclaim),
  `Assign to...` (a plain text field in this iteration - no directory API yet, so validate
  only that it is non-empty and let the server reject), `Complete` (primary).
- **Form tab**: `getTaskForm` returns task, form schema and the bound variables. Render
  with form-js `FormViewer`, `data` seeded from `variables`. Completing submits the form;
  on `errors` from form-js, block and show them inline. Send only the variables the form
  binds, taken from `Form.variables`, not the whole `data` object.
- **No form** (`404` with `TASK_HAS_NO_FORM`): render a typed key/value variables editor
  instead, and complete with that map. This is the Tasklist fallback and it must exist,
  because plenty of user tasks have no form.
- **Variables tab**: read-only view of the process variables in scope.
- **Process tab**: the same decorated `NavigatedViewer` from 7.5.9, with the current
  task's element selected. Reuse, do not reimplement.
- **Completed tasks** are read-only: form rendered disabled with the submitted values, no
  actions.

Optimistic behaviour: `Complete` removes the task from the queue immediately and selects
the next one, rolling back on failure. That single detail is what makes a worklist feel
fast.

### 9.3 Start a process (`/tasks/start`)

Camunda Tasklist's Processes page. A card grid of process definitions with
`hasStartForm`, plus the rest behind a "show all" toggle. Selecting one renders its start
form (or the businessKey + variables dialog) and starts the instance, then offers to jump
to the created instance or to the first task it produced.

---

## 10. Design system

### 10.1 Principles

1. **The tool is dense.** This is an operations console, not a marketing site. Default row
   height 34px, base font 13px, 4px spacing grid. Whitespace earns its place.
2. **Colour carries one meaning at a time.** Type identity (process / decision / form) is
   an icon colour. State (draft / synced / ahead, running / completed) is a chip. Severity
   is a semantic colour plus an icon. These three vocabularies never share a hue.
3. **Never encode meaning by colour alone.** Every state chip has a label, every severity
   has an icon.
4. **Third-party canvases are guests.** bpmn-js, dmn-js and form-js bring their own CSS.
   Theme them from `design/vendor/`, do not fight them inside components.

### 10.2 Colour

Tokens in `design/tokens.css` as OKLCH with hex fallbacks. Two ramps plus semantics.

**Teal (primary)** - brand, primary actions, selection, completed paths.

```
--teal-50  #eefbf8   --teal-500 #1fa99e   (primary)
--teal-100 #d3f5ef   --teal-600 #14887f
--teal-200 #a9ebe1   --teal-700 #136c67
--teal-300 #74dccf   --teal-800 #145653
--teal-400 #3cc4b7   --teal-900 #144745   --teal-950 #042a2a
```

**Cinnabar (accent)** - active runtime tokens, focus emphasis, the one thing on screen
that must be looked at. Used sparingly and never as a background for large areas.

```
--cinnabar-50  #fef3f2   --cinnabar-500 #f04a35   (accent)
--cinnabar-100 #ffe3e0   --cinnabar-600 #e34234   (classic cinnabar)
--cinnabar-200 #ffccc7   --cinnabar-700 #bb2718
--cinnabar-300 #ffa89f   --cinnabar-800 #9a2418
--cinnabar-400 #fd7566   --cinnabar-900 #80241b   --cinnabar-950 #461009
```

**Semantic colours.** `INIT.md` asks for standard associations (red alert, yellow warn,
green good), but cinnabar _is_ a red-orange. If danger were also a warm red, the accent
and the alarm would be indistinguishable at chip size. Resolution:

```
--color-success  emerald-600  #059669
--color-warning  amber-500    #f59e0b
--color-danger   rose-600     #e11d48    cooler and pinker than cinnabar
--color-info     sky-500      #0ea5e9
--color-accent   var(--cinnabar-500)
```

Constraints that keep this honest: danger is always paired with an icon; cinnabar and
danger never appear adjacent in the same component; destructive buttons use
`--color-danger` and nothing else does.

**Neutrals**: a 12-step slate ramp with a slight teal cast (hue-shifted toward the
primary) so the greys feel part of the palette. Surfaces:

```
--surface-0   page background
--surface-1   cards, panels
--surface-2   raised, popovers
--surface-3   modals
--border-subtle / --border-default / --border-strong
--text-primary / --text-secondary / --text-muted / --text-inverse
```

Every one of these is defined for both themes. Dark is the default; `:root` carries the
dark values and `[data-theme="light"]` overrides, with `prefers-color-scheme` honoured on
first load when the user has expressed no preference.

### 10.3 Liquid glass

Scope: sidebar, top bar, command palette, dialogs, popovers, toasts, floating editor
toolbars, and the Applications tiles. Nothing else. Tables, diagram canvases, forms and
code editors are opaque.

```css
--glass-bg: color-mix(in oklab, var(--surface-1) 62%, transparent);
--glass-blur: 20px;
--glass-saturate: 1.6;
--glass-border: color-mix(in oklab, var(--text-primary) 12%, transparent);
--glass-shadow: 0 8px 32px -8px rgb(0 0 0 / 0.45);
--glass-highlight: linear-gradient(
  180deg,
  color-mix(in oklab, white 14%, transparent) 0%,
  transparent 40%
);
```

A `.glass` utility applies background, `backdrop-filter: blur() saturate()`, a hairline
border, the shadow, and a top highlight pseudo-element that gives the specular edge the
2026 liquid-glass look. Three escape hatches, all mandatory:

- `@supports not (backdrop-filter: blur(1px))` -> opaque `--surface-1`.
- `@media (prefers-reduced-transparency: reduce)` -> opaque.
- `html[data-glass="off"]` -> opaque, wired to a switch in `/settings` and to
  `config.json`'s `features.glass`.

Performance: never animate `backdrop-filter`; never nest glass inside glass; never place
glass over a scrolling virtualised list.

### 10.4 Typography

- UI: **Inter Variable**, self-hosted with `font-display: swap`. No CDN - this is an open
  source project and must build offline.
- Mono: **JetBrains Mono**, used for every id, key, hash, expression, XML and JSON. Ids
  are read and compared constantly; a mono face is a functional requirement here, not a
  stylistic one.
- Scale: 11 / 12 / 13 (base) / 15 / 18 / 22 / 28. Line height 1.45 body, 1.25 headings.
  Tabular numerals on every table column that holds a number or a duration.

### 10.5 Shape, elevation, motion

- Radii: 6 (inputs, chips), 10 (cards, buttons), 14 (panels), 20 (modals), full (pills).
- Elevation 0 flush / 1 card / 2 popover / 3 modal, expressed as layered shadows, softer
  in light and deeper in dark.
- Motion: durations 120 / 180 / 240ms; easing `cubic-bezier(0.22, 1, 0.36, 1)`. Animate
  `transform` and `opacity` only. Everything wrapped in
  `@media (prefers-reduced-motion: no-preference)`.

### 10.6 Component inventory

Build these once, in `design/components`, and use nothing else:

`Button` (primary / secondary / ghost / danger, three sizes, loading state),
`IconButton`, `Input`, `Textarea`, `Select`, `Combobox` (grouped, async, free text),
`Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Tabs`, `Dialog`, `AlertDialog`,
`Sheet`, `DropdownMenu`, `ContextMenu`, `Tooltip`, `Popover`, `Toast` (sonner),
`Badge`, `StatePill`, `SeverityIcon`, `Avatar`, `Table` (sortable, sticky header,
virtualised, empty and loading states), `Pagination`, `Card`, `GlassPanel`,
`SplitPane`, `Breadcrumb`, `EmptyState`, `ErrorState`, `Skeleton`, `CopyButton`,
`RelativeTime`, `Duration`, `JsonViewer`, `CodeEditor`, `MarkdownViewer`,
`CommandPalette`, `FileTypeIcon`, `KeyValueEditor`.

### 10.7 Accessibility

- WCAG 2.2 AA contrast for text and for every state chip in both themes. Verify glass
  surfaces against their worst-case backdrop, not against a flat colour.
- Full keyboard operation, including the tab strip, the filter rail, the properties panel
  and the task queue. bpmn-js has its own keyboard module - enable it and document the
  shortcuts in `/settings`.
- Visible focus rings everywhere, `--color-accent` at 2px with a 2px offset.
- Live regions for toasts and for the deploy result.
- The BPMN canvas is not accessible on its own; the instance history tree is the
  keyboard-navigable equivalent of the diagram and must stay functionally complete.

---

## 11. Cross-cutting behaviour

- **Loading.** Skeletons that match the final layout for first loads; an inline progress
  bar for refetches. Never a full-page spinner after the first paint.
- **Errors.** Three tiers: field-level from `Problem.errors`, inline panel for a failed
  region, full-page `ErrorState` for a failed route. Always show `Problem.detail`; add a
  "Copy details" button carrying `type`, `code`, `instance` for bug reports.
- **Empty states** explain the concept and offer the primary action. No shrugging.
- **Optimistic updates** for claim, unclaim and complete only. Deploy, cancel and delete
  are never optimistic.
- **Confirmations** for deploy failure recovery, undeploy, delete application (type the
  key), delete file, cancel instance, delete instance.
- **Long values.** Ids, hashes and deployment ids truncate in the middle with a copy
  button and a tooltip carrying the full value.
- **Time.** Absolute time in tooltips, relative in cells. One `RelativeTime` component,
  one `Duration` component, `date-fns` underneath.
- **i18n.** English only, but route every user-facing string through a single
  `src/lib/i18n.ts` message map so a second locale is a data addition. No new dependency.
- **Performance budget.** Route-level code splitting; bpmn-js, dmn-js and form-js each
  lazy-loaded on their editor route. Initial JS under 250KB gzipped excluding the modelers.
  Virtualise any table that can exceed 100 rows.

---

## 12. Testing

- **Unit (Vitest).** The descriptor compiler (every binding and condition case), the
  Flowable field read/write helpers including the attribute-form import path, the starter
  template generators, search param schemas, `Problem` parsing, duration and relative time
  formatting.
- **Component (Vitest + Testing Library + MSW).** Applications grid, application page,
  deploy failure panel, editor host dirty and guard behaviour, form combobox grouping and
  free text, task queue filters, instance history tree selection sync.
- **Modeler round-trip.** A golden-file suite: for each fixture, import the XML, apply a
  scripted set of panel edits, export, and assert against an expected XML. This is the only
  reliable defence against a moddle change silently reshaping documents. Include a fixture
  that uses the `flowable:field` attribute form, and one containing a script task and a
  shell task: it must round-trip byte-faithfully while raising `no-script-task` and
  `no-shell-task`.
- **E2E (Playwright), three flows, no more:**
  1. Create application, add a BPMN file, add a user task, bind a new form created inline,
     save, deploy, see `Synced`.
  2. Start an instance from a definition, find it in the instance list, open it, confirm
     the path decoration matches the activity history.
  3. Claim a task, complete its form, confirm it leaves the queue and the instance advances.
- **Contract drift.** `pnpm api:check` in CI.
- **A11y.** `axe-core` assertions on the four main routes.

---

## 13. Tooling and quality gates

- pnpm 12, Node 22+.
- oxlint (already configured) with `typeAware` enabled; prettier for formatting.
- Conventional Commits with commitlint and husky, mirroring `briany-contract`.
- CI: install, `api:check`, lint, typecheck (`tsc -b`), unit and component tests, build,
  Playwright against a preview server with MSW.
- No `any` outside `src/api/generated`. No `// @ts-expect-error` without a linked issue.
- No hardcoded colours, spacings or radii outside `design/tokens.css`.
- No direct import from `src/api/generated` outside `src/api`.
- No fetch call outside `src/api`.
- No script or shell task authoring surface anywhere. Enforce with a CI grep over `src/`
  for `scriptTask`, `scriptFormat` and `"shell"` outside `modeling/bpmn/lint` and
  `modeling/bpmn/constants.ts`; any other hit fails the build.

---

## 14. Delivery order

Ship in this order; each milestone is independently reviewable.

**M0 - foundation.** `git init`, contract submodule, dependencies, Tailwind v4 tokens for
both themes, glass utilities, the component inventory from 10.6, codegen wired,
`src/api/client.ts`, MSW scaffolding, router and shell, login, `/settings`.

**M1 - contract delta.** Land every change from section 5 in `briany-contract` as one or
more Conventional Commits, Spectral-clean. Regenerate here and commit
`src/api/generated`. Open the corresponding backend issues. **Do this before M2**, so the
whole build codes against the final shape.

**M2 - Applications, read and manage.** Grid with stats, create dialog, application page,
file cards, details and README with both modes, delete, deploy and undeploy with the
failure panel.

**M3 - editor host.** Tab strip, dirty tracking, save, revert, guards, Problems drawer,
the New file dialog and the three starter templates.

**M4 - BPMN modeler.** Moddle descriptors, palette, context pad, HTTP task renderer,
`FlowablePropertiesProvider` with every group in 7.5.5, the form combobox, lint ruleset,
round-trip test suite.

**M5 - form and DMN editors.** form-js editor with preview and the variable panel; dmn-js
editor with the single-decision rule.

**M6 - descriptor palette.** `getBpmnPalette` consumption, `DescriptorPropertiesProvider`,
the `briany:descriptorId` annotation, unlink, palette custom section.

**M7 - Processes.** Definitions list with stats, definition detail with diagram and
versions, instance list with URL filters, instance detail with the history tree, shared
overlay module, start instance, cancel, delete.

**M8 - Tasks.** Filter rail, queue, task detail with form and variables fallback, claim,
unclaim, assign, complete, the Process tab, `/tasks/start`.

**M9 - hardening.** Accessibility pass, performance budget, Playwright flows, empty and
error states everywhere, keyboard shortcut documentation, README.

---

## 15. Definition of done

- [ ] Every contract change from section 5 is merged in `briany-contract`, Spectral-clean,
      and `pnpm api:check` passes here.
- [ ] No network call bypasses the generated client; the Flowable REST API is never called
      from the browser.
- [ ] An application can be created, filled with all three file types, edited, deployed,
      and its process started and completed through Tasks, without leaving the UI.
- [ ] A deploy failure names the file and, where the engine reports one, the element.
- [ ] The BPMN editor cannot author a model that `SafeBpmnDeploymentValidator` or the
      activity whitelist would reject, and it lints imported models that do.
- [ ] An imported third-party BPMN file opens, renders and round-trips without loss.
- [ ] There is no path through the UI to a script task or a shell task, and no
      configuration value that would create one. Imported models containing them
      round-trip and lint as errors.
- [ ] Light and dark themes both pass WCAG 2.2 AA; glass degrades correctly under
      `prefers-reduced-transparency` and without `backdrop-filter`.
- [ ] Every filter state in Processes and Tasks survives a page reload and a copied link.
- [ ] All three Playwright flows pass in CI.
- [ ] No Russian text anywhere in the repository.
