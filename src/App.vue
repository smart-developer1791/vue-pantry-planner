<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDialog from './components/AppDialog.vue'
import AppIcon from './components/AppIcon.vue'
import { usePlanner } from './composables/usePlanner'
import {
  canCook,
  days,
  parseWorkspace,
  sample,
  shoppingCSV,
  type Recipe,
  type Unit,
} from './domain/pantry'
import { clone, download, stamp } from './services/files'
const planner = usePlanner(),
  { pantry, menu, past, future, status, error, lastAction } = planner
const view = ref<'week' | 'pantry' | 'recipes'>('week'),
  day = ref(0),
  exchange = ref(false),
  restore = ref(false),
  ingredientDialog = ref(false),
  recipeDialog = ref(false),
  importText = ref(''),
  importError = ref('')
const itemName = ref(''),
  itemUnit = ref<Unit>('g'),
  itemQuantity = ref(0)
const editing = ref<Recipe>(clone(sample.recipes[0]!)),
  editorError = ref('')
const marker = computed(() => stamp('PP', planner.snapshot()))
function addMeal(recipe: string) {
  planner.commit('A little meal added to the week.', (next) =>
    next.plan.push({ id: `meal-${crypto.randomUUID()}`, recipe, servings: 2, day: day.value }),
  )
}
function stock(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (
    !planner.commit('Updated what is on the shelf.', (next) => {
      next.ingredients.find((i) => i.id === id)!.quantity = Number(input.value)
    })
  )
    input.value = String(pantry.ingredients.find((i) => i.id === id)!.quantity)
}
function servings(id: string, event: Event) {
  const input = event.target as HTMLInputElement
  if (
    !planner.commit('Made room for a different table.', (next) => {
      next.plan.find((m) => m.id === id)!.servings = Number(input.value)
    })
  )
    input.value = String(menu.plan.find((m) => m.id === id)!.servings)
}
function addIngredient() {
  if (
    planner.commit('A new little pantry staple.', (next) =>
      next.ingredients.push({
        id: `item-${crypto.randomUUID()}`,
        name: itemName.value,
        unit: itemUnit.value,
        quantity: itemQuantity.value,
      }),
    )
  ) {
    ingredientDialog.value = false
    itemName.value = ''
    itemQuantity.value = 0
  }
}
function editRecipe(recipe?: Recipe) {
  editing.value = recipe
    ? clone(recipe)
    : {
        id: `recipe-${crypto.randomUUID()}`,
        name: 'A new little recipe',
        baseServings: 2,
        ingredients: [{ ingredient: pantry.ingredients[0]!.id, quantity: 100 }],
      }
  editorError.value = ''
  recipeDialog.value = true
}
function saveRecipe() {
  if (
    planner.commit('A recipe refined for your table.', (next) => {
      const index = next.recipes.findIndex((r) => r.id === editing.value.id)
      if (index < 0) next.recipes.push(clone(editing.value))
      else next.recipes[index] = clone(editing.value)
    })
  )
    recipeDialog.value = false
  else editorError.value = error.value
}
function addRecipeIngredient() {
  const next = pantry.ingredients.find(
    (i) => !editing.value.ingredients.some((r) => r.ingredient === i.id),
  )
  if (next && editing.value.ingredients.length < 12)
    editing.value.ingredients.push({ ingredient: next.id, quantity: 1 })
}
function exportData() {
  download(
    'pantry-workspace.json',
    JSON.stringify(
      {
        ...planner.snapshot(),
        provenance: { project: 'vue-pantry-planner', author: 'CodeSculptor', marker: marker.value },
      },
      null,
      2,
    ),
  )
}
function importData() {
  try {
    const imported = parseWorkspace(JSON.parse(importText.value))
    if (
      planner.commit('A pantry brought back to the table.', (next) => Object.assign(next, imported))
    ) {
      exchange.value = false
      importError.value = ''
    }
  } catch (e) {
    importError.value = (e as Error).message
  }
}
function restoreSample() {
  planner.commit('The starting shelf, brought back.', (next) => Object.assign(next, clone(sample)))
  restore.value = false
}
</script>
<template>
  <div
    class="[&_main]:max-w-380 [&_main]:py-0 [&_main]:px-9.5 [&_main]:my-0 [&_main]:mx-auto [@media(width<=700px)]:[&_main]:px-4 [@media(700px<width<=1100px)]:[&_main]:px-6"
  >
    <header
      class="min-h-21.5 flex items-center justify-between gap-6 border-b [border-bottom-style:solid] border-b-line bg-surface py-5 px-9.5 [@media(width<=700px)]:gap-4 [@media(width<=700px)]:flex-wrap [@media(width<=700px)]:p-4 [@media(700px<width<=1100px)]:py-4.5 [@media(700px<width<=1100px)]:px-6 [@media(1600px<=width)]:px-[max(38px,_calc((100vw_-_1444px)_/_2))]"
    >
      <a
        href="/"
        class="font-display flex gap-[13px] items-center text-[length:24px] font-[650] tracking-[-0.8px] [@media(width<=700px)]:text-[length:22px]"
        ><span
          class="w-10.5 h-10.5 rounded-[10px] bg-accent text-on-accent grid place-items-center text-[length:30px] relative [&_span]:text-[length:16px] [&_span]:absolute [&_span]:right-[5px] [&_span]:bottom-1"
          ><AppIcon name="folder" :size="22" /></span
        ><span
          >good shelf<span
            class="block font-sans text-[length:8px] tracking-[1.5px] font-semibold text-muted mt-[3px]"
            >PANTRY PLANNER</span
          ></span
        ></a
      >
      <div
        class="flex items-center gap-3 [@media(width<=700px)]:gap-2 [@media(width<=700px)]:w-full [@media(width<=700px)]:justify-end [@media(width<=700px)]:[&_>_button]:flex-1"
      >
        <span
          class="flex items-center gap-[7px] text-[length:11px] text-muted mr-3 [@media(width<=1100px)]:hidden"
          ><i class="inline-block w-1.5 h-1.5 rounded-[50%] bg-accent shrink-0" />{{ status }}</span
        ><button
          data-ui="secondary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
          @click="exchange = true"
        >
          <AppIcon name="upload" />Import / export</button
        ><button
          data-ui="primary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
          @click="download('shopping-list.csv', shoppingCSV(menu.shopping), 'text/csv')"
        >
          <AppIcon name="download" />Shopping list
        </button>
      </div>
    </header>
    <main>
      <section
        class="flex justify-between items-center min-h-[267px] gap-8 py-8.5 px-0 [@media(width<=700px)]:py-7.5 [&_[data-ui~=eyebrow]]:mb-[15px] [&_>_div_>_p:last-child]:mt-4 [&_>_div_>_p:last-child]:text-[length:14px] [&_>_div_>_p:last-child]:text-muted [@media(width<=700px)]:[&_>_div_>_p:last-child]:text-[length:13px] [@media(width<=700px)]:[&_h1]:text-[length:34px]"
      >
        <div>
          <p data-ui="eyebrow" class="text-[length:10px] font-[750] tracking-[1.8px] text-muted">
            A GOOD WEEK STARTS ON THE SHELF.
          </p>
          <h1>Good meals start<br /><span class="text-accent">with what you have.</span></h1>
          <p>
            A few pantry staples. A few thoughtful meals.<br />A little less guessing at the grocery
            store.
          </p>
        </div>
        <div
          class="h-[185px] w-72.5 mr-10 relative flex items-end gap-4 pb-[15px] [@media(width<=1000px)]:mr-3 [@media(width<=1000px)]:hidden [@media(1000px<width<=1200px)]:mr-3 [&_em]:absolute [&_em]:bottom-[-15px] [&_em]:left-2 [&_em]:whitespace-nowrap [&_em]:text-[length:8px] [&_em]:text-[#a2ad91] [&_em]:not-italic [&_em]:tracking-[1px]"
          aria-hidden="true"
        >
          <span
            data-ui="tall"
            class="relative bg-[#e8e2c7] w-32.5 flex flex-col items-center justify-center gap-3 border border-solid border-[#ceccad] rounded-[9px_9px_20px_20px] [&_i]:absolute [&_i]:top-[-12px] [&_i]:h-4.5 [&_i]:w-[calc(100%_+_6px)] [&_i]:bg-[#afbb98] [&_i]:border [&_i]:border-solid [&_i]:border-[#99a783] [&_i]:rounded-[5px] [&[data-ui~=tall]]:h-40 [&[data-ui~=tall]]:[transform:rotate(-5deg)] [&_b]:text-[length:11px] [&_b]:tracking-[3px] [&_b]:text-[#8a9577] [&_b]:bg-[#f9f8ec] [&_b]:border [&_b]:border-solid [&_b]:border-[#c7caaa] [&_b]:rounded-[4px] [&_b]:py-[15px] [&_b]:px-[19px] [&_small]:text-[length:8px] [&_small]:text-[#a0a48b] [&_small]:tracking-[1px]"
            ><i /><b>RICE</b><small>little staples</small></span
          ><span
            data-ui="short"
            class="relative bg-[#e8e2c7] w-32.5 flex flex-col items-center justify-center gap-3 border border-solid border-[#ceccad] rounded-[9px_9px_20px_20px] [&_i]:absolute [&_i]:top-[-12px] [&_i]:h-4.5 [&_i]:w-[calc(100%_+_6px)] [&_i]:bg-[#afbb98] [&_i]:border [&_i]:border-solid [&_i]:border-[#99a783] [&_i]:rounded-[5px] [&[data-ui~=short]]:h-[125px] [&[data-ui~=short]]:bg-[#e0e8d4] [&[data-ui~=short]]:[transform:rotate(5deg)] [&_b]:text-[length:11px] [&_b]:tracking-[3px] [&_b]:text-[#8a9577] [&_b]:bg-[#f9f8ec] [&_b]:border [&_b]:border-solid [&_b]:border-[#c7caaa] [&_b]:rounded-[4px] [&_b]:py-[15px] [&_b]:px-[19px] [&_small]:text-[length:8px] [&_small]:text-[#a0a48b] [&_small]:tracking-[1px]"
            ><i /><b>BEANS</b><small>good things</small></span
          ><em>MAKE ROOM FOR A GOOD LITTLE WEEK.</em>
        </div>
      </section>
      <div
        class="grid grid-cols-[223px_minmax(0,_1fr)_283px] gap-5.5 [@media(width<=700px)]:grid-cols-[minmax(0,_1fr)] [@media(width<=700px)]:gap-4 [@media(700px<width<=1000px)]:grid-cols-[210px_minmax(0,_1fr)] [@media(700px<width<=1000px)]:gap-4 [@media(1000px<width<=1200px)]:grid-cols-[195px_minmax(0,_1fr)_252px] [@media(1000px<width<=1200px)]:gap-4 [@media(width<=1200px)]:[&_>_[data-ui~=panel]]:p-[19px]"
      >
        <aside
          data-ui="panel"
          class="bg-surface border border-solid border-line rounded-[var(--radius)] min-w-0 h-207.5 flex flex-col p-[23px] [@media(width<=700px)]:h-[735px] [@media(width<=700px)]:p-5 [&_>_label]:mt-[7px]"
        >
          <div class="flex items-center justify-between gap-3 mb-2 [&_+_p]:mb-5">
            <h2>At your table</h2>
            <span
              class="text-[length:10px] font-semibold bg-hover border border-solid border-line rounded-[6px] whitespace-nowrap py-1 px-[7px]"
              >{{ menu.recipes.length }}</span
            >
          </div>
          <p data-ui="muted" class="text-muted text-[length:12px]">Choose a recipe for the week.</p>
          <label
            >Add to<select v-model.number="day">
              <option v-for="(name, index) in days" :key="name" :value="index">{{ name }}</option>
            </select></label
          >
          <div
            class="flex-1 min-h-0 overflow-auto mt-[3px] mb-[25px] mx-[-8px] [&_button]:flex [&_button]:flex-col [&_button]:gap-2 [&_button]:w-full [&_button]:border [&_button]:border-solid [&_button]:border-line [&_button]:bg-[#f8faf2] [&_button]:rounded-[12px] [&_button]:mb-[13px] [&_button]:relative [&_button]:text-left [&_button]:text-ink [&_button]:py-5 [&_button]:px-4 [&_strong]:text-[length:12px] [&_strong]:leading-[1.6] [&_strong]:pr-3 [&_small]:text-[length:9px] [&_small]:text-muted [&_svg]:absolute [&_svg]:right-[13px] [&_svg]:top-5 [&_svg]:text-[#a0b385]"
          >
            <button
              v-for="(recipe, index) in menu.recipes"
              :key="recipe.id"
              :disabled="menu.plan.length >= 14"
              @click="addMeal(recipe.id)"
            >
              <span class="text-[length:25px] text-[#a0b385] leading-[1]">{{
                ['◒', '〰', '☀'][index % 3]
              }}</span
              ><strong>{{ recipe.name }}</strong
              ><small>{{ recipe.ingredients.length }} ingredients / + 2 servings</small
              ><AppIcon name="plus" :size="16" />
            </button>
          </div>
          <div
            class="border-t [border-top-style:solid] border-t-line pt-5 flex items-start gap-[9px] text-muted text-[length:11px] [&_svg]:text-accent [&_svg]:mt-[3px]"
          >
            <AppIcon name="branch" />
            <p>Your shopping list follows your whole week, including the portions at your table.</p>
          </div>
          <button
            data-ui="text-button"
            class="inline-flex items-center justify-center gap-[9px] min-h-8 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-[transparent] text-muted mt-4.5 text-[length:11px] py-[7px] px-0.5"
            @click="restore = true"
          >
            <AppIcon name="reset" />Restore sample
          </button>
        </aside>
        <section
          class="h-207.5 flex flex-col border border-solid border-line rounded-[18px] overflow-hidden bg-surface min-w-0 [@media(width<=700px)]:h-267.5 [&_[data-ui~=canvas-footer]]:h-[51px] [&_[data-ui~=canvas-footer]]:items-center [&_[data-ui~=canvas-footer]]:text-[length:8px] [@media(width<=700px)]:[&_[data-ui~=canvas-footer]]:h-[69px] [@media(width<=700px)]:[&_[data-ui~=canvas-footer]]:text-[length:7px]"
        >
          <div
            class="min-h-15.5 border-b [border-bottom-style:solid] border-b-line flex items-center justify-between gap-3 text-[length:9px] text-muted py-4 px-5 [@media(width<=700px)]:min-h-[93px] [@media(width<=700px)]:justify-center [@media(width<=700px)]:flex-wrap"
          >
            <div
              class="flex gap-1.5 [@media(width<=700px)]:gap-1 [&_button]:text-[length:11px] [&_button]:border-0 [&_button]:bg-[transparent] [&_button]:text-muted [&_button]:rounded-[6px] [&_button]:py-2 [&_button]:px-2.5 [@media(width<=700px)]:[&_button]:text-[length:10px] [@media(700px<width<=1200px)]:[&_button]:text-[length:10px] [@media(700px<width<=1200px)]:[&_button]:px-2 [&_button.active]:bg-[#eaf0df] [&_button.active]:text-[#6c8357]"
            >
              <button
                v-for="tab in ['week', 'pantry', 'recipes'] as const"
                :key="tab"
                :class="{ active: view === tab }"
                :aria-pressed="view === tab"
                @click="view = tab"
              >
                {{ tab === 'week' ? 'The week' : tab === 'pantry' ? 'The pantry' : 'The recipes' }}
              </button>
            </div>
            <span>{{ menu.plan.length }}/14 meals</span>
          </div>
          <div
            class="flex-1 min-h-0 overflow-auto p-[25px] [@media(width<=700px)]:p-[19px] [@media(700px<width<=1200px)]:p-5"
          >
            <div v-if="view === 'week'">
              <div
                class="[&_[data-ui~=eyebrow]]:text-[length:8px] [&_h2]:text-[length:25px] [&_h2]:mt-3 [&_h2]:mb-[23px] [&_h2]:mx-0"
              >
                <p
                  data-ui="eyebrow"
                  class="text-[length:10px] font-[750] tracking-[1.8px] text-muted"
                >
                  A LITTLE PLAN, A LOT LESS GUESSING.
                </p>
                <h2>{{ menu.title }}</h2>
              </div>
              <div
                class="grid grid-cols-2 gap-3.5 [@media(width<=700px)]:grid-cols-[minmax(0,_1fr)]"
              >
                <section
                  v-for="(name, index) in days"
                  :key="name"
                  class="border border-solid border-line rounded-[10px] bg-[#fbfcf7] min-h-41.5 min-w-0 [&_>_header]:flex [&_>_header]:justify-between [&_>_header]:border-b [&_>_header]:[border-bottom-style:solid] [&_>_header]:border-b-line [&_>_header]:text-[length:10px] [&_>_header]:text-[#899478] [&_>_header]:py-[13px] [&_>_header]:px-[15px] [&_>_header_span]:text-[length:9px] [&_>_header_span]:text-[#bac4ab]"
                >
                  <header>
                    <strong>{{ name }}</strong
                    ><span>0{{ index + 1 }}</span>
                  </header>
                  <div class="p-[11px]">
                    <article
                      v-for="meal in menu.plan.filter((m) => m.day === index)"
                      :key="meal.id"
                      class="bg-[#edf2e4] border border-solid border-[#e1e8d6] rounded-[7px] mb-2 p-3 [&:last-child]:mb-0 [&_h3]:font-sans [&_h3]:text-[length:11px] [&_h3]:leading-[1.6] [&_h3]:tracking-[0] [&_h3]:mb-2 [&_h3]:wrap-anywhere [&_label]:text-[length:9px] [&_label]:flex [&_label]:items-center [&_label]:gap-2.5 [&_label]:mb-1.5 [&_label_input]:w-12.5! [&_label_input]:min-h-[27px]! [&_label_input]:text-[length:10px]! [&_label_input]:py-1! [&_label_input]:px-1.5! [&_label_input]:m-0!"
                      :data-meal-id="meal.id"
                    >
                      <h3>{{ menu.recipes.find((r) => r.id === meal.recipe)?.name }}</h3>
                      <label
                        >Servings<input
                          :value="meal.servings"
                          type="number"
                          min="1"
                          max="12"
                          @change="servings(meal.id, $event)"
                      /></label>
                      <div
                        class="flex justify-between items-center [&_[data-ui~=text-button]]:text-[length:9px] [&_[data-ui~=text-button]]:min-h-[27px] [&_[data-ui~=icon-button]]:w-[23px] [&_[data-ui~=icon-button]]:min-h-[23px] [&_[data-ui~=icon-button]]:h-[23px] [&_[data-ui~=icon-button]]:border-0 [&_[data-ui~=icon-button]]:text-[#9ba98b] [&_[data-ui~=icon-button]]:p-[3px]"
                      >
                        <button
                          data-ui="text-button"
                          class="inline-flex items-center justify-center gap-[9px] min-h-8 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-[transparent] text-muted py-[7px] px-0.5"
                          :disabled="
                            !canCook(
                              pantry.ingredients,
                              menu.recipes.find((r) => r.id === meal.recipe)!,
                              meal.servings,
                            )
                          "
                          @click="planner.cook(meal.id)"
                        >
                          <AppIcon name="check" :size="13" />Cooked</button
                        ><button
                          data-ui="icon-button"
                          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] w-9.5 bg-[transparent] p-2 [&:hover]:bg-hover"
                          :aria-label="`Remove ${menu.recipes.find((r) => r.id === meal.recipe)?.name} from ${name}`"
                          @click="
                            planner.commit('A little space left in the week.', (next) => {
                              next.plan = next.plan.filter((m) => m.id !== meal.id)
                            })
                          "
                        >
                          <AppIcon name="close" :size="13" />
                        </button>
                      </div>
                    </article>
                    <p
                      v-if="!menu.plan.some((m) => m.day === index)"
                      class="text-[#adb69f] text-[length:10px] leading-[1.8] p-3"
                    >
                      A little room for something good.
                    </p>
                  </div>
                </section>
              </div>
            </div>
            <div v-else-if="view === 'pantry'">
              <div
                class="flex justify-between items-center gap-[15px] mb-[25px] [@media(width<=700px)]:items-start [@media(width<=700px)]:flex-col [&_h2]:mt-3 [&_h2]:text-[length:24px] [&_[data-ui~=eyebrow]]:text-[length:8px] [&_[data-ui~=secondary]]:text-[length:10px] [&_[data-ui~=secondary]]:whitespace-nowrap [&_[data-ui~=secondary]]:py-2 [&_[data-ui~=secondary]]:px-2.5"
              >
                <div>
                  <p
                    data-ui="eyebrow"
                    class="text-[length:10px] font-[750] tracking-[1.8px] text-muted"
                  >
                    KNOW WHAT IS ON THE SHELF.
                  </p>
                  <h2>Your little pantry</h2>
                </div>
                <button
                  data-ui="secondary"
                  class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
                  :disabled="pantry.ingredients.length >= 20"
                  @click="ingredientDialog = true"
                >
                  <AppIcon name="plus" :size="15" />Add staple
                </button>
              </div>
              <div
                class="[&_>_label]:flex [&_>_label]:items-center [&_>_label]:gap-[15px] [&_>_label]:border-b [&_>_label]:[border-bottom-style:solid] [&_>_label]:border-b-line [&_>_label]:py-[17px] [&_>_label]:px-0 [&_>_label]:m-0 [@media(width<=700px)]:[&_>_label]:gap-[9px] [&_>_label_>_span:nth-child(2)]:flex-1 [&_>_label_>_span:nth-child(2)]:min-w-0 [&_>_label_>_span:nth-child(2)]:wrap-anywhere [&_>_label_>_span:nth-child(2)]:text-[length:12px] [@media(width<=700px)]:[&_>_label_>_span:nth-child(2)]:text-[length:11px] [&_small]:block [&_small]:text-[length:9px] [&_small]:font-normal [&_small]:text-muted [&_small]:mt-1.5 [@media(width<=700px)]:[&_small]:text-[length:8px] [&_input]:w-[77px]! [&_input]:text-[length:11px]! [&_input]:shrink-0 [&_input]:m-0! [@media(width<=700px)]:[&_input]:w-15.5! [&_b]:w-7 [&_b]:text-[length:10px] [&_b]:font-normal [&_b]:text-muted [@media(width<=700px)]:[&_b]:w-[23px] [@media(width<=700px)]:[&_b]:text-[length:9px]"
              >
                <label v-for="item in pantry.ingredients" :key="item.id"
                  ><span
                    class="grid place-items-center w-[37px] h-10.5 text-[#99ad7e] bg-[#edf2e3] rounded-[7px] text-[length:24px] shrink-0 [@media(width<=700px)]:w-7.5 [@media(width<=700px)]:h-9.5"
                    >{{ item.unit === 'g' ? '◒' : item.unit === 'ml' ? '◡' : '○' }}</span
                  ><span
                    >{{ item.name
                    }}<small>{{
                      item.unit === 'piece' ? 'Counted in pieces' : `Measured in ${item.unit}`
                    }}</small></span
                  ><input
                    :aria-label="`${item.name} stock`"
                    :value="item.quantity"
                    type="number"
                    min="0"
                    max="100000"
                    @change="stock(item.id, $event)"
                  /><b>{{ item.unit }}</b></label
                >
              </div>
              <p class="text-[length:11px] leading-[1.9] text-muted mt-6">
                Enter the amount you actually have. A cooked meal subtracts its ingredients and
                leaves your weekly plan.
              </p>
            </div>
            <div v-else>
              <div
                class="flex justify-between items-center gap-[15px] mb-[25px] [@media(width<=700px)]:items-start [@media(width<=700px)]:flex-col [&_h2]:mt-3 [&_h2]:text-[length:24px] [&_[data-ui~=eyebrow]]:text-[length:8px] [&_[data-ui~=secondary]]:text-[length:10px] [&_[data-ui~=secondary]]:whitespace-nowrap [&_[data-ui~=secondary]]:py-2 [&_[data-ui~=secondary]]:px-2.5"
              >
                <div>
                  <p
                    data-ui="eyebrow"
                    class="text-[length:10px] font-[750] tracking-[1.8px] text-muted"
                  >
                    LITTLE RECIPES, MADE YOUR OWN.
                  </p>
                  <h2>In your recipe book</h2>
                </div>
                <button
                  data-ui="secondary"
                  class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
                  :disabled="menu.recipes.length >= 12"
                  @click="editRecipe()"
                >
                  <AppIcon name="plus" :size="15" />New recipe
                </button>
              </div>
              <article
                v-for="recipe in menu.recipes"
                :key="recipe.id"
                class="border border-solid border-line rounded-[11px] mb-4.5 bg-[#fbfcf7] p-5 [@media(width<=700px)]:p-4 [&_header]:flex [&_header]:justify-between [&_header]:items-center [&_header]:gap-2.5 [&_h3]:text-[length:18px] [&_h3]:wrap-anywhere [&_[data-ui~=text-button]]:text-[length:10px] [&_p]:text-[length:10px] [&_p]:text-muted [&_p]:mt-[5px] [&_ul]:[list-style:none] [&_ul]:mt-4.5 [&_ul]:mb-0 [&_ul]:p-0 [&_ul]:mx-0 [&_li]:flex [&_li]:justify-between [&_li]:gap-[15px] [&_li]:text-[length:11px] [&_li]:border-t [&_li]:[border-top-style:solid] [&_li]:border-t-line [&_li]:py-[9px] [&_li]:px-0 [&_li_b]:text-[length:10px] [&_li_b]:font-normal [&_li_b]:text-muted [&_li_b]:whitespace-nowrap"
              >
                <header>
                  <h3>{{ recipe.name }}</h3>
                  <button
                    data-ui="text-button"
                    class="inline-flex items-center justify-center gap-[9px] min-h-8 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-[transparent] text-muted py-[7px] px-0.5"
                    :aria-label="`Edit ${recipe.name}`"
                    @click="editRecipe(recipe)"
                  >
                    Edit <AppIcon name="arrow" :size="14" />
                  </button>
                </header>
                <p>{{ recipe.baseServings }} base servings</p>
                <ul>
                  <li v-for="item in recipe.ingredients" :key="item.ingredient">
                    <span>{{ pantry.ingredients.find((i) => i.id === item.ingredient)?.name }}</span
                    ><b
                      >{{ item.quantity }}
                      {{ pantry.ingredients.find((i) => i.id === item.ingredient)?.unit }}</b
                    >
                  </li>
                </ul>
              </article>
            </div>
          </div>
          <div
            data-ui="canvas-footer"
            class="flex justify-between gap-3 border-t [border-top-style:solid] border-t-line text-[length:10px] text-muted py-[13px] px-5 [@media(width<=700px)]:flex-wrap"
          >
            <span>{{ marker }} / PANTRY STAMP</span
            ><span>{{ pantry.stockedItems }} stocked staples</span>
          </div>
        </section>
        <aside
          data-ui="panel"
          class="bg-surface border border-solid border-line rounded-[var(--radius)] min-w-0 h-207.5 flex flex-col p-[23px] [@media(width<=700px)]:h-[735px] [@media(width<=700px)]:[grid-column:auto] [@media(width<=700px)]:p-5 [@media(700px<width<=1000px)]:h-157.5 [@media(700px<width<=1000px)]:[grid-column:1/-1] [&_>_[data-ui~=primary]]:text-[length:11px]"
        >
          <div class="flex items-center justify-between gap-3 mb-2 [&_+_p]:mb-5">
            <h2>A little to pick up</h2>
            <span
              class="text-[length:10px] font-semibold bg-hover border border-solid border-line rounded-[6px] whitespace-nowrap py-1 px-[7px]"
              >{{ menu.missingItems }}</span
            >
          </div>
          <p data-ui="muted" class="text-muted text-[length:12px]">For the meals in your week.</p>
          <div
            data-ui="shopping-items"
            class="flex-1 min-h-0 overflow-auto mt-1 mb-[15px] mx-[-3px] [&_article]:flex [&_article]:items-start [&_article]:gap-2.5 [&_article]:border-b [&_article]:[border-bottom-style:solid] [&_article]:border-b-line [&_article]:py-[17px] [&_article]:px-0 [&_article_>_div]:flex-1 [&_article_>_div]:min-w-0 [&_strong]:text-[length:12px] [&_strong]:block [&_strong]:wrap-anywhere [&_small]:text-[length:8px] [&_small]:block [&_small]:mt-1.5 [&_small]:text-muted [&_b]:text-[length:10px] [&_b]:text-[#8b7961] [&_b]:font-medium [&_b]:whitespace-nowrap [&_.ready_b]:text-[#99aa85]"
          >
            <article
              v-for="item in menu.shopping"
              :key="item.id"
              :class="{ ready: item.missing === 0 }"
              :data-shopping-id="item.id"
            >
              <span class="text-[length:18px] text-[#aab890] leading-[1.2]">{{
                item.missing ? '○' : '✓'
              }}</span>
              <div>
                <strong>{{ item.name }}</strong
                ><small>{{ item.quantity }} on shelf / {{ item.required }} needed</small>
              </div>
              <b>{{ item.missing }} {{ item.unit }}</b>
            </article>
            <p v-if="!menu.shopping.length" class="text-muted text-[length:13px] text-center p-6">
              Plan a little meal to start your list.
            </p>
          </div>
          <div
            class="border-t [border-top-style:solid] border-t-line py-5 px-0 [&_>_span]:text-[length:28px] [&_>_span]:text-[#a8b996] [&_h3]:text-[length:20px] [&_h3]:leading-[1.4] [&_h3]:my-3 [&_h3]:mx-0 [&_p]:text-[length:10px] [&_p]:leading-[1.8] [&_p]:text-muted"
          >
            <span>↳</span>
            <h3>Buy what you need.<br />Use what you have.</h3>
            <p>Quantities round up to whole base units for each planned meal.</p>
          </div>
          <button
            data-ui="primary"
            class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent w-full py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
            :disabled="!menu.missingItems"
            @click="planner.stockMissing"
          >
            <AppIcon name="check" />Mark list as stocked
          </button>
        </aside>
      </div>
      <section
        class="h-[115px] border border-solid border-line rounded-[12px] mt-6 bg-[#fbfcf7] flex items-center justify-between gap-5 p-6 [@media(width<=700px)]:h-[185px] [@media(width<=700px)]:items-start [@media(width<=700px)]:justify-center [@media(width<=700px)]:flex-col [@media(width<=700px)]:p-5.5 [&_[data-ui~=eyebrow]]:text-[length:8px] [&_p]:text-[length:12px] [&_p]:mt-[11px] [&_p]:wrap-anywhere [@media(width<=700px)]:[&_p]:text-[length:11px] [@media(width<=700px)]:[&_p]:min-h-[35px]"
      >
        <div>
          <span data-ui="eyebrow" class="text-[length:10px] font-[750] tracking-[1.8px] text-muted"
            >A LITTLE ROOM TO CHANGE YOUR MIND.</span
          >
          <p role="status">{{ error || lastAction }}</p>
        </div>
        <div class="flex gap-[9px] shrink-0 [&_button]:text-[length:11px]">
          <button
            data-ui="secondary"
            class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
            :disabled="!past.length"
            @click="planner.undo"
          >
            <AppIcon name="back" :size="15" />Undo</button
          ><button
            data-ui="secondary"
            class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
            :disabled="!future.length"
            @click="planner.redo"
          >
            Redo <AppIcon name="arrow" :size="15" />
          </button>
        </div>
      </section>
      <footer
        data-ui="page-footer"
        class="flex justify-between gap-[15px] text-[length:9px] tracking-[1.3px] text-muted py-7.5 px-0 [@media(width<=700px)]:flex-col [@media(width<=700px)]:py-6 [&_>_span:first-child]:font-bold [&_>_span:first-child]:text-ink [&_[data-ui~=muted]]:font-normal [&_[data-ui~=muted]]:tracking-[0]"
      >
        <span>GOOD THINGS COME FROM A GOOD LITTLE PLAN.</span
        ><span>PANTRY PLANNER / PINIA / BY CODESCULPTOR</span>
      </footer>
    </main>
    <AppDialog v-model="exchange" title="Keep your good little week"
      ><p data-ui="muted" class="text-muted">
        PP/1 keeps pantry amounts, recipe quantities and the seven-day plan. Import is validated and
        can be undone.
      </p>
      <div
        class="flex flex-wrap gap-2.5 my-5 mx-0 [@media(width<=700px)]:[&_>_button]:flex-1 [@media(width<=700px)]:[&_>_button]:min-w-32.5"
      >
        <button
          data-ui="primary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
          @click="exportData"
        >
          Download workspace</button
        ><button
          data-ui="secondary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
          @click="download('shopping-list.csv', shoppingCSV(menu.shopping), 'text/csv')"
        >
          Download shopping CSV
        </button>
      </div>
      <label
        >Pantry JSON<textarea
          v-model="importText"
          rows="6"
          class="font-[family-name:ui-monospace,_monospace]! text-[length:12px]!"
          placeholder="Paste PP/1 JSON…"
        />
      </label>
      <p v-if="importError" class="text-danger" role="alert">{{ importError }}</p>
      <button
        data-ui="secondary"
        class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
        @click="importData"
      >
        Import pantry
      </button></AppDialog
    >
    <AppDialog v-model="ingredientDialog" title="A new little staple"
      ><label>Ingredient name<input v-model="itemName" maxlength="70" /></label>
      <div class="grid grid-cols-2 gap-3.5">
        <label
          >Unit<select v-model="itemUnit">
            <option value="g">Grams</option>
            <option value="ml">Milliliters</option>
            <option value="piece">Pieces</option>
          </select></label
        ><label
          >Initial stock<input v-model.number="itemQuantity" type="number" min="0" max="100000"
        /></label>
      </div>
      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <button
        data-ui="primary"
        class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
        @click="addIngredient"
      >
        Add to pantry
      </button></AppDialog
    >
    <AppDialog v-model="recipeDialog" title="A little recipe refinement"
      ><label>Recipe name<input v-model="editing.name" maxlength="70" /></label
      ><label
        >Base servings<input v-model.number="editing.baseServings" type="number" min="1" max="12"
      /></label>
      <div
        class="[&_>_div]:grid [&_>_div]:grid-cols-[minmax(0,_1fr)_90px_35px] [&_>_div]:items-center [&_>_div]:gap-3 [@media(width<=700px)]:[&_>_div]:grid-cols-[minmax(0,_1fr)_62px_29px] [@media(width<=700px)]:[&_>_div]:gap-[7px] [&_label]:min-w-0 [&_[data-ui~=icon-button]]:mt-1.5 [@media(width<=700px)]:[&_[data-ui~=icon-button]]:w-7 [&_select]:text-[length:11px] [@media(width<=700px)]:[&_select]:text-[length:10px] [@media(width<=700px)]:[&_select]:p-2"
      >
        <div v-for="(item, index) in editing.ingredients" :key="index">
          <label
            >Ingredient<select v-model="item.ingredient">
              <option
                v-for="ingredient in pantry.ingredients"
                :key="ingredient.id"
                :value="ingredient.id"
              >
                {{ ingredient.name }} ({{ ingredient.unit }})
              </option>
            </select></label
          ><label
            >Quantity<input
              v-model.number="item.quantity"
              type="number"
              min="1"
              max="10000" /></label
          ><button
            data-ui="icon-button"
            class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] w-9.5 bg-[transparent] p-2 [&:hover]:bg-hover"
            :disabled="editing.ingredients.length === 1"
            :aria-label="`Remove ingredient ${index + 1}`"
            @click="editing.ingredients.splice(index, 1)"
          >
            <AppIcon name="close" :size="14" />
          </button>
        </div>
      </div>
      <button
        data-ui="text-button"
        class="inline-flex items-center justify-center gap-[9px] min-h-8 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-[transparent] text-muted py-[7px] px-0.5"
        :disabled="editing.ingredients.length >= Math.min(12, pantry.ingredients.length)"
        @click="addRecipeIngredient"
      >
        <AppIcon name="plus" :size="14" />Add ingredient
      </button>
      <p v-if="editorError" class="text-danger" role="alert">{{ editorError }}</p>
      <div
        class="flex flex-wrap gap-2.5 my-5 mx-0 [@media(width<=700px)]:[&_>_button]:flex-1 [@media(width<=700px)]:[&_>_button]:min-w-32.5"
      >
        <button
          data-ui="primary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
          @click="saveRecipe"
        >
          Save recipe
        </button>
      </div></AppDialog
    >
    <AppDialog v-model="restore" title="Restore the starting shelf?"
      ><p>This replaces your pantry and weekly plan. You can undo the change.</p>
      <div
        class="flex flex-wrap gap-2.5 my-5 mx-0 [@media(width<=700px)]:[&_>_button]:flex-1 [@media(width<=700px)]:[&_>_button]:min-w-32.5"
      >
        <button
          data-ui="primary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-[transparent] [transition:background_0.15s] bg-accent text-on-accent py-2.5 px-[15px] [&:hover]:[filter:brightness(0.96)]"
          @click="restoreSample"
        >
          Restore sample</button
        ><button
          data-ui="secondary"
          class="inline-flex items-center justify-center gap-[9px] min-h-10 font-semibold leading-[1.3] rounded-[9px] border border-solid border-line [transition:background_0.15s] bg-surface text-ink py-2.5 px-[15px] [&:hover]:bg-hover"
          @click="restore = false"
        >
          Keep my pantry
        </button>
      </div></AppDialog
    >
  </div>
</template>
