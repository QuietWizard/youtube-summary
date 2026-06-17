'use client'

import * as React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError] = React.useState(false)
  const [error] = React.useState<Error | null>(null)

  if (hasError) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-red-800">
        <h2 className="text-xl font-bold">Something went wrong.</h2>
        <p>{error?.message}</p>
      </div>
    )
  }

  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  )
}

ErrorBoundary.ErrorBoundary = ErrorBoundary
