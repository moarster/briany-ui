/**
 * `ModelerFileIntrospector` accepts exactly one `<process>` per file. One pool is fine -
 * it is that one process. A second participant produces a second `<process>` and the file
 * becomes unwritable, so creating one is blocked here rather than discovered at save time.
 *
 * Import stays permissive: a file that already has two participants opens, renders and
 * round-trips, and is flagged by the `single-process` lint rule instead.
 */
export class BrianySingleParticipantRule {
  static $inject = ['eventBus', 'elementRegistry']

  constructor(eventBus: any, elementRegistry: any) {
    const hasParticipant = () =>
      elementRegistry.filter((element: any) => element.type === 'bpmn:Participant').length > 0

    eventBus.on(
      ['commandStack.shape.create.canExecute', 'commandStack.elements.create.canExecute'],
      2000,
      (event: any) => {
        const shapes: any[] =
          event.context?.elements ?? (event.context?.shape ? [event.context.shape] : [])
        const addsParticipant = shapes.some((shape) => shape?.type === 'bpmn:Participant')
        if (addsParticipant && hasParticipant()) return false
        return undefined
      },
    )
  }
}
