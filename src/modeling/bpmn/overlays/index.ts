import type { ActivityInstance } from '../../../api'

const MARKER_COMPLETED = 'briany-completed'
const MARKER_ACTIVE = 'briany-active'
const MARKER_TERMINATED = 'briany-terminated'
const MARKER_SELECTED = 'briany-selected'

const ALL_MARKERS = [MARKER_COMPLETED, MARKER_ACTIVE, MARKER_TERMINATED, MARKER_SELECTED]

const BADGE_TYPE = 'briany-token-count'

export type InstanceDecorations = {
  activities: ActivityInstance[]
  selectedActivityId?: string
}

/**
 * One implementation of "highlight this element", consumed by the read-only viewer in
 * Processes and Tasks and, later, by the editor's simulation mode. There is deliberately
 * no second copy of this logic anywhere.
 *
 * All colours come from design tokens - see design/vendor/bpmn.css for the marker classes.
 */
export function applyInstanceDecorations(
  viewer: { get: (name: string) => any },
  { activities, selectedActivityId }: InstanceDecorations,
): void {
  const canvas = viewer.get('canvas')
  const overlays = viewer.get('overlays')
  const elementRegistry = viewer.get('elementRegistry')

  clearInstanceDecorations(viewer)

  // An element can be entered more than once (a loop, a multi-instance), so the states
  // are aggregated per BPMN element id and the active count becomes the token badge.
  const byElement = new Map<string, { active: number; completed: number; terminated: number }>()
  for (const activity of activities) {
    const entry = byElement.get(activity.activityId) ?? { active: 0, completed: 0, terminated: 0 }
    entry[activity.state] += 1
    byElement.set(activity.activityId, entry)
  }

  for (const [activityId, counts] of byElement) {
    if (!elementRegistry.get(activityId)) continue

    if (counts.active > 0) {
      canvas.addMarker(activityId, MARKER_ACTIVE)
      overlays.add(activityId, BADGE_TYPE, {
        position: { top: -10, right: 10 },
        html: tokenBadge(counts.active),
      })
    } else if (counts.terminated > 0 && counts.completed === 0) {
      canvas.addMarker(activityId, MARKER_TERMINATED)
    } else if (counts.completed > 0) {
      canvas.addMarker(activityId, MARKER_COMPLETED)
    }
  }

  if (selectedActivityId && elementRegistry.get(selectedActivityId)) {
    canvas.addMarker(selectedActivityId, MARKER_SELECTED)
  }
}

export function clearInstanceDecorations(viewer: { get: (name: string) => any }): void {
  const canvas = viewer.get('canvas')
  const overlays = viewer.get('overlays')
  const elementRegistry = viewer.get('elementRegistry')

  overlays.remove({ type: BADGE_TYPE })
  for (const element of elementRegistry.getAll()) {
    for (const marker of ALL_MARKERS) canvas.removeMarker(element.id, marker)
  }
}

function tokenBadge(count: number): HTMLElement {
  const badge = document.createElement('span')
  badge.className = 'briany-token-badge'
  badge.textContent = String(count)
  badge.setAttribute('aria-label', `${count} active token${count === 1 ? '' : 's'}`)
  return badge
}

/**
 * Builds the containment tree the instance history panel renders. Flowable reports the
 * enclosing activity instance, so a sub-process's children nest under it.
 */
export type ActivityNode = ActivityInstance & { children: ActivityNode[] }

export function buildActivityTree(activities: ActivityInstance[]): ActivityNode[] {
  const nodes = new Map<string, ActivityNode>()
  for (const activity of activities) nodes.set(activity.id, { ...activity, children: [] })

  const roots: ActivityNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentActivityInstanceId
      ? nodes.get(node.parentActivityInstanceId)
      : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const byStartTime = (left: ActivityNode, right: ActivityNode) =>
    (left.startTime ?? '').localeCompare(right.startTime ?? '')

  const sort = (list: ActivityNode[]) => {
    list.sort(byStartTime)
    for (const node of list) sort(node.children)
  }
  sort(roots)

  return roots
}
