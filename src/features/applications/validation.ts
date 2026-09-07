import { z } from 'zod'

/**
 * The application key becomes the identifier the engine stores, so it is validated
 * client-side against the same shape the backend enforces. Uniqueness is not knowable
 * here - that comes back as a 409 and is surfaced on the field.
 */
export const APPLICATION_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,254}$/

/**
 * A file key becomes the process, decision or form id in the XML, the derived `fileKey`,
 * and the deployed definition key. XML ids are NCNames, so this is stricter than the
 * application key: no leading digit, and only NCName characters.
 */
export const FILE_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.-]*$/

export const createApplicationSchema = z.object({
  key: z
    .string()
    .min(1, 'A key is required.')
    .regex(
      APPLICATION_KEY_PATTERN,
      'Start with a letter, then letters, digits, hyphens or underscores.',
    ),
  name: z.string().max(255).optional(),
  description: z.string().max(4000).optional(),
})

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>

export const newFileSchema = z.object({
  key: z
    .string()
    .min(1, 'A key is required.')
    .regex(FILE_KEY_PATTERN, 'Start with a letter or underscore, then letters, digits, . - or _.'),
  name: z.string().max(255).optional(),
})

export type NewFileInput = z.infer<typeof newFileSchema>

/** Turns a zod failure into the field-keyed shape every form in this app renders. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path.join('.')
    if (field && !errors[field]) errors[field] = issue.message
  }
  return errors
}
