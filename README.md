<div align="center">

# ◒ Pantry Planner

**Good meals start with what you have.**

![Vue](https://img.shields.io/badge/Vue-3-42b883?style=for-the-badge&logo=vuedotjs&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=ffffff)
![License](https://img.shields.io/badge/License-MIT-718d5d?style=for-the-badge)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

_Vue and Pinia pantry planner with editable recipes, weekly servings, reactive shopping shortages, stock consumption, undo/redo, and JSON/CSV exports._

</div>

---

## ✨ Highlights

- **Pantry & Recipes:** Keep up to 20 pantry staples and 12 editable recipes.
- **Weekly Planning:** Plan up to 14 meals across seven days and adjust their servings.
- **Reactive Shopping:** Calculate whole-unit shopping shortages from pantry amounts and every planned meal.
- **Stock Actions:** Mark the shopping list as stocked; record cooking to consume ingredients and remove the meal.
- **History & Exports:** Undo or redo changes, import/export PP/1 workspaces, and download the shopping list as CSV.
- **Local Workspace:** Validated device-local persistence and imports that preserve the current workspace on failure.
- **Project Identity:** Original favicon and social artwork, CodeSculptor attribution, and deterministic configuration stamps.

## 🧱 Project Structure

```text
public/
|-- favicon.svg                                   # Original project favicon
|-- og.svg                                        # Original social artwork
`-- sample-workspace.json                         # Complete importable sample
src/
|-- components/
|   |-- AppDialog.vue                             # Teleport native dialog and focus lifecycle
|   `-- AppIcon.vue                               # Inline SVG interface icons
|-- composables/
|   `-- usePlanner.ts                             # Validated actions, undo/redo, and persistence
|-- domain/
|   `-- pantry.ts                                 # PP/1 validation, meal arithmetic, and CSV export
|-- services/
|   `-- files.ts                                  # Downloads, cloning, and identity stamps
|-- stores/
|   `-- pantry.ts                                 # Linked Pinia inventory and menu stores
|-- App.vue                                       # Workspace, controls, and data exchange
|-- base.css                                      # Tailwind theme and native element defaults
|-- main.ts                                       # Vue application entry
`-- style.css                                     # Brand tokens and domain-specific styles
tests/
|-- e2e/
|   `-- pantry.spec.ts
`-- pantry.test.ts
index.html                         # English metadata and application mount
package.json                       # Local dependencies and npm commands
playwright.config.ts               # Production browser workflows
vite.config.ts                     # Vue and Tailwind plugins
vercel.json                        # Explicit routes, caching, and headers
```

## 🛠️ Tech Stack

Vue 3, TypeScript 6, Vite 8, and Tailwind CSS 4. Locally bundled DM Sans and Bricolage Grotesque fonts. Prettier for formatting, Node's test runner for domain/export checks, and Playwright for production browser workflows. Dependencies are installed inside this project.

Pinia 4 links inventory and menu stores through getters, grouped patches, and subscriptions owned by the planner scope.

## 🎨 Tailwind Styling

The application uses Tailwind CSS 4 utilities directly in Vue templates for layout, spacing, typography, borders, colors, and visible states. Responsive and selector variants preserve the existing desktop and narrow-screen layouts. Utility names are complete source strings that Tailwind can detect during the Vite build.

`src/base.css` defines the font and spacing theme, maps project colors through `@theme inline`, and uses `@apply` for native element defaults. `src/style.css` holds the original brand tokens and any remaining domain-specific rules. Dynamic classes express Vue states, while explicit `data-ui` attributes identify elements used by descendant utilities or browser tests. Unused class names are removed. The spacing unit is `4px` to preserve the original pixel measurements independently of the root font size.

Store state remains in Pinia; selected items, panels, and narrow-screen layouts use utility variants.

## 📦 Included Demo Data

`public/sample-workspace.json` is a complete importable PP/1 sample. Defaults also live in the domain module, so startup does not depend on a fetch. Import uses the same validation as saved drafts and preserves your workspace on failure. The parser reconstructs known fields; unknown metadata is ignored.

The sample includes six pantry staples, three editable recipes, and three planned meals. Quantities are planning examples in integer g, ml, or pieces; undo history lasts only for the current session.

## 🚀 Local Development

Requires Node.js 24 or later.

```bash
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally `http://localhost:5173`. To serve the production build:

```bash
npm run build
npm run preview
```

## ◈ Vue Implementation

Two Pinia stores own inventory and recipes/menu. The menu's shopping getter reads the inventory store, so stock and servings drive the same reactive calculation. Validated actions apply grouped `$patch` updates; a planner keeps snapshots for undo/redo. Each store's `$subscribe` runs after updates and persists a complete validated workspace. Scope disposal unsubscribes both watchers.

References: [Pinia state, patches and subscriptions](https://pinia.vuejs.org/core-concepts/state.html), [actions](https://pinia.vuejs.org/core-concepts/actions.html).

## 💾 Local Drafts & Data Exchange

Validated operations save complete Pinia snapshots to localStorage on this device. Invalid operations preserve both stores. Storage failures appear in the desktop header; corrupted data restores the sample. Restore asks for confirmation and can be undone. Export before clearing browser storage or switching devices.

## ◈ Project Markers

Exports identify `vue-pantry-planner`, CodeSculptor, and a deterministic `PP-XXXXXXXX` checksum. The same configuration produces the same stamp. This is an identity aid, not a cryptographic signature or uniqueness guarantee. It adds no tracking requests.

## 🔌 Extension Notes & Nuances

Ingredients use integer base quantities in g, ml, or pieces. Recipe amounts describe the declared base servings. The planner scales each recipe to its planned servings and rounds each ingredient up per meal; shopping and cooking use the same rule. No unit conversion or dietary advice is provided. The starter recipes are editable planning examples.

Cooked subtracts a meal's ingredients and removes that meal from the week. It is disabled until the pantry covers that meal. Mark list as stocked adds the current shortages to inventory and records a local stock update; it does not order groceries. Editing recipe quantities affects every future meal that references that recipe.

Undo stores the previous 30 complete workspaces, including imports and sample restoration. A new action after undo clears redo. History lasts for the current session; inventory, recipes and the plan persist. Invalid operations leave both stores unchanged. CSV includes needed, stocked and missing quantities, quotes ingredient names and treats formula-like names as literal text.

Panels reserve space across selections, modes, and loading states. Larger content scrolls inside the panel. The layout supports 320 px screens and reduced motion. Original visual assets are SVG; convert the social artwork to PNG for services that require a raster image.

## 🧪 Build & Checks

```bash
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests exercise real linked Pinia stores, complete persistence, cleanup, cooking and shopping arithmetic, undo/redo, recipes, CSV exports, imports, and responsive stability. Browser tests use the production build. Export artifacts and browser traces are ignored by Git.

## 🌐 Pages & Vercel Deployment

- `/` — application workspace
- `/sample-workspace.json` — importable PP/1 fixture

Import this directory as the Vercel project root. The explicit configuration uses the Vite preset, `npm ci`, `npm run build`, and `dist`. The custom development command forwards `$PORT` to Vite with `--strictPort`.

- `/` serves the app; `/index.html` permanently redirects to `/`.
- Trailing slashes are removed; there is no catch-all rewrite.
- HTML, sample JSON, icons, and social artwork require revalidation.
- Content-hashed JS, CSS, and fonts in `/assets/` receive a one-year immutable cache policy.
- Responses include `X-Content-Type-Options: nosniff` and a referrer policy.
- Static files retain their original paths. Missing files do not fall back to HTML.

Vite preview does not emulate Vercel routing or headers. Schema validation and local route evaluation do not replace HTTP checks against an actual deployment.

## 📄 License

MIT License. See [LICENSE](./LICENSE).
