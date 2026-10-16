import { onScopeDispose, ref } from 'vue'
import { useMenuStore, usePantryStore } from '../stores/pantry.ts'
import { canCook, mealRequirements, parseWorkspace, type Workspace } from '../domain/pantry.ts'
import { clone } from '../services/files.ts'
export function usePlanner() {
  const pantry = usePantryStore(),
    menu = useMenuStore(),
    past = ref<Workspace[]>([]),
    future = ref<Workspace[]>([]),
    status = ref('Saved on this device'),
    error = ref(''),
    lastAction = ref('A good place to start.')
  const key = 'pantry-planner:PP1'
  const snapshot = (): Workspace =>
    parseWorkspace({
      format: 'PP/1',
      title: menu.title,
      ingredients: pantry.ingredients,
      recipes: menu.recipes,
      plan: menu.plan,
    })
  function replace(next: Workspace) {
    pantry.$patch({ ingredients: clone(next.ingredients) })
    menu.$patch({ title: next.title, recipes: clone(next.recipes), plan: clone(next.plan) })
  }
  try {
    const stored = localStorage.getItem(key)
    if (stored) replace(parseWorkspace(JSON.parse(stored)))
  } catch {
    status.value = 'Saved pantry unavailable; sample restored'
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(snapshot()))
      status.value = 'Saved on this device'
    } catch {
      status.value = 'Storage unavailable; export to keep your work'
    }
  }
  const stopStock = pantry.$subscribe(persist, { flush: 'post' }),
    stopMenu = menu.$subscribe(persist, { flush: 'post' })
  onScopeDispose(() => {
    stopStock()
    stopMenu()
  })
  function commit(label: string, change: (next: Workspace) => void) {
    try {
      const before = snapshot(),
        next = clone(before)
      change(next)
      const valid = parseWorkspace(next)
      if (JSON.stringify(before) === JSON.stringify(valid)) return true
      replace(valid)
      past.value.push(before)
      past.value = past.value.slice(-30)
      future.value = []
      lastAction.value = label
      error.value = ''
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    }
  }
  function undo() {
    const previous = past.value.pop()
    if (!previous) return
    future.value.push(snapshot())
    replace(previous)
    error.value = ''
    lastAction.value = 'Undid the last pantry change.'
  }
  function redo() {
    const next = future.value.pop()
    if (!next) return
    past.value.push(snapshot())
    replace(next)
    error.value = ''
    lastAction.value = 'Brought that pantry change back.'
  }
  function cook(id: string) {
    return commit('A little meal, made from your pantry.', (next) => {
      const meal = next.plan.find((m) => m.id === id)
      if (!meal) throw new Error('That meal is no longer in your plan.')
      const recipe = next.recipes.find((r) => r.id === meal.recipe)!
      if (!canCook(next.ingredients, recipe, meal.servings))
        throw new Error('Stock the missing ingredients before cooking.')
      for (const needed of mealRequirements(recipe, meal.servings))
        next.ingredients.find((i) => i.id === needed.ingredient)!.quantity -= needed.quantity
      next.plan = next.plan.filter((m) => m.id !== id)
    })
  }
  function stockMissing() {
    return commit('The shopping list is now in your pantry.', (next) => {
      for (const item of menu.shopping)
        next.ingredients.find((i) => i.id === item.id)!.quantity += item.missing
    })
  }
  return {
    pantry,
    menu,
    past,
    future,
    status,
    error,
    lastAction,
    snapshot,
    commit,
    undo,
    redo,
    cook,
    stockMissing,
  }
}
