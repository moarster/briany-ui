import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import { isProblemError } from '../api'
import { TooltipProvider } from '../design/components'
import { useTheme } from '../lib/theme'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // A 4xx is an answer, not a hiccup: retrying it just delays the error the user
        // has to see. Only transient failures are worth a second attempt.
        if (isProblemError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

function ThemedToaster() {
  const { resolved } = useTheme()
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'glass !rounded-[var(--radius-md)] !text-xs',
        },
      }}
    />
  )
}
