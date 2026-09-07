import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { append as svgAppend, create as svgCreate } from 'tiny-svg'

const HIGH_PRIORITY = 1500

/**
 * The HTTP task is a `bpmn:ServiceTask` carrying `flowable:type="http"`. Without a marker
 * it is indistinguishable from a delegate-backed service task on the canvas, so it gets a
 * globe glyph in the task corner, the way Flowable Modeler does.
 *
 * Colours come from tokens; nothing here spells out a hex value.
 */
export class BrianyHttpTaskRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer']

  private readonly bpmnRenderer: any

  constructor(eventBus: any, bpmnRenderer: any) {
    super(eventBus, HIGH_PRIORITY)
    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element: any): boolean {
    return isHttpTask(element)
  }

  drawShape(parentNode: SVGElement, element: any): SVGElement {
    const shape = this.bpmnRenderer.drawShape(parentNode, element)

    const glyph = svgCreate('path', {
      // A simple globe: a circle plus its meridian and equator.
      d:
        'M 8 2 a 6 6 0 1 0 0 12 a 6 6 0 1 0 0 -12 ' +
        'M 2 8 h 12 ' +
        'M 8 2 a 8 6 0 0 0 0 12 a 8 6 0 0 0 0 -12',
      fill: 'none',
      stroke: 'var(--color-info)',
      strokeWidth: 1.2,
      transform: 'translate(6, 6) scale(0.85)',
    })
    svgAppend(parentNode, glyph)

    return shape
  }

  getShapePath(shape: any) {
    return this.bpmnRenderer.getShapePath(shape)
  }
}

export function isHttpTask(element: {
  businessObject?: { $type?: string; get?: (name: string) => unknown }
}): boolean {
  const businessObject = element.businessObject
  if (businessObject?.$type !== 'bpmn:ServiceTask') return false
  return businessObject.get?.('flowable:type') === 'http'
}

export const brianyRendererModule = {
  __init__: ['brianyHttpTaskRenderer'],
  brianyHttpTaskRenderer: ['type', BrianyHttpTaskRenderer],
}
