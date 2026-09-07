import type {
  ActivityInstance,
  BpmnPalette,
  EngineCapabilities,
  Task,
  User,
  Variable,
} from '../generated/types.gen'

/**
 * Fixtures for the endpoints in PROMPT section 5 that the backend has not shipped yet.
 * Derived from the `examples` already present in the contract schemas, so the mock and
 * the contract cannot drift apart silently.
 *
 * Every handler that uses these is deleted in the same commit as the endpoint landing.
 */

export const currentUser: User = {
  id: '1001',
  displayName: 'Ivan Petrov',
  groupIds: ['role:manager', 'subdiv:101791'],
}

export const engineCapabilities: EngineCapabilities = {
  flowableVersion: '8.0.0',
  // Note the absence of script_task: it is excluded at the product level, not by config.
  allowedActivityTypes: [
    'user_task',
    'service_task',
    'call_activity',
    'sub_process',
    'business_rule_task',
  ],
  allowedDelegateBeans: ['kvDelegate'],
  allowedClassPrefixes: ['ru.briany.', 'org.flowable.'],
  activityWhitelistEnabled: true,
  httpTaskEnabled: true,
}

export const bpmnPalette: BpmnPalette = {
  elements: [
    {
      id: 'kv-task',
      version: 1,
      name: 'Key-Value store',
      description: 'Stores and retrieves data by key',
      category: { id: 'db', name: 'Storage' },
      bpmnActivity: 'serviceTask',
      properties: [
        {
          key: 'delegate',
          label: 'Delegate',
          type: 'Hidden',
          defaultValue: '${kvDelegate}',
          binding: { attribute: 'flowable:delegateExpression' },
        },
        {
          key: 'operation',
          label: 'Operation',
          type: 'Dropdown',
          required: true,
          values: [
            { value: 'get', label: 'Read' },
            { value: 'put', label: 'Write' },
          ],
          binding: {},
        },
        {
          key: 'namespace',
          label: 'Namespace',
          type: 'String',
          required: true,
          binding: {},
        },
        {
          key: 'entryKey',
          label: 'Key',
          type: 'String',
          juel: 'optional',
          required: true,
          binding: {},
        },
        {
          key: 'payload',
          label: 'Value',
          type: 'Text',
          juel: 'optional',
          condition: { property: 'operation', equals: 'put' },
          binding: {},
        },
        {
          key: 'resultVariable',
          label: 'Result variable',
          type: 'String',
          condition: { property: 'operation', equals: 'get' },
          binding: { attribute: 'flowable:resultVariableName' },
        },
      ],
    },
  ],
}

export const tasks: Task[] = [
  {
    id: '7741',
    name: 'Approve Order',
    description: 'Manual approval for order ORD-2026-0001',
    state: 'active',
    assignee: { id: '1001', displayName: 'Ivan Petrov', groupIds: ['role:manager'] },
    processInstanceId: '2501',
    processDefinitionId: 'orderProcess:7:4a0716d3',
    processDefinitionKey: 'orderProcess',
    processDefinitionName: 'Order Process',
    taskDefinitionKey: 'approveOrder',
    formKey: 'orderApproval',
    createdAt: '2026-04-07T09:35:00Z',
    dueAt: '2026-04-08T09:35:00Z',
    priority: 50,
    processBusinessKey: 'ORD-2026-0001',
  },
  {
    id: '7742',
    name: 'Check credit limit',
    state: 'active',
    processInstanceId: '2502',
    processDefinitionId: 'orderProcess:7:4a0716d3',
    processDefinitionKey: 'orderProcess',
    processDefinitionName: 'Order Process',
    taskDefinitionKey: 'checkCredit',
    createdAt: '2026-04-07T10:05:00Z',
    priority: 75,
    processBusinessKey: 'ORD-2026-0002',
  },
]

export const activities: ActivityInstance[] = [
  {
    id: '9000',
    activityId: 'StartEvent_1',
    activityName: 'Order received',
    activityType: 'startEvent',
    state: 'completed',
    executionId: '2501',
    startTime: '2026-04-07T09:30:00Z',
    endTime: '2026-04-07T09:30:00Z',
    durationInMillis: 12,
  },
  {
    id: '9001',
    activityId: 'approveOrder',
    activityName: 'Approve Order',
    activityType: 'userTask',
    state: 'active',
    executionId: '2501',
    taskId: '7741',
    startTime: '2026-04-07T09:35:00Z',
  },
]

export const variables: Variable[] = [
  {
    name: 'amount',
    type: 'integer',
    value: 4200,
    scope: 'global',
    executionId: '2501',
    createTime: '2026-04-07T09:30:00Z',
  },
  {
    name: 'customer',
    type: 'json',
    value: { id: 'C-91', name: 'Acme Ltd', tier: 'gold' },
    scope: 'global',
    executionId: '2501',
    createTime: '2026-04-07T09:30:00Z',
  },
]
