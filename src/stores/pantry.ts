import { defineStore } from 'pinia'
import { sample, shoppingList } from '../domain/pantry.ts'
import { clone } from '../services/files.ts'
export const usePantryStore = defineStore('pantry', {
  state: () => ({ ingredients: clone(sample.ingredients) }),
  getters: { stockedItems: (state) => state.ingredients.filter((i) => i.quantity > 0).length },
})
export const useMenuStore = defineStore('menu', {
  state: () => ({ title: sample.title, recipes: clone(sample.recipes), plan: clone(sample.plan) }),
  getters: {
    shopping(state) {
      return shoppingList(usePantryStore().ingredients, state.recipes, state.plan)
    },
    missingItems(): number {
      return this.shopping.filter((i) => i.missing > 0).length
    },
  },
})
