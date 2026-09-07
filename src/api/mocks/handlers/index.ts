import { HttpResponse, http } from 'msw'
import { runtimeConfig } from '../../../lib/runtime-config'
import type { Problem, TaskForm } from '../../generated/types.gen'
import {
  activities,
  bpmnPalette,
  currentUser,
  engineCapabilities,
  tasks,
  variables,
} from '../fixtures'

/**
 * Handlers for the endpoints from PROMPT section 5 that the backend has not shipped yet.
 *
 * When an endpoint lands for real, its handler is deleted in the same commit. A handler
 * that outlives its endpoint is a lie about what the backend does.
 */
// The operation paths already carry `/api/v1`; apiBaseUrl is only the prefix in front.
const base = () => `${runtimeConfig().apiBaseUrl.replace(/\/$/, '')}/api/v1`

const problem = (status: number, detail: string, code?: string): Problem => ({
  status,
  title: status === 404 ? 'Not Found' : 'Error',
  detail,
  code,
})

export const handlers = [
  // --- Identity (5.1) ---
  http.get(`${base()}/me`, () => HttpResponse.json(currentUser)),

  // --- Platform (5.2) ---
  http.get(`${base()}/engine-capabilities`, () => HttpResponse.json(engineCapabilities)),
  http.get(`${base()}/bpmn-palette`, () => HttpResponse.json(bpmnPalette)),

  // --- Process instance detail (5.5) ---
  http.get(`${base()}/process-instances/:id/activities`, () => HttpResponse.json(activities)),
  http.get(`${base()}/process-instances/:id/variables`, () => HttpResponse.json(variables)),

  // --- Instance operations (5.6) ---
  http.post(
    `${base()}/process-instances/:id/cancel`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.delete(`${base()}/process-instances/:id`, () => new HttpResponse(null, { status: 204 })),

  // --- Tasks (5.7) ---
  http.get(`${base()}/tasks`, ({ request }) => {
    const url = new URL(request.url)
    const state = url.searchParams.get('state') ?? 'active'
    const assignment = url.searchParams.get('assignment') ?? 'any'

    const matching = tasks.filter((task) => {
      if (task.state !== state) return false
      if (assignment === 'mine') return task.assignee?.id === currentUser.id
      if (assignment === 'unassigned') return task.assignee === undefined
      if (assignment === 'candidate') return task.assignee === undefined
      return true
    })

    return HttpResponse.json({
      data: matching,
      page: 0,
      pageSize: 25,
      totalElements: matching.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    })
  }),

  http.get(`${base()}/tasks/:id`, ({ params }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    return task
      ? HttpResponse.json(task)
      : HttpResponse.json(problem(404, 'No such task.'), { status: 404 })
  }),

  http.get(`${base()}/tasks/:id/form`, ({ params }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    if (!task) return HttpResponse.json(problem(404, 'No such task.'), { status: 404 })
    if (!task.formKey) {
      // The contract's documented shape for "no form", which the UI answers with the raw
      // variables editor rather than an error.
      return HttpResponse.json(problem(404, 'This task has no form.', 'TASK_HAS_NO_FORM'), {
        status: 404,
      })
    }
    const body: TaskForm = {
      task,
      form: {
        id: '5614ef25-33f9-49d8-b0fc-3e4e67269c0d',
        key: task.formKey,
        name: 'Order Approval',
        version: 4,
        schema: {
          id: task.formKey,
          type: 'default',
          schemaVersion: 18,
          components: [
            { id: 'approved', key: 'approved', type: 'checkbox', label: 'Approve' },
            { id: 'comment', key: 'comment', type: 'textarea', label: 'Comment' },
          ],
        },
        variables: ['approved', 'comment'],
        deploymentId: 'dep-7741',
        deployedAt: '2026-04-07T08:00:00Z',
      },
      variables: { approved: false, comment: '' },
    }
    return HttpResponse.json(body)
  }),

  http.post(`${base()}/tasks/:id/claim`, ({ params }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    if (!task) return HttpResponse.json(problem(404, 'No such task.'), { status: 404 })
    task.assignee = currentUser
    return HttpResponse.json(task)
  }),

  http.post(`${base()}/tasks/:id/unclaim`, ({ params }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    if (!task) return HttpResponse.json(problem(404, 'No such task.'), { status: 404 })
    task.assignee = undefined
    return HttpResponse.json(task)
  }),

  http.post(`${base()}/tasks/:id/assign`, async ({ params, request }) => {
    const task = tasks.find((candidate) => candidate.id === params.id)
    if (!task) return HttpResponse.json(problem(404, 'No such task.'), { status: 404 })
    const body = (await request.json()) as { userId: string }
    task.assignee = { id: body.userId, displayName: body.userId }
    return HttpResponse.json(task)
  }),

  http.post(`${base()}/tasks/:id/complete`, ({ params }) => {
    const index = tasks.findIndex((candidate) => candidate.id === params.id)
    if (index >= 0) tasks.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
