import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
test('portions recalculate shopping and cooking changes both stores with undo/redo', async ({
  page,
}) => {
  await page.goto('/')
  const first = page.locator('[data-meal-id="meal-one"]')
  await first.getByLabel('Servings', { exact: true }).fill('4')
  await first.getByLabel('Servings', { exact: true }).press('Tab')
  await expect(page.locator('[data-shopping-id="rice"]')).toContainText('120 g')
  await page.getByRole('button', { name: 'Mark list as stocked', exact: true }).click()
  await expect(page.locator('[data-ui~="shopping-items"] article:not(.ready)')).toHaveCount(0)
  await first.getByRole('button', { name: 'Cooked', exact: true }).click()
  await expect(first).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(first).toHaveCount(1)
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(first).toHaveCount(0)
  await page.getByRole('button', { name: 'The pantry', exact: true }).click()
  await expect(page.getByLabel('Rice stock', { exact: true })).toHaveValue('0')
  await page.reload()
  await page.getByRole('button', { name: 'The pantry', exact: true }).click()
  await expect(page.getByLabel('Rice stock', { exact: true })).toHaveValue('0')
})
test('inventory and recipe changes drive the linked shopping getter and are reversible', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'The pantry', exact: true }).click()
  await page.getByLabel('Pasta stock', { exact: true }).fill('200')
  await page.getByLabel('Pasta stock', { exact: true }).press('Tab')
  await expect(page.locator('[data-shopping-id="pasta"]')).toContainText('0 g')
  await page.getByRole('button', { name: 'The recipes', exact: true }).click()
  await page.getByRole('button', { name: 'Edit A quiet little pasta', exact: true }).click()
  await page.getByLabel('Quantity', { exact: true }).first().fill('300')
  await page.getByRole('button', { name: 'Save recipe', exact: true }).click()
  await expect(page.locator('[data-shopping-id="pasta"]')).toContainText('100 g')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('[data-shopping-id="pasta"]')).toContainText('0 g')
  await page.getByRole('button', { name: 'The pantry', exact: true }).click()
  await page.getByRole('button', { name: 'Add staple', exact: true }).click()
  await page.getByLabel('Ingredient name', { exact: true }).fill('A little flour')
  await page.getByLabel('Initial stock', { exact: true }).fill('250')
  await page.getByRole('button', { name: 'Add to pantry', exact: true }).click()
  await expect(page.getByLabel('A little flour stock', { exact: true })).toHaveValue('250')
})
test('CSV and JSON exports work, and malformed imported relationships preserve both stores', async ({
  page,
}) => {
  await page.goto('/')
  const csvEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Shopping list', exact: true }).click()
  const csv = await fs.readFile((await (await csvEvent).path())!, 'utf8')
  expect(csv).toContain('Ingredient,Unit,Needed,In pantry,To buy')
  expect(csv).toContain('"White beans",g,490,300,190')
  await page.getByRole('button', { name: 'Import / export' }).click()
  const jsonEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download workspace', exact: true }).click()
  const data = JSON.parse(await fs.readFile((await (await jsonEvent).path())!, 'utf8'))
  expect(data.provenance.marker).toMatch(/^PP-[A-F0-9]{8}$/)
  await page
    .getByLabel('Pantry JSON', { exact: true })
    .fill(JSON.stringify({ ...data, plan: [{ ...data.plan[0], recipe: 'missing' }] }))
  await page.getByRole('button', { name: 'Import pantry', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('recipe must exist')
  await page
    .getByLabel('Pantry JSON', { exact: true })
    .fill(JSON.stringify({ ...data, title: 'Imported little week' }))
  await page.getByRole('button', { name: 'Import pantry', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Imported little week', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A good little week', exact: true })).toBeVisible()
})
test('view changes preserve neighboring panels and fit narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await page.goto('/')
  const position = () =>
      page
        .locator('[data-ui~="page-footer"]')
        .evaluate((el) => el.getBoundingClientRect().top + scrollY),
    before = await position()
  for (const name of ['The pantry', 'The recipes', 'The week']) {
    await page.getByRole('button', { name, exact: true }).click()
    expect(Math.abs((await position()) - before)).toBeLessThan(1)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
