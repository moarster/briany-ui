/**
 * Ambient declarations for the modeling libraries that ship no types, or ship them only
 * for their package root. Each is deliberately narrow: it declares the surface this
 * application actually uses rather than `any` for the whole module, so a typo in a call
 * site is still caught.
 */

declare module '@bpmn-io/properties-panel' {
  import type { ComponentType } from 'preact'

  export const PropertiesPanel: ComponentType<Record<string, unknown>>
  export const Group: ComponentType<Record<string, unknown>>
  export const ListGroup: ComponentType<Record<string, unknown>>
  export const Header: ComponentType<Record<string, unknown>>
  export const HeaderButton: ComponentType<Record<string, unknown>>
  export const TextFieldEntry: ComponentType<Record<string, unknown>>
  export const TextAreaEntry: ComponentType<Record<string, unknown>>
  export const NumberFieldEntry: ComponentType<Record<string, unknown>>
  export const CheckboxEntry: ComponentType<Record<string, unknown>>
  export const SelectEntry: ComponentType<Record<string, unknown>>
  export const ToggleSwitchEntry: ComponentType<Record<string, unknown>>
  export const CollapsibleEntry: ComponentType<Record<string, unknown>>
  export const ListEntry: ComponentType<Record<string, unknown>>
  export const SimpleEntry: ComponentType<Record<string, unknown>>

  export function isTextFieldEntryEdited(node: unknown): boolean
  export function isTextAreaEntryEdited(node: unknown): boolean
  export function isNumberFieldEntryEdited(node: unknown): boolean
  export function isCheckboxEntryEdited(node: unknown): boolean
  export function isSelectEntryEdited(node: unknown): boolean
  export function isToggleSwitchEntryEdited(node: unknown): boolean
}

declare module 'dmn-js/lib/Modeler' {
  export default class DmnModeler {
    constructor(options: Record<string, unknown>)
    importXML(xml: string): Promise<{ warnings: unknown[] }>
    saveXML(options?: { format?: boolean }): Promise<{ xml?: string }>
    getActiveViewer(): { on?: (event: string, handler: () => void) => void } | undefined
    on(event: string, handler: (event?: unknown) => void): void
    destroy(): void
  }
}

declare module 'dmn-js-properties-panel' {
  export const DmnPropertiesPanelModule: Record<string, unknown>
  export const DmnPropertiesProviderModule: Record<string, unknown>
}

declare module 'bpmn-js/lib/util/ModelUtil' {
  export function is(element: unknown, type: string): boolean
  export function getBusinessObject(element: unknown): Record<string, unknown>
}

declare module 'diagram-js/lib/draw/BaseRenderer' {
  export default class BaseRenderer {
    constructor(eventBus: unknown, priority?: number)
    canRender(element: unknown): boolean
    drawShape(parentNode: SVGElement, element: unknown): SVGElement
    getShapePath(shape: unknown): string
  }
}

declare module 'bpmn-moddle' {
  /** The moddle element graph is dynamic by nature; only the entry points are typed. */
  export class BpmnModdle {
    constructor(packages?: Record<string, unknown>)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create(type: string, attrs?: Record<string, unknown>): any
    fromXML(
      xml: string,
      typeName?: string,
    ): Promise<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rootElement: any
      warnings: { message: string; property?: string; value?: unknown }[]
    }>
    toXML(element: unknown, options?: { format?: boolean }): Promise<{ xml: string }>
  }
}

declare module 'tiny-svg' {
  export function create(name: string, attrs?: Record<string, unknown>): SVGElement
  export function append(parent: SVGElement, child: SVGElement): SVGElement
  export function attr(node: SVGElement, attrs: Record<string, unknown>): SVGElement
  export function classes(node: SVGElement): { add: (name: string) => void }
}

/** The vendored moddle descriptors are data files, imported as JSON. */
declare module '*.json' {
  const value: Record<string, unknown>
  export default value
}
