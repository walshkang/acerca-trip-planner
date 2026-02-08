const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

async function main() {
  const outDir = path.resolve(__dirname)
  const storagePath = path.resolve('/Users/walsh.kang/Documents/GitHub/acerca-trip-planner/playwright/.auth/user.json')
  const executablePath = '/Users/walsh.kang/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'

  const hasStorage = fs.existsSync(storagePath)
  console.log('storageState:', hasStorage ? storagePath : 'MISSING')

  const browser = await chromium.launch({ headless: true, executablePath })
  const context = await browser.newContext(
    hasStorage ? { storageState: storagePath, viewport: { width: 1512, height: 920 } } : { viewport: { width: 1512, height: 920 } }
  )

  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3010', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2500)

  const signInVisible = await page.getByRole('link', { name: 'Sign in' }).isVisible().catch(() => false)
  const listsVisible = await page.getByRole('button', { name: 'Lists' }).isVisible().catch(() => false)
  console.log('signInVisible:', signInVisible, 'listsVisible:', listsVisible)

  await page.screenshot({ path: path.join(outDir, '01-home.png'), fullPage: true })

  if (listsVisible) {
    await page.getByRole('button', { name: 'Lists' }).click()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(outDir, '02-lists-open.png'), fullPage: true })

    const drawer = page.locator('[data-testid="list-drawer"]')
    const hasDrawer = await drawer.count()
    console.log('listDrawerCount:', hasDrawer)

    if (hasDrawer > 0) {
      const buttons = await drawer.getByRole('button').all()
      const names = []
      for (const b of buttons) {
        const txt = (await b.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
        if (txt) names.push(txt)
      }
      console.log('drawerButtons:', JSON.stringify(names))

      const blacklist = new Set(['Clear', 'Create', 'Hide lists', 'Lists', 'Plan', 'Details', 'Close'])
      let clicked = false
      for (const name of names) {
        if (blacklist.has(name)) continue
        const btn = drawer.getByRole('button', { name, exact: true }).first()
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          clicked = true
          console.log('selectedListButton:', name)
          break
        }
      }

      if (clicked) {
        await page.waitForTimeout(1200)
        await page.screenshot({ path: path.join(outDir, '03-list-selected.png'), fullPage: true })

        const planButton = page.getByRole('button', { name: 'Plan', exact: true }).first()
        if (await planButton.isVisible().catch(() => false)) {
          await planButton.click()
          await page.waitForTimeout(1200)
          await page.screenshot({ path: path.join(outDir, '04-plan-mode.png'), fullPage: true })

          const planner = page.locator('[data-testid="list-planner"]')
          const plannerVisible = await planner.isVisible().catch(() => false)
          console.log('plannerVisible:', plannerVisible)
          if (plannerVisible) {
            const headings = await planner.locator('h3,h4').allInnerTexts().catch(() => [])
            console.log('plannerHeadings:', JSON.stringify(headings.map((v) => v.replace(/\s+/g, ' ').trim())))
            const moveButtons = await planner.getByRole('button', { name: 'Move' }).count()
            console.log('plannerMoveButtonCount:', moveButtons)
          }
        } else {
          console.log('planButtonNotVisible')
        }
      } else {
        console.log('noListButtonSelected')
      }
    }
  }

  await context.close()
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
