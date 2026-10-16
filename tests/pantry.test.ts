import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import {
  canCook,
  mealRequirements,
  parseWorkspace,
  sample,
  shoppingCSV,
  shoppingList,
} from '../src/domain/pantry.ts'
import { usePlanner } from '../src/composables/usePlanner.ts'
test('pantry validates recipe relationships, quantity units and seven-day limits', () => {
  assert.deepEqual(parseWorkspace({ ...sample, metadata: 'ignored' }), sample)
  const configs = [
    { ingredients: [] },
    { ingredients: [{ ...sample.ingredients[0], quantity: -1 }] },
    { recipes: [{ ...sample.recipes[0], ingredients: [{ ingredient: 'missing', quantity: 1 }] }] },
    { plan: [{ ...sample.plan[0], day: 7 }] },
    { plan: [{ ...sample.plan[0], servings: 1.5 }] },
  ]
  for (const changes of configs) assert.throws(() => parseWorkspace({ ...sample, ...changes }))
})
test('shopping combines all meals and uses the same whole-unit rounding as cooking', () => {
  const list = shoppingList(sample.ingredients, sample.recipes, sample.plan)
  assert.equal(list.find((i) => i.id === 'beans')!.missing, 190)
  assert.equal(list.find((i) => i.id === 'pasta')!.missing, 110)
  assert.equal(list.find((i) => i.id === 'tomato')!.missing, 1)
  assert.equal(canCook(sample.ingredients, sample.recipes[0]!, 2), true)
  assert.equal(canCook(sample.ingredients, sample.recipes[1]!, 2), false)
  assert.deepEqual(mealRequirements(sample.recipes[2]!, 1), [
    { ingredient: 'beans', quantity: 125 },
    { ingredient: 'lemon', quantity: 1 },
  ])
})
test('CSV preserves quoted ingredient names and treats formula-like names as text', () => {
  const items = shoppingList(sample.ingredients, sample.recipes, sample.plan)
  items[0]!.name = '=A,"B"'
  assert.ok(shoppingCSV(items).includes('"\'=A,""B"""'))
  assert.ok(shoppingCSV(items).endsWith('\r\n'))
})
test('linked Pinia stores cook atomically, undo/redo, persist complete snapshots and unsubscribe', async () => {
  const values = new Map<string, string>()
  let writes = 0
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
        writes++
      },
    },
  })
  setActivePinia(createPinia())
  const scope = effectScope(),
    planner = scope.run(() => usePlanner())!
  assert.equal(planner.cook('meal-one'), true)
  assert.equal(planner.pantry.ingredients.find((i) => i.id === 'rice')!.quantity, 60)
  assert.equal(planner.menu.plan.length, 2)
  planner.undo()
  assert.deepEqual(planner.snapshot(), sample)
  planner.redo()
  assert.equal(planner.menu.plan.length, 2)
  assert.equal(planner.cook('meal-two'), false)
  assert.equal(planner.menu.plan.length, 2)
  planner.stockMissing()
  assert.equal(planner.menu.missingItems, 0)
  await nextTick()
  assert.deepEqual(
    parseWorkspace(JSON.parse(values.get('pantry-planner:PP1')!)),
    planner.snapshot(),
  )
  const count = writes
  scope.stop()
  planner.pantry.$patch({ ingredients: structuredClone(sample.ingredients) })
  await nextTick()
  assert.equal(writes, count)
  planner.pantry.$dispose()
  planner.menu.$dispose()
  delete (globalThis as Record<string, unknown>).localStorage
})
