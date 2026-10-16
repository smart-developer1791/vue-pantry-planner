export type Unit = 'g' | 'ml' | 'piece'
export interface Ingredient {
  id: string
  name: string
  unit: Unit
  quantity: number
}
export interface Recipe {
  id: string
  name: string
  baseServings: number
  ingredients: { ingredient: string; quantity: number }[]
}
export interface Meal {
  id: string
  recipe: string
  servings: number
  day: number
}
export interface Workspace {
  format: 'PP/1'
  title: string
  ingredients: Ingredient[]
  recipes: Recipe[]
  plan: Meal[]
}
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const sample: Workspace = {
  format: 'PP/1',
  title: 'A good little week',
  ingredients: [
    { id: 'rice', name: 'Rice', unit: 'g', quantity: 240 },
    { id: 'beans', name: 'White beans', unit: 'g', quantity: 300 },
    { id: 'tomato', name: 'Tomatoes', unit: 'piece', quantity: 3 },
    { id: 'pasta', name: 'Pasta', unit: 'g', quantity: 90 },
    { id: 'milk', name: 'Oat milk', unit: 'ml', quantity: 200 },
    { id: 'lemon', name: 'Lemons', unit: 'piece', quantity: 1 },
  ],
  recipes: [
    {
      id: 'garden-bowl',
      name: 'The garden bowl',
      baseServings: 2,
      ingredients: [
        { ingredient: 'rice', quantity: 180 },
        { ingredient: 'beans', quantity: 240 },
        { ingredient: 'tomato', quantity: 2 },
      ],
    },
    {
      id: 'quiet-pasta',
      name: 'A quiet little pasta',
      baseServings: 2,
      ingredients: [
        { ingredient: 'pasta', quantity: 200 },
        { ingredient: 'tomato', quantity: 2 },
        { ingredient: 'milk', quantity: 100 },
      ],
    },
    {
      id: 'lemon-beans',
      name: 'Sunny lemon beans',
      baseServings: 2,
      ingredients: [
        { ingredient: 'beans', quantity: 250 },
        { ingredient: 'lemon', quantity: 1 },
      ],
    },
  ],
  plan: [
    { id: 'meal-one', recipe: 'garden-bowl', servings: 2, day: 0 },
    { id: 'meal-two', recipe: 'quiet-pasta', servings: 2, day: 2 },
    { id: 'meal-three', recipe: 'lemon-beans', servings: 2, day: 4 },
  ],
}
export function parseWorkspace(input: unknown): Workspace {
  if (!input || typeof input !== 'object') throw new Error('Expected a pantry workspace.')
  const v = input as Record<string, unknown>
  if (v.format !== 'PP/1') throw new Error('Expected PP/1 pantry data.')
  const text = (x: unknown, label: string, max = 70) => {
    if (typeof x !== 'string' || !x.trim() || x.length > max)
      throw new Error(`${label} needs 1–${max} characters.`)
    return x
  }
  const integer = (x: unknown, label: string, min: number, max: number) => {
    if (typeof x !== 'number' || !Number.isInteger(x) || x < min || x > max)
      throw new Error(`${label} must be a whole number from ${min} to ${max}.`)
    return x
  }
  const list = (x: unknown, label: string, min: number, max: number) => {
    if (!Array.isArray(x) || x.length < min || x.length > max)
      throw new Error(`${label} needs ${min}–${max} entries.`)
    return x as unknown[]
  }
  const object = (x: unknown) => {
    if (!x || typeof x !== 'object') throw new Error('Invalid pantry entry.')
    return x as Record<string, unknown>
  }
  const identities = () => {
    const ids = new Set<string>()
    return (x: unknown) => {
      const id = text(x, 'Identity', 60)
      if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id))
        throw new Error('Identities must be safe and unique.')
      ids.add(id)
      return id
    }
  }
  const ingredientId = identities(),
    recipeId = identities(),
    mealId = identities()
  const ingredients = list(v.ingredients, 'Pantry', 1, 20).map((x): Ingredient => {
    const i = object(x)
    if (!['g', 'ml', 'piece'].includes(i.unit as string)) throw new Error('Choose g, ml or piece.')
    return {
      id: ingredientId(i.id),
      name: text(i.name, 'Ingredient name'),
      unit: i.unit as Unit,
      quantity: integer(i.quantity, 'Stock', 0, 100000),
    }
  })
  const recipes = list(v.recipes, 'Recipe collection', 1, 12).map((x): Recipe => {
    const r = object(x),
      seen = new Set<string>()
    return {
      id: recipeId(r.id),
      name: text(r.name, 'Recipe name'),
      baseServings: integer(r.baseServings, 'Base servings', 1, 12),
      ingredients: list(r.ingredients, 'Recipe ingredients', 1, 12).map((x) => {
        const item = object(x),
          ingredient = text(item.ingredient, 'Ingredient reference', 60)
        if (!ingredients.some((i) => i.id === ingredient) || seen.has(ingredient))
          throw new Error('Recipe ingredients must reference distinct pantry items.')
        seen.add(ingredient)
        return { ingredient, quantity: integer(item.quantity, 'Recipe quantity', 1, 10000) }
      }),
    }
  })
  const plan = list(v.plan, 'Meal plan', 0, 14).map((x): Meal => {
    const m = object(x),
      recipe = text(m.recipe, 'Recipe reference', 60)
    if (!recipes.some((r) => r.id === recipe)) throw new Error('Every planned recipe must exist.')
    return {
      id: mealId(m.id),
      recipe,
      servings: integer(m.servings, 'Servings', 1, 12),
      day: integer(m.day, 'Day', 0, 6),
    }
  })
  return { format: 'PP/1', title: text(v.title, 'Workspace title', 80), ingredients, recipes, plan }
}
export function mealRequirements(recipe: Recipe, servings: number) {
  return recipe.ingredients.map((item) => ({
    ingredient: item.ingredient,
    quantity: Math.ceil((item.quantity * servings) / recipe.baseServings),
  }))
}
export function shoppingList(ingredients: Ingredient[], recipes: Recipe[], plan: Meal[]) {
  const required = new Map<string, number>()
  for (const meal of plan) {
    const recipe = recipes.find((r) => r.id === meal.recipe)!
    for (const item of mealRequirements(recipe, meal.servings))
      required.set(item.ingredient, (required.get(item.ingredient) ?? 0) + item.quantity)
  }
  return ingredients
    .filter((i) => required.has(i.id))
    .map((i) => ({
      ...i,
      required: required.get(i.id)!,
      missing: Math.max(0, required.get(i.id)! - i.quantity),
    }))
}
export function canCook(ingredients: Ingredient[], recipe: Recipe, servings: number) {
  return mealRequirements(recipe, servings).every(
    (item) => (ingredients.find((i) => i.id === item.ingredient)?.quantity ?? 0) >= item.quantity,
  )
}
export function shoppingCSV(items: ReturnType<typeof shoppingList>) {
  const quote = (text: string) =>
    `"${(/^[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""')}"`
  return (
    [
      'Ingredient,Unit,Needed,In pantry,To buy',
      ...items.map((i) => `${quote(i.name)},${i.unit},${i.required},${i.quantity},${i.missing}`),
    ].join('\r\n') + '\r\n'
  )
}
