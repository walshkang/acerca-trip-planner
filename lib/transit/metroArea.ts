const GRID_DEGREES = 0.5

function snapToGrid(coord: number): number {
  return Math.floor(coord / GRID_DEGREES) * GRID_DEGREES
}

// Floor-based 0.5° grid snap → storage-safe key like "40.5_-74.0"
export function gridKey(lat: number, lng: number): string {
  return `${snapToGrid(lat).toFixed(1)}_${snapToGrid(lng).toFixed(1)}`
}

export const ROUTE_TYPES = { TRAM: 0, SUBWAY: 1, RAIL: 2, BUS: 3 } as const

export const DEFAULT_ROUTE_COLOR = '888888'
