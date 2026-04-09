import { beforeEach, describe, expect, it } from 'vitest'
import { useMapLayerStore } from '@/lib/state/useMapLayerStore'

function resetMapLayerStore() {
  useMapLayerStore.setState({
    activeLayer: 'default',
    transitModes: ['subway'],
    hydrated: false,
  } as any)
}

describe('useMapLayerStore transitLoading', () => {
  beforeEach(() => {
    resetMapLayerStore()
  })

  it('defaults transitLoading to false', () => {
    expect(useMapLayerStore.getState().transitLoading).toBe(false)
  })

  it('updates via setTransitLoading', () => {
    useMapLayerStore.getState().setTransitLoading(true)
    expect(useMapLayerStore.getState().transitLoading).toBe(true)
    useMapLayerStore.getState().setTransitLoading(false)
    expect(useMapLayerStore.getState().transitLoading).toBe(false)
  })
})
