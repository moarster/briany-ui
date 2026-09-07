import {
  CircleDashed,
  CircleCheck,
  CircleAlert,
  CirclePause,
  CirclePlay,
  CircleX,
} from 'lucide-react'
import type { ModelerAppState, ProcessInstanceState, ActivityInstanceState } from '../../api'
import { Badge } from './Badge'
import type { BadgeTone } from './Badge'

/**
 * The `draft / synced / ahead` vocabulary, used identically on the application tile, the
 * application header and every file card. It answers one question: does what runs match
 * what was edited.
 *
 * Every pill carries a label as well as a colour - meaning is never colour alone.
 */
const workspace: Record<
  ModelerAppState,
  { label: string; tone: BadgeTone; Icon: typeof CircleDashed }
> = {
  draft: { label: 'Draft', tone: 'neutral', Icon: CircleDashed },
  synced: { label: 'Synced', tone: 'primary', Icon: CircleCheck },
  ahead: { label: 'Ahead', tone: 'warning', Icon: CircleAlert },
}

export function WorkspaceStatePill({
  state,
  className,
}: {
  state: ModelerAppState
  className?: string
}) {
  const { label, tone, Icon } = workspace[state]
  return (
    <Badge tone={tone} className={className} icon={<Icon className="size-3" aria-hidden />}>
      {label}
    </Badge>
  )
}

const runtime: Record<
  ProcessInstanceState,
  { label: string; tone: BadgeTone; Icon: typeof CircleDashed }
> = {
  running: { label: 'Running', tone: 'accent', Icon: CirclePlay },
  completed: { label: 'Completed', tone: 'primary', Icon: CircleCheck },
  suspended: { label: 'Suspended', tone: 'warning', Icon: CirclePause },
}

export function InstanceStatePill({
  state,
  className,
}: {
  state: ProcessInstanceState
  className?: string
}) {
  const { label, tone, Icon } = runtime[state]
  return (
    <Badge tone={tone} className={className} icon={<Icon className="size-3" aria-hidden />}>
      {label}
    </Badge>
  )
}

const activity: Record<
  ActivityInstanceState,
  { label: string; tone: BadgeTone; Icon: typeof CircleDashed }
> = {
  active: { label: 'Active', tone: 'accent', Icon: CirclePlay },
  completed: { label: 'Completed', tone: 'primary', Icon: CircleCheck },
  terminated: { label: 'Terminated', tone: 'neutral', Icon: CircleX },
}

export function ActivityStatePill({
  state,
  className,
}: {
  state: ActivityInstanceState
  className?: string
}) {
  const { label, tone, Icon } = activity[state]
  return (
    <Badge tone={tone} className={className} icon={<Icon className="size-3" aria-hidden />}>
      {label}
    </Badge>
  )
}
