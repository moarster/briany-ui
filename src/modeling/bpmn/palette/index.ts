import { BrianyContextPadProvider } from './ContextPadProvider'
import { BrianyPaletteProvider } from './PaletteProvider'
import { BrianySingleParticipantRule } from './SingleParticipantRule'

/**
 * Palette, context pad and the single-participant rule, each a didi module of its own.
 * A new capability is a new module, never an edit spread through the editor component.
 */
export const brianyPaletteModule = {
  __init__: ['paletteProvider'],
  paletteProvider: ['type', BrianyPaletteProvider],
}

export const brianyContextPadModule = {
  __init__: ['contextPadProvider'],
  contextPadProvider: ['type', BrianyContextPadProvider],
}

export const brianySingleParticipantModule = {
  __init__: ['brianySingleParticipantRule'],
  brianySingleParticipantRule: ['type', BrianySingleParticipantRule],
}
