import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { CATALOGUE_STALE_TIME, getModelerAppOptions } from '../../../api'
import { EditorHost } from '../../../modeling/shared/EditorHost'
import { t } from '../../../lib/i18n'
import { TopBar } from '../../shell/TopBar'

const searchSchema = z.object({
  /** Set by the deploy failure panel's `<fileKey>#<elementId>` links. */
  element: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/applications/$appKey/files/$fileKey')({
  validateSearch: searchSchema,
  component: EditorPage,
})

function EditorPage() {
  const { appKey, fileKey } = Route.useParams()
  const { element } = Route.useSearch()
  const appQuery = useQuery({
    ...getModelerAppOptions({ path: { key: appKey } }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  return (
    <>
      <TopBar
        crumbs={[
          { label: t('applications.title'), to: '/applications' },
          {
            label: appQuery.data?.name ?? appKey,
            to: '/applications/$appKey',
            params: { appKey },
          },
          { label: fileKey },
        ]}
      />
      <main className="flex min-h-0 flex-1 flex-col">
        <EditorHost appKey={appKey} fileKey={fileKey} selectElement={element} />
      </main>
    </>
  )
}
