import * as React from 'react'

import * as Bus from './bus'
import { ShadowPortal } from './components/ShadowPortal'
import { BuildError } from './container/BuildError'
import { Errors, SupportedErrorEvent } from './container/Errors'
import { ErrorBoundary } from './ErrorBoundary'
import { Base } from './styles/Base'
import { ComponentStyles } from './styles/ComponentStyles'
import { CssReset } from './styles/CssReset'

type OverlayState = {
  nextId: number
  buildError: string | null
  errors: SupportedErrorEvent[]
}

function reducer(state: OverlayState, ev: Bus.BusEvent): OverlayState {
  switch (ev.type) {
    case Bus.TYPE_BUILD_OK: {
      return { ...state, buildError: null }
    }
    case Bus.TYPE_BUILD_ERROR: {
      return { ...state, buildError: ev.message }
    }
    case Bus.TYPE_REFRESH: {
      return { ...state, buildError: null, errors: [] }
    }
    case Bus.TYPE_UNHANDLED_ERROR:
    case Bus.TYPE_UNHANDLED_REJECTION: {
      return {
        ...state,
        nextId: state.nextId + 1,
        errors: [...state.errors, { id: state.nextId, event: ev }],
      }
    }
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _: never = ev
      return state
    }
  }
}

type ErrorType = 'runtime' | 'build'

const ReactDevOverlay: React.FunctionComponent = function ReactDevOverlay({
  children,
  preventDisplay,
}: {
  children?: React.ReactNode
  preventDisplay?: ErrorType[]
}) {
  const [state, dispatch] = React.useReducer<
    React.Reducer<OverlayState, Bus.BusEvent>
  >(reducer, {
    nextId: 1,
    buildError: null,
    errors: [],
  })

  React.useEffect(() => {
    Bus.on(dispatch)
    return function () {
      Bus.off(dispatch)
    }
  }, [dispatch])

  const onComponentError = React.useCallback(
    (_error: Error, _componentStack: string | null) => {
      // TODO: special handling
    },
    []
  )

  const hasBuildError = state.buildError != null
  const hasRuntimeErrors = Boolean(state.errors.length)

  const isMounted = hasBuildError || hasRuntimeErrors

  return (
    <React.Fragment>
      <ErrorBoundary onError={onComponentError}>
        {children ?? null}
      </ErrorBoundary>
      {isMounted ? (
        <ShadowPortal>
          <CssReset />
          <Base />
          <ComponentStyles />

          {shouldPreventDisplay(
            hasBuildError ? 'build' : hasRuntimeErrors ? 'runtime' : null,
            preventDisplay
          ) ? null : hasBuildError ? (
            <BuildError message={state.buildError!} />
          ) : hasRuntimeErrors ? (
            <Errors errors={state.errors} />
          ) : undefined}
        </ShadowPortal>
      ) : undefined}
    </React.Fragment>
  )
}

const shouldPreventDisplay = (
  errorType?: ErrorType | null,
  preventType?: ErrorType[] | null
) => {
  if (!preventType || !errorType) {
    return false
  }
  return preventType.includes(errorType)
}

export default ReactDevOverlay
