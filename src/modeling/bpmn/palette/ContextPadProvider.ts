import type { EngineCapabilities } from '../../../api'
import { isActivityAllowed } from '../capabilities'

/**
 * A replacement context pad. Same rule as the palette: what is not declared here does not
 * exist, so a script or shell task is unreachable from the canvas too (PROMPT 1.5).
 */
export class BrianyContextPadProvider {
  static $inject = [
    'contextPad',
    'modeling',
    'elementFactory',
    'connect',
    'create',
    'autoPlace',
    'translate',
    'brianyCapabilities',
  ]

  private readonly modeling: any
  private readonly elementFactory: any
  private readonly connect: any
  private readonly create: any
  private readonly autoPlace: any
  private readonly translate: (text: string) => string
  private readonly capabilities: EngineCapabilities

  constructor(
    contextPad: any,
    modeling: any,
    elementFactory: any,
    connect: any,
    create: any,
    autoPlace: any,
    translate: (text: string) => string,
    brianyCapabilities: EngineCapabilities,
  ) {
    this.modeling = modeling
    this.elementFactory = elementFactory
    this.connect = connect
    this.create = create
    this.autoPlace = autoPlace
    this.translate = translate
    this.capabilities = brianyCapabilities
    contextPad.registerProvider(this)
  }

  getContextPadEntries(element: any): Record<string, unknown> {
    const entries: Record<string, unknown> = {}
    const businessObject = element.businessObject

    if (element.type !== 'label' && businessObject?.$type !== 'bpmn:EndEvent') {
      entries['connect'] = {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: this.translate('Connect'),
        action: {
          click: (event: Event) => this.connect.start(event, element),
          dragstart: (event: Event) => this.connect.start(event, element),
        },
      }

      this.appendEntry(entries, 'append.user-task', 'bpmn-icon-user-task', 'Append user task', {
        type: 'bpmn:UserTask',
      })
      this.appendEntry(
        entries,
        'append.service-task',
        'bpmn-icon-service-task',
        'Append service task',
        {
          type: 'bpmn:ServiceTask',
        },
      )
      this.appendEntry(
        entries,
        'append.gateway',
        'bpmn-icon-gateway-xor',
        'Append exclusive gateway',
        {
          type: 'bpmn:ExclusiveGateway',
        },
      )
      this.appendEntry(
        entries,
        'append.end-event',
        'bpmn-icon-end-event-none',
        'Append end event',
        {
          type: 'bpmn:EndEvent',
        },
      )
    }

    if (element.type !== 'label') {
      entries['delete'] = {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: this.translate('Remove'),
        action: { click: () => this.modeling.removeElements([element]) },
      }
    }

    return entries
  }

  private appendEntry(
    entries: Record<string, unknown>,
    id: string,
    className: string,
    title: string,
    attrs: { type: string },
  ) {
    if (!isActivityAllowed(this.capabilities, attrs.type)) return

    const append = (_event: Event, element: any) => {
      const shape = this.elementFactory.createShape(attrs)
      this.autoPlace.append(element, shape)
    }

    entries[id] = {
      group: 'model',
      className,
      title: this.translate(title),
      action: {
        click: append,
        dragstart: (event: Event, element: any) => {
          const shape = this.elementFactory.createShape(attrs)
          this.create.start(event, shape, { source: element })
        },
      },
    }
  }
}
