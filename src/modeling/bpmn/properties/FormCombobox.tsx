import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { CATALOGUE_STALE_TIME, getModelerAppOptions, listFormsOptions } from '../../../api'
import { Button, Combobox, Field } from '../../../design/components'
import type { ComboboxGroup } from '../../../design/components'

/**
 * The form binding control. Two option groups plus free text plus the two inline actions
 * that make this a modeler rather than a text field over a foreign key.
 *
 * Free text is accepted deliberately: a form may be deployed by another application later,
 * so a value matching nothing is a warning here and a `form-key-resolvable` lint warning,
 * never a value the picker refuses to hold.
 */
export function useFormOptions(appKey: string): {
  groups: ComboboxGroup[]
  knownKeys: Set<string>
  isLoading: boolean
} {
  const appQuery = useQuery({
    ...getModelerAppOptions({ path: { key: appKey } }),
    staleTime: CATALOGUE_STALE_TIME,
  })
  const formsQuery = useQuery({
    ...listFormsOptions({ query: { size: 200 } }),
    staleTime: CATALOGUE_STALE_TIME,
  })

  return useMemo(() => {
    // A bform file's fileKey is the form key by construction.
    const local = (appQuery.data?.files ?? [])
      .filter((file) => file.type === 'bform')
      .map((file) => ({ value: file.fileKey, label: file.name ?? file.fileKey, hint: file.name }))

    // Latest version per key, so the list is one row per form rather than one per version.
    const latest = new Map<string, { value: string; label: string; hint?: string }>()
    for (const form of formsQuery.data?.data ?? []) {
      const existing = latest.get(form.formKey)
      if (!existing)
        latest.set(form.formKey, {
          value: form.formKey,
          label: form.name ?? form.formKey,
          hint: `v${form.version}`,
        })
    }

    const groups: ComboboxGroup[] = []
    if (local.length > 0) groups.push({ label: 'This application', options: local })
    if (latest.size > 0) groups.push({ label: 'Deployed', options: [...latest.values()] })

    return {
      groups,
      knownKeys: new Set([...local.map((option) => option.value), ...latest.keys()]),
      isLoading: appQuery.isLoading || formsQuery.isLoading,
    }
  }, [appQuery.data, appQuery.isLoading, formsQuery.data, formsQuery.isLoading])
}

export function FormCombobox({
  appKey,
  value,
  onChange,
  onCreateForm,
  label = 'Form key',
}: {
  appKey: string
  value: string
  onChange: (value: string) => void
  /** Opens the New file dialog prefilled, then binds the created key in one step. */
  onCreateForm: (suggestedKey: string) => void
  label?: string
}) {
  const navigate = useNavigate()
  const { groups, isLoading } = useFormOptions(appKey)

  return (
    <Field
      label={label}
      hint="A key that resolves to nothing today is allowed - another application may deploy it later."
    >
      <div className="flex items-center gap-1">
        <Combobox
          value={value}
          onChange={onChange}
          groups={groups}
          loading={isLoading}
          placeholder="Bind a form"
          unresolvedWarning="No form with this key exists in this application or among the deployed forms."
          actions={
            <button
              type="button"
              onClick={() => onCreateForm(value || '')}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs text-[var(--color-primary)] hover:bg-[var(--surface-3)]"
            >
              <Plus className="size-3.5" aria-hidden />
              Create form in this application
            </button>
          }
        />
        {value && (
          <Button
            size="sm"
            variant="ghost"
            title="Open form"
            aria-label="Open form"
            onClick={() =>
              void navigate({
                to: '/applications/$appKey/files/$fileKey',
                params: { appKey, fileKey: value },
              })
            }
            icon={<ExternalLink className="size-3.5" aria-hidden />}
          />
        )}
      </div>
    </Field>
  )
}
