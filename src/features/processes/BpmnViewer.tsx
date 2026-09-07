import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import { useEffect, useRef } from 'react'
import type { ActivityInstance } from '../../api'
import { Skeleton } from '../../design/components'
import { applyInstanceDecorations } from '../../modeling/bpmn/overlays'
import { service } from '../../modeling/bpmn/services'
import '../../design/vendor/bpmn.css'

/**
 * The read-only diagram, shared by the definition page, the instance page and the task
 * detail's Process tab. Decoration is delegated to the shared overlay module, so there is
 * exactly one implementation of "highlight this element" in the product.
 */
export function BpmnViewer({
  xml,
  activities,
  selectedActivityId,
  onElementClick,
  className,
}: {
  xml: string | undefined
  activities?: ActivityInstance[]
  selectedActivityId?: string
  onElementClick?: (elementId: string) => void
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !xml) return

    const viewer = new NavigatedViewer({ container, keyboard: { bindTo: container } })
    viewerRef.current = viewer

    void viewer
      .importXML(xml)
      .then(() => {
        service(viewer, 'canvas').zoom('fit-viewport', 'auto')
        if (activities) applyInstanceDecorations(viewer, { activities, selectedActivityId })
      })
      .catch((error: unknown) => {
        console.error('The diagram could not be rendered.', error)
      })

    if (onElementClick) {
      viewer.on('element.click', (event: { element: { id: string; type: string } }) => {
        if (event.element.type === 'label') return
        onElementClick(event.element.id)
      })
    }

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xml])

  // Re-decorating without re-importing keeps the viewport where the operator left it.
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !activities) return
    try {
      applyInstanceDecorations(viewer, { activities, selectedActivityId })
    } catch {
      // The viewer may not have finished importing yet; the import path decorates too.
    }
  }, [activities, selectedActivityId])

  if (!xml) return <Skeleton className={className ?? 'h-full'} />

  return <div ref={containerRef} className={className ?? 'h-full'} />
}
