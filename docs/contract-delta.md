# Contract delta

A mirror of PROMPT.md section 5, kept in sync with what actually landed in
[`briany-contract`](https://github.com/moarster/briany-contract). Everything below is a
change to `contract/rest/openapi-v1.yaml`, consumed here as a git submodule.

**Status:** merged in the contract as
`feat(Api): add Identity, Platform and Task operations plus process instance detail`,
Spectral-clean. Regenerated into `src/api/generated`, which is committed.

**Backend status:** none of the new operations is implemented yet. Until they are, the
handlers in `src/api/mocks/handlers` stand in for them behind `VITE_MSW=1`. Each handler is
deleted in the same commit as its endpoint landing - a handler that outlives its endpoint
is a lie about what the backend does.

## New tags

| Tag        | Audience | Implemented |
| ---------- | -------- | ----------- |
| `Identity` | public   | no          |
| `Platform` | public   | no          |
| `Task`     | public   | no          |

## Operations added

### Identity

| Operation        | Path             |
| ---------------- | ---------------- |
| `getCurrentUser` | `GET /api/v1/me` |

Returns the authenticated principal as the existing `User` schema. Powers "Assigned to
me", the avatar in the sidebar, and claim / unclaim. `x-with-principal: true`.

### Platform

| Operation               | Path                              |
| ----------------------- | --------------------------------- |
| `getEngineCapabilities` | `GET /api/v1/engine-capabilities` |
| `getBpmnPalette`        | `GET /api/v1/bpmn-palette`        |

`EngineCapabilities` carries `allowedActivityTypes`, `allowedDelegateBeans`,
`allowedClassPrefixes`, `activityWhitelistEnabled`, `httpTaskEnabled` and
`flowableVersion`. It deliberately has **no** script or shell flag: those task types are
excluded at the product level (PROMPT 1.5), and a flag would imply a configuration that
must never exist. A server that reports `script_task` as allowed is treated as
misconfigured - the client logs it and drops the value rather than surfacing a script task
in the palette (`src/modeling/bpmn/capabilities/index.ts`).

`getBpmnPalette` wires up `BpmnElementDescriptor.yaml`, which the contract already defined
and nothing referenced. An empty `elements` array is valid and means the palette shows only
the built-in groups.

### ProcessDefinition

| Operation              | Path                                                 |
| ---------------------- | ---------------------------------------------------- |
| `getProcessXml`        | `GET /api/v1/processes/{key}/xml`                    |
| `getProcessVersionXml` | `GET /api/v1/processes/{key}/versions/{version}/xml` |
| `getProcessStartForm`  | `GET /api/v1/processes/{key}/start-form`             |

Without the XML there is no diagram anywhere in Processes or Tasks.

### ProcessInstance

| Operation                       | Path                                            |
| ------------------------------- | ----------------------------------------------- |
| `listProcessInstanceActivities` | `GET /api/v1/process-instances/{id}/activities` |
| `listProcessInstanceVariables`  | `GET /api/v1/process-instances/{id}/variables`  |
| `startProcessInstance`          | `POST /api/v1/processes/{key}/start`            |
| `cancelProcessInstance`         | `POST /api/v1/process-instances/{id}/cancel`    |
| `deleteProcessInstance`         | `DELETE /api/v1/process-instances/{id}`         |

`ActivityInstance.activityId` is the join key to the BPMN element id. Everything the
instance page does - path highlighting, token badges, click-to-filter - hangs off it.
`ActivityInstance.parentActivityInstanceId` was added beyond the section 5 sketch: the
history is specified as a tree nested by sub-process containment, and without a parent
reference the client cannot rebuild that nesting without guessing.

`cancel` terminates a running instance and keeps history; `DELETE` removes the historic
record. They are separate operations with separate confirmations because they are
different actions.

### Task

| Operation      | Path                               |
| -------------- | ---------------------------------- |
| `listTasks`    | `GET /api/v1/tasks`                |
| `getTask`      | `GET /api/v1/tasks/{id}`           |
| `getTaskForm`  | `GET /api/v1/tasks/{id}/form`      |
| `claimTask`    | `POST /api/v1/tasks/{id}/claim`    |
| `unclaimTask`  | `POST /api/v1/tasks/{id}/unclaim`  |
| `assignTask`   | `POST /api/v1/tasks/{id}/assign`   |
| `completeTask` | `POST /api/v1/tasks/{id}/complete` |

`assignment` (`any` / `mine` / `unassigned` / `candidate`) is resolved server-side against
the principal, which is what `x-with-principal` is for and what keeps `GET /me` out of the
query path.

`getTaskForm` answers `404` with the code `TASK_HAS_NO_FORM` when the task has no
`formKey`. That is a documented shape, not a failure: the UI renders the raw variables
editor instead, and the query is configured not to retry it.

## Schema changes

| Schema              | Change                                          |
| ------------------- | ----------------------------------------------- |
| `ProcessDefinition` | optional `stats: ProcessInstanceStats`          |
| `ModelerAppRef`     | optional `stats: ModelerAppStats`               |
| `Task`              | `processDefinitionKey`, `processDefinitionName` |

New schemas: `EngineCapabilities`, `BpmnPalette`, `ProcessInstanceStats`,
`ModelerAppStats`, `ActivityInstance`, `ActivityInstanceState`, `Variable`,
`VariableScope`, `StartProcessInstanceRequest`, `CancelProcessInstanceRequest`,
`TaskAssignmentFilter`, `AssignTaskRequest`, `CompleteTaskRequest`.

`listProcesses`, `getProcess`, `listModelerApps` and `getModelerApp` gain
`?includeStats=true` (default `false`). Without it the client would have to issue one
`size=1` request per row to read `totalElements`, which is the kind of workaround this
project forbids.

## Two changes beyond the section 5 sketch

Both were needed to build against the contract rather than around it.

1. **The process instance path id is a plain string.** `getProcessInstance` declared it as
   `format: uuid`, but Flowable ids are opaque and the contract's own `ProcessInstance`
   example uses `'2501'`. A `UUID`-typed path parameter would have made every generated
   client reject a real id. It is now the reusable `Id` parameter, and the freed-up `UUID`
   schema is referenced by the fields that genuinely hold one.
2. **`ActivityInstance.parentActivityInstanceId`**, as described above.

## Open items for the backend

Tracked here so they are not lost between repositories. These are PROMPT section 5.8.

1. **`getProcessInstance` is already in the contract but 404s.** In the backend's older
   copy of the spec the operation carried the plural tag `ProcessInstances`, so it landed
   on a generated interface no controller implements. The contract is singular now, so it
   belongs on `ProcessInstanceApi` and `ProcessInstanceController` must implement it. The
   instance detail page depends on it.
2. **CORS.** `SecurityConfig` has none. Dev works through the Vite proxy and production is
   single-origin behind Traefik, but the contract stand and any split deployment need a
   configurable allowed-origins list.
3. **Deploy failure detail.** Populate `Problem.errors[]` with `field = "<fileKey>"` or
   `"<fileKey>#<bpmnElementId>"` and `message` = the engine validation message. The UI maps
   these straight onto files and diagram elements
   (`src/features/applications/DeployFailurePanel.tsx`); without the convention the panel
   degrades to a plain message.
4. **`ApplicationMapper` does not populate `deployedResources`.** The Applications page
   needs it to link a workspace file to its deployed definition.
5. **Make the script and shell exclusion unconditional.** Drop `script_task` from
   `briany.engine.whitelist.activities`; in `SafeBpmnDeploymentValidator` replace the
   `ALLOWED_SCRIPT_FORMATS` check with an unconditional rejection of every `ScriptTask` and
   reject `<serviceTask flowable:type="shell">` in the same pass, neither depending on
   `briany.engine.whitelist.enabled`; in `CustomActivityBehaviorFactory` keep
   `createShellActivityBehavior` returning `DisabledActivityBehavior` unconditionally and
   give script activity behaviour the same treatment. Do not add `allowedScriptFormats` to
   `EngineCapabilities`.
6. **`FormedTaskService` throws `IllegalStateException` on a missing `formKey`.** That has
   to become a typed `Problem` with `code: TASK_HAS_NO_FORM`, per `getTaskForm` above.

## Deferred to iteration 2

Sketched in PROMPT 5.9, not built and not in the contract: incidents and dead-letter jobs,
extended instance filters (business key, started by, date range, variable), batch
operations, instance modification and migration, saved task filters, a user and group
directory, a descriptor authoring UI, CMMN, multi-tenancy, OIDC.

The instance page is honest about the first of these: when an instance is running but no
activity is active, it says execution has stopped, names the last activity entered, and
states plainly that incident detail is not exposed by the API yet. It never renders a
stalled instance as a healthy one.
