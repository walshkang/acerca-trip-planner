import { test, expect } from '@playwright/test'

import {
  applySeededPrerequisiteSkips,
  cleanupSeededData,
  ensureSignedIn,
  seedListWithPlace,
} from './seeded-helpers'

applySeededPrerequisiteSkips(test)

test.describe('adaptive workspace — desktop', () => {
  test('resize handle is present and panel respects localStorage width', async ({
    page,
  }) => {
    // Set narrow width in localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('acerca:panelWidth', '360')
    })
    await page.goto('/')
    await ensureSignedIn(page)

    await page.getByRole('button', { name: 'Workspace' }).click()

    // Desktop panel should be visible with resize handle
    const panel = page.locator('[data-testid="context-panel-desktop"]')
    await expect(panel).toBeVisible()

    const handle = page.locator('[data-testid="desktop-resize-handle"]')
    await expect(handle).toBeVisible()
    await expect(handle).toHaveAttribute('role', 'separator')
    await expect(handle).toHaveAttribute('aria-orientation', 'vertical')

    // Panel should have rendered at the narrow 360px width (from localStorage)
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    // Allow margin: 360px or min(360px, 92vw) — in a 1280px viewport, 360 wins
    expect(box!.width).toBeGreaterThanOrEqual(350)
    expect(box!.width).toBeLessThanOrEqual(400)

    // At narrow width, panel should show single-column layout (no split grid)
    const splitGrid = panel.locator('.grid-cols-2')
    await expect(splitGrid).toHaveCount(0)

    // Close workspace and verify it hides
    await page.getByRole('button', { name: 'Hide workspace' }).click()
    await expect(panel).toBeHidden()
  })

  test('drag handle resizes panel to nearest snap point', async ({ page }) => {
    await page.goto('/')
    await ensureSignedIn(page)

    await page.getByRole('button', { name: 'Workspace' }).click()
    const panel = page.locator('[data-testid="context-panel-desktop"]')
    await expect(panel).toBeVisible()

    const handle = page.locator('[data-testid="desktop-resize-handle"]')
    const handleBox = await handle.boundingBox()
    expect(handleBox).not.toBeNull()

    // Drag the handle left by ~250px to widen beyond 760 → should snap back to 760
    // Or drag right to narrow → should snap to 520
    const startX = handleBox!.x + handleBox!.width / 2
    const startY = handleBox!.y + handleBox!.height / 2

    // Drag right by 200px (narrowing the panel)
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 200, startY, { steps: 5 })
    await page.mouse.up()

    // Should snap to 520 (nearest snap to 760 - 200 = 560)
    // Wait for transition
    await page.waitForTimeout(300)
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(500)
    expect(box!.width).toBeLessThanOrEqual(540)

    // Verify localStorage was persisted
    const stored = await page.evaluate(() =>
      localStorage.getItem('acerca:panelWidth')
    )
    expect(stored).toBe('520')

    // Close workspace
    await page.getByRole('button', { name: 'Hide workspace' }).click()
  })

  test('panel shows split layout at 520px and above', async ({ page }) => {
    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      await page.addInitScript(() => {
        localStorage.setItem('acerca:panelWidth', '520')
      })
      await page.goto('/')
      await ensureSignedIn(page)
      const seed = await seedListWithPlace(page)
      seeds.push(seed)

      await page.getByRole('button', { name: 'Workspace' }).click()
      const panel = page.locator('[data-testid="context-panel-desktop"]')
      await expect(panel).toBeVisible()

      // At 520px, split-view grid should be visible
      const splitGrid = panel.locator('.grid-cols-2')
      await expect(splitGrid).toHaveCount(1)
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })
})

test.describe('adaptive workspace — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile sheet opens with grab bar and content is accessible', async ({
    page,
  }) => {
    const seeds = [] as Awaited<ReturnType<typeof seedListWithPlace>>[]
    try {
      await page.goto('/')
      await ensureSignedIn(page)
      const seed = await seedListWithPlace(page)
      seeds.push(seed)

      await page.getByRole('button', { name: 'Workspace' }).click()

      // Mobile sheet should be visible
      const sheet = page.locator('[data-testid="context-panel-mobile"]')
      await expect(sheet).toBeVisible()

      // Grab bar should be present
      const grabBar = page.locator('[data-testid="mobile-grab-bar"]')
      await expect(grabBar).toBeVisible()
      await expect(grabBar).toHaveAttribute('role', 'separator')
      await expect(grabBar).toHaveAttribute('aria-orientation', 'horizontal')

      // Sheet should have content (not peek mode — default is 'half')
      const box = await sheet.boundingBox()
      expect(box).not.toBeNull()
      // Half = 50dvh ≈ 422px on an 844px viewport. Allow margin.
      expect(box!.height).toBeGreaterThan(350)
      expect(box!.height).toBeLessThan(500)

      // Close button should work
      await sheet.getByRole('button', { name: 'Close' }).click()
      await expect(sheet).toBeHidden()
    } finally {
      await cleanupSeededData(page, seeds)
    }
  })
})
