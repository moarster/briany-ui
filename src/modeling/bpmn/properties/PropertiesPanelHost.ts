import { PropertiesPanel } from '@bpmn-io/properties-panel'
import { h, render } from 'preact'

/**
 * Our own panel host, built directly on the `@bpmn-io/properties-panel` primitives.
 *
 * We deliberately do not depend on `bpmn-js-properties-panel`: it ships the Camunda groups
 * we would then have to fight, and the only part of it we need is this render loop.
 *
 * Responsibilities: keep the panel rendered against the current selection, expose
 * `registerProvider` so `FlowablePropertiesProvider` and `DescriptorPropertiesProvider`
 * can contribute groups, remember each element type's open groups, and re-render when the
 * model changes underneath.
 */
export class BrianyPropertiesPanel {
  static $inject = [
    'eventBus',
    'injector',
    'elementRegistry',
    'canvas',
    'translate',
    'config.propertiesPanel',
  ]

  private readonly eventBus: any
  private readonly injector: any
  private readonly elementRegistry: any
  private readonly canvas: any
  private readonly translate: (text: string) => string
  private readonly parent: HTMLElement | null

  private providers: { priority: number; provider: any }[] = []
  private element: any = null

  /** Group open/closed state, remembered per element type rather than per element. */
  private readonly layoutByType = new Map<string, Record<string, unknown>>()

  constructor(
    eventBus: any,
    injector: any,
    elementRegistry: any,
    canvas: any,
    translate: (text: string) => string,
    config: { parent?: HTMLElement } | undefined,
  ) {
    this.eventBus = eventBus
    this.injector = injector
    this.elementRegistry = elementRegistry
    this.canvas = canvas
    this.translate = translate
    this.parent = config?.parent ?? null

    eventBus.on('diagram.init', () => {
      // Nothing is selected on open, so the panel starts on the root element. Without this
      // there is no way to reach process-level properties but to click the background.
      this.element = this.canvas.getRootElement()
      this.render()
    })

    eventBus.on('selection.changed', (event: { newSelection: any[] }) => {
      const selection = event.newSelection
      this.element =
        selection.length === 1
          ? selection[0]
          : selection.length === 0
            ? this.canvas.getRootElement()
            : null
      this.render()
    })

    // A change to the model can change which groups apply - switching a service task's
    // implementation, for instance - so the panel re-renders after every command.
    eventBus.on(['elements.changed', 'commandStack.changed', 'root.added'], () => {
      if (this.element?.id && !this.elementRegistry.get(this.element.id)) {
        this.element = this.canvas.getRootElement()
      }
      this.render()
    })

    eventBus.on('diagram.destroy', () => {
      if (this.parent) render(null, this.parent)
    })
  }

  /** Called by each provider in its own constructor. Lower priority contributes first. */
  registerProvider(priority: number | { getGroups: unknown }, provider?: { getGroups: unknown }) {
    const entry =
      typeof priority === 'number' ? { priority, provider } : { priority: 1000, provider: priority }
    this.providers.push(entry as { priority: number; provider: any })
    this.providers.sort((left, right) => left.priority - right.priority)
    this.render()
  }

  private render() {
    const parent = this.parent
    if (!parent) return

    const element = this.element
    if (!element) {
      // Multi-selection would show only General, which across several elements means
      // nothing useful, so the panel says what it needs instead of half-populating a form.
      render(null, parent)
      parent.replaceChildren(
        notice(this.translate('Select a single element to edit its properties.')),
      )
      return
    }

    const groups = this.providers.reduce<unknown[]>(
      (accumulated, { provider }) => provider.getGroups(element)(accumulated),
      [],
    )

    const type = element.businessObject?.$type ?? element.type ?? 'unknown'

    render(
      h(PropertiesPanel as never, {
        element,
        groups,
        eventBus: this.eventBus,
        injector: this.injector,
        headerProvider: this.headerProvider(),
        layoutConfig: this.layoutByType.get(type) ?? {},
        layoutChanged: (layout: Record<string, unknown>) => this.layoutByType.set(type, layout),
        descriptionConfig: {},
      }),
      parent,
    )
  }

  /**
   * The panel header. bpmn-js already ships an icon font for every element type, so the
   * icon is a span carrying the matching class rather than a second icon set.
   */
  private headerProvider() {
    const translate = this.translate
    return {
      getElementLabel: (element: any) => element.businessObject?.name ?? '',
      getTypeLabel: (element: any) =>
        translate(humanise(element.businessObject?.$type ?? element.type ?? '')),
      getElementIcon: () => null,
    }
  }
}

function notice(text: string): HTMLElement {
  const paragraph = document.createElement('p')
  paragraph.className = 'briany-panel-notice'
  paragraph.textContent = text
  return paragraph
}

function humanise(type: string): string {
  return type.replace(/^bpmn:/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

export const brianyPropertiesPanelModule = {
  __init__: ['propertiesPanel'],
  propertiesPanel: ['type', BrianyPropertiesPanel],
}
