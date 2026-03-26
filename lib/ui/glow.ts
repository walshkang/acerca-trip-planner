/** Focus ring + soft blue glow (sky/blue) for selected place UI. */
export const PLACE_FOCUS_GLOW =
  'ring-2 ring-sky-500/45 shadow-[0_0_14px_rgba(59,130,246,0.45),0_0_2px_rgba(15,23,42,0.22)]'

export const PLACE_ICON_GLOW =
  'shadow-[0_0_10px_rgba(59,130,246,0.55)]'

/**
 * Discover preview (“ghost”) pin: subtle pulsing outer glow only.
 * Hue matches MapShell `markerFocusClassName` per map tone; alpha swings ~0.3–0.7
 * on a 2s cycle (see tailwind `ghostGlowPulseDark` / `ghostGlowPulseLight`).
 */
export const GHOST_MARKER_GLOW_PULSE_CLASS_DARK = 'animate-ghost-glow-pulse-dark'
export const GHOST_MARKER_GLOW_PULSE_CLASS_LIGHT = 'animate-ghost-glow-pulse-light'

export function ghostMarkerGlowPulseClass(
  mapStyleMode: 'light' | 'dark'
): string {
  return mapStyleMode === 'dark'
    ? GHOST_MARKER_GLOW_PULSE_CLASS_DARK
    : GHOST_MARKER_GLOW_PULSE_CLASS_LIGHT
}
