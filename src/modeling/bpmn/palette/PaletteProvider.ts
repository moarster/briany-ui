import type { EngineCapabilities } from '../../../api'
import { isActivityAllowed } from '../capabilities'

type PaletteEntry = {
  group: string
  className: string
  title: string
  action: { dragstart: (event: Event) => void; click: (event: Event) => void }
}

type PaletteEntries = Record<string, PaletteEntry>

/**
 * A replacement `PaletteProvider`, not a filter over the default one's DOM. The entries
 * this provider does not declare simply do not exist, which is the point: no capability
 * response and no configuration can bring a script or shell task back (PROMPT 1.5).
 *
 * Entries whose activity type is outside `EngineCapabilities.allowedActivityTypes` are
 * hidden rather than disabled. A greyed entry with no path forward is worse than no entry.
 */
export class BrianyPaletteProvider {
  static $inject = [
    'palette',
    'create',
    'elementFactory',
    'spaceTool',
    'lassoTool',
    'handTool',
    'globalConnect',
    'translate',
    'brianyCapabilities',
  ]

  private readonly create: any
  private readonly elementFactory: any
  private readonly spaceTool: any
  private readonly lassoTool: any
  private readonly handTool: any
  private readonly globalConnect: any
  private readonly translate: (text: string) => string
  private readonly capabilities: EngineCapabilities

  constructor(
    palette: any,
    create: any,
    elementFactory: any,
    spaceTool: any,
    lassoTool: any,
    handTool: any,
    globalConnect: any,
    translate: (text: string) => string,
    brianyCapabilities: EngineCapabilities,
  ) {
    this.create = create
    this.elementFactory = elementFactory
    this.spaceTool = spaceTool
    this.lassoTool = lassoTool
    this.handTool = handTool
    this.globalConnect = globalConnect
    this.translate = translate
    this.capabilities = brianyCapabilities
    palette.registerProvider(this)
  }

  getPaletteEntries(): PaletteEntries {
    const entries: PaletteEntries = {}

    this.addTools(entries)
    this.addEvents(entries)
    this.addGateways(entries)
    this.addActivities(entries)
    this.addStructure(entries)

    return entries
  }

  private addTools(entries: PaletteEntries) {
    const { handTool, lassoTool, spaceTool, globalConnect, translate } = this

    entries['hand-tool'] = tool(
      'tools',
      'bpmn-icon-hand-tool',
      translate('Activate the hand tool'),
      (event) => handTool.activateHand(event),
    )
    entries['lasso-tool'] = tool(
      'tools',
      'bpmn-icon-lasso-tool',
      translate('Activate the lasso tool'),
      (event) => lassoTool.activateSelection(event),
    )
    entries['space-tool'] = tool(
      'tools',
      'bpmn-icon-space-tool',
      translate('Activate the create/remove space tool'),
      (event) => spaceTool.activateSelection(event),
    )
    entries['global-connect-tool'] = tool(
      'tools',
      'bpmn-icon-connection-multi',
      translate('Activate the global connect tool'),
      (event) => globalConnect.start(event),
    )
    entries['tool-separator'] = {
      group: 'tools',
      className: 'bpmn-icon-screw-wrench',
      title: '',
      action: { dragstart: noop, click: noop },
    }
  }

  private addEvents(entries: PaletteEntries) {
    this.shape(
      entries,
      'create.start-event',
      'events',
      'bpmn-icon-start-event-none',
      'Start event',
      {
        type: 'bpmn:StartEvent',
      },
    )
    this.shape(
      entries,
      'create.start-event-timer',
      'events',
      'bpmn-icon-start-event-timer',
      'Start event (timer)',
      {
        type: 'bpmn:StartEvent',
        eventDefinitionType: 'bpmn:TimerEventDefinition',
      },
    )
    this.shape(
      entries,
      'create.start-event-message',
      'events',
      'bpmn-icon-start-event-message',
      'Start event (message)',
      {
        type: 'bpmn:StartEvent',
        eventDefinitionType: 'bpmn:MessageEventDefinition',
      },
    )
    this.shape(
      entries,
      'create.intermediate-catch-timer',
      'events',
      'bpmn-icon-intermediate-event-catch-timer',
      'Intermediate catch (timer)',
      {
        type: 'bpmn:IntermediateCatchEvent',
        eventDefinitionType: 'bpmn:TimerEventDefinition',
      },
    )
    this.shape(
      entries,
      'create.intermediate-throw-message',
      'events',
      'bpmn-icon-intermediate-event-catch-message',
      'Intermediate throw (message)',
      {
        type: 'bpmn:IntermediateThrowEvent',
        eventDefinitionType: 'bpmn:MessageEventDefinition',
      },
    )
    this.shape(entries, 'create.end-event', 'events', 'bpmn-icon-end-event-none', 'End event', {
      type: 'bpmn:EndEvent',
    })
    this.shape(
      entries,
      'create.end-event-error',
      'events',
      'bpmn-icon-end-event-error',
      'End event (error)',
      {
        type: 'bpmn:EndEvent',
        eventDefinitionType: 'bpmn:ErrorEventDefinition',
      },
    )
  }

  private addGateways(entries: PaletteEntries) {
    this.shape(
      entries,
      'create.exclusive-gateway',
      'gateways',
      'bpmn-icon-gateway-xor',
      'Exclusive gateway',
      {
        type: 'bpmn:ExclusiveGateway',
      },
    )
    this.shape(
      entries,
      'create.parallel-gateway',
      'gateways',
      'bpmn-icon-gateway-parallel',
      'Parallel gateway',
      {
        type: 'bpmn:ParallelGateway',
      },
    )
    this.shape(
      entries,
      'create.inclusive-gateway',
      'gateways',
      'bpmn-icon-gateway-or',
      'Inclusive gateway',
      {
        type: 'bpmn:InclusiveGateway',
      },
    )
    this.shape(
      entries,
      'create.event-based-gateway',
      'gateways',
      'bpmn-icon-gateway-eventbased',
      'Event-based gateway',
      {
        type: 'bpmn:EventBasedGateway',
      },
    )
  }

  private addActivities(entries: PaletteEntries) {
    // No script task and no shell task. Not because a flag is off - the entries do not
    // exist in this provider's source at all.
    this.shape(entries, 'create.task', 'activity', 'bpmn-icon-task', 'Task', { type: 'bpmn:Task' })
    this.shape(entries, 'create.user-task', 'activity', 'bpmn-icon-user-task', 'User task', {
      type: 'bpmn:UserTask',
    })
    this.shape(
      entries,
      'create.service-task',
      'activity',
      'bpmn-icon-service-task',
      'Service task',
      {
        type: 'bpmn:ServiceTask',
      },
    )
    if (this.capabilities.httpTaskEnabled !== false) {
      this.shape(
        entries,
        'create.http-task',
        'activity',
        'bpmn-icon-service-task briany-http-task',
        'HTTP task',
        { type: 'bpmn:ServiceTask', flowableType: 'http' },
      )
    }
    this.shape(
      entries,
      'create.business-rule-task',
      'activity',
      'bpmn-icon-business-rule-task',
      'Business rule task',
      {
        type: 'bpmn:BusinessRuleTask',
      },
    )
    this.shape(
      entries,
      'create.call-activity',
      'activity',
      'bpmn-icon-call-activity',
      'Call activity',
      {
        type: 'bpmn:CallActivity',
      },
    )
    this.shape(
      entries,
      'create.subprocess-expanded',
      'activity',
      'bpmn-icon-subprocess-expanded',
      'Sub process (expanded)',
      {
        type: 'bpmn:SubProcess',
        isExpanded: true,
      },
    )
    this.shape(
      entries,
      'create.subprocess-collapsed',
      'activity',
      'bpmn-icon-subprocess-collapsed',
      'Sub process (collapsed)',
      {
        type: 'bpmn:SubProcess',
      },
    )
  }

  private addStructure(entries: PaletteEntries) {
    this.shape(entries, 'create.group', 'structure', 'bpmn-icon-group', 'Group', {
      type: 'bpmn:Group',
    })
    this.shape(
      entries,
      'create.text-annotation',
      'structure',
      'bpmn-icon-text-annotation',
      'Text annotation',
      {
        type: 'bpmn:TextAnnotation',
      },
    )
    // A pool is added by `BrianySingleParticipantRule`, which blocks the second one.
    this.shape(entries, 'create.participant', 'structure', 'bpmn-icon-participant', 'Pool', {
      type: 'bpmn:Participant',
      isExpanded: true,
    })
  }

  private shape(
    entries: PaletteEntries,
    id: string,
    group: string,
    className: string,
    title: string,
    attrs: {
      type: string
      eventDefinitionType?: string
      isExpanded?: boolean
      flowableType?: string
    },
  ) {
    if (!isActivityAllowed(this.capabilities, attrs.type)) return

    const createShape = (event: Event) => {
      const { flowableType, ...factoryAttrs } = attrs
      const shape = this.elementFactory.createShape(factoryAttrs)
      if (flowableType) {
        // The HTTP task is a service task carrying `flowable:type="http"`; the renderer
        // decorates it so it is distinguishable on the canvas.
        shape.businessObject.set('flowable:type', flowableType)
      }
      if (attrs.isExpanded === true && attrs.type === 'bpmn:SubProcess') {
        shape.businessObject.di?.set?.('isExpanded', true)
      }
      this.create.start(event, shape)
    }

    entries[id] = {
      group,
      className,
      title: this.translate(title),
      action: { dragstart: createShape, click: createShape },
    }
  }
}

function tool(
  group: string,
  className: string,
  title: string,
  run: (event: Event) => void,
): PaletteEntry {
  return { group, className, title, action: { dragstart: run, click: run } }
}

function noop() {
  /* separator */
}
