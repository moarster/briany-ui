# End-to-end flows

Three flows, no more, exactly as PROMPT section 12 specifies:

1. **`application-lifecycle.spec.ts`** - create an application, add a BPMN file, add a user
   task, bind a new form created inline, save, deploy, see `Synced`.
2. **`instance-inspection.spec.ts`** - start an instance from a definition, find it in the
   instance list, open it, confirm the path decoration matches the activity history.
3. **`task-completion.spec.ts`** - claim a task, complete its form, confirm it leaves the
   queue and the instance advances.

## Running them

    pnpm test:e2e

The Playwright config builds the app and serves it with `vite preview`. The flows need a
backend: either the engine on `localhost:8095` (the dev proxy target), or the MSW handlers
for the endpoints the backend has not shipped yet.

Flows 2 and 3 depend on `POST /processes/{key}/start`, `GET /tasks` and their neighbours -
all part of the contract delta in PROMPT section 5. Until the backend implements them,
run these against the mock build:

    VITE_MSW=1 pnpm build && pnpm test:e2e

Each spec states at the top which endpoints it needs, so a flow that starts failing points
at the endpoint that regressed rather than at the UI.
