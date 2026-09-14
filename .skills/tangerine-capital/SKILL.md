---
name: tangerine-capital
description: Tangerine Capital design system for the HxK ToolBox console. Defines the editorial-finance palette (tangerine, saffron, clay, ivory, parchment, ink, espresso), the Bricolage Grotesque / Inter / JetBrains Mono / MiSans type stack, the asymmetric ticket radius, mono figures, spark-mark motion and focus rings. Use when building or restyling the /auth page or any /dashboard/* page, when choosing colours, fonts, radii, shadows or motion for the console, or when asked to apply the Tangerine Capital look.
---

# Tangerine Capital

An editorial finance design system: oversized display type, warm tangerine surfaces,
cream-on-orange contrast, and magazine layout rhythm applied to a data console.

Four rules override everything else in this document.

1. **The `joinus` surface is out of scope.** `src/client/pages/joinus.astro`,
   `src/client/pages/joinus/apply.astro`, `src/client/layouts/JoinUsLayout.astro`
   and every stylesheet they import (`joinus.css`, `joinus-form.css`,
   `joinus-transitions.css`, `remixicon-local.css`, `shapegrid.css`, `clickspark.css`,
   `shuffle.css`, `shuffle-reactbits.css`, `folder.css`) serve the live
   `huaxiaoke.com` recruitment funnel. Never restyle them with this system.
2. **`src/client/styles/global.css` is frozen.** It is imported by `JoinUsLayout`,
   so adding tokens there leaks into the joinus bundle. The token layer lives in
   `tangerine.css`, imported only by `DashboardLayout.astro` and `auth.astro`.
3. **Background layers are frozen.** The auth page keeps the confirmed
   `assets/img/image/background.webp` behind the shared warm wash and its
   `body.auth-page::before` vignette; the `.dashboard-root::before` user
   background and its `::after` wash, and `DashboardBackground.tsx` are all off
   limits. Restyle the content above them, never the layers themselves.
4. **The dark left rail stays.** `dashboard.css` paints the navigation rail with
   `linear-gradient(165deg, var(--color-espresso), var(--color-ink))` and the
   `--rail-fg*` cream text tokens. Keep the rail dark; do not swap the console to
   a light sidebar, and do not add a hairline seam against the content - the soft
   `box-shadow` falloff is intentional.

## Where the system loads

| File | Role | Imported by |
| ---- | ---- | ----------- |
| `src/client/styles/tangerine-fonts.css` | `@font-face` declarations | `DashboardLayout.astro`, `auth.astro` |
| `src/client/styles/tangerine.css` | Tokens plus shared component primitives | `DashboardLayout.astro`, `auth.astro` |

Adding a new surface: import those two files, use the tokens, and leave
`global.css` and the joinus stylesheets alone.

Token names mirror the upstream kit vocabulary exactly, so component CSS from
[reference/components.md](reference/components.md) can be used verbatim.

## Colour tokens

Seven roles. Use the role, never a raw hex.

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-ivory` | `#fbf6ea` | Default card and panel surface |
| `--color-parchment` | `#f4ecd8` | Text and chips on ink, recessed surface |
| `--color-ink` | `#1a0e08` | Primary text, primary button fill, active tab fill |
| `--color-espresso` | `#3a2418` | Secondary text, metadata, labels, hairline base |
| `--color-tangerine` | `#e0521a` | Primary accent: active state, brand mark, emphasis figure |
| `--color-clay` | `#b33a0e` | Hover and pressed state for tangerine, dashed trigger underline |
| `--color-saffron` | `#f2c545` | Focus ring, status tag fill, tick, small highlight dots |

Derived values, expressed as tokens so the mixes stay consistent:

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-hairline` | `rgba(58, 36, 24, 0.18)` | Default 1px border on ivory surfaces |
| `--color-hairline-soft` | `rgba(58, 36, 24, 0.10)` | Track fills, dividers |
| `--color-hairline-strong` | `rgba(58, 36, 24, 0.20)` | Dashed separator in dense panels |
| `--color-placeholder` | `rgba(58, 36, 24, 0.55)` | Placeholder text on ivory and parchment |
| `--color-tangerine-tint` | `rgba(224, 82, 26, 0.14)` | Chip background for tangerine-on-ivory |
| `--color-tangerine-line` | `rgba(224, 82, 26, 0.35)` | Tangerine chip and outline border |
| `--color-parchment-muted` | `rgba(244, 236, 216, 0.70)` | Fine print on ink surfaces |
| `--color-saffron-hover` | `#e9b832` | Saffron button hover |
| `--color-positive` | `#1f6b3d` | Upward delta indicator |
| `--wash-tint` | three warm scrim layers | Shared wash over the auth and dashboard backgrounds, so both surfaces read as one |

Semantic tints, so status chips never invent a hue:

| Token | Value | Role |
| ----- | ----- | ---- |
| `--color-positive-tint` | `rgba(31, 107, 61, 0.12)` | Success chip fill |
| `--color-positive-line` | `rgba(31, 107, 61, 0.35)` | Success chip border |
| `--color-clay-tint` | `rgba(179, 58, 14, 0.12)` | Danger chip fill |
| `--color-saffron-tint` | `rgba(242, 197, 69, 0.22)` | Warning chip fill, search hit |

Map semantic state onto roles, not new colours: success → `--color-positive`,
danger → `--color-clay`, warning → `--color-saffron`, neutral →
`--color-hairline-soft`, brand → `--color-tangerine-tint`.

Contrast: ink on ivory and parchment on ink both clear 4.5:1. Tangerine is a
surface colour and a large-figure colour; do not set body copy in tangerine on
ivory. Saffron is a fill and a ring, never a text colour.

## Typography

| Token | Stack | Use |
| ----- | ----- | --- |
| `--font-display` | `'Bricolage Grotesque', 'MiSans', sans-serif` | Card titles, section names, dialog headings |
| `--font-body` | `'Inter', 'MiSans', sans-serif` | Everything else |
| `--font-mono` | `'JetBrains Mono', 'MiSans', ui-monospace, monospace` | Figures, money, dates, counts, IDs, tabular data |

`MiSans` is the Chinese fallback and also picks up any glyph the Latin faces
lack. It is subset from the official Xiaomi variable font and self-hosted as
`tangerine/misans-sc-var.woff2`; regenerate it with `bun run subset-fonts`.
MiSans is free for commercial use under the Xiaomi licence, which requires
attribution and forbids redistributing the font on its own - keep
`tangerine/MiSans-LICENSE.txt` alongside the asset. Never hardcode a family
outside these tokens: the console carries Chinese data labels and mixed-script
rows, and an unqualified `sans-serif` will drop the Latin faces on those rows.

`HFIntimate` is a Latin display face used for exactly one element: the
handwritten `.auth-brand-note` line on the auth masthead. It is declared in
`tangerine-fonts.css`, preloaded only by `auth.astro`, sized with
`clamp(1.25rem, 1.9vw, 1.75rem)` so it scales with the viewport, and it is not a
type token. Do not spread it beyond that paragraph.

Type scale:

| Step | Size | Weight | Tracking | Notes |
| ---- | ---- | ------ | -------- | ----- |
| Stat figure | `2.75rem` – `3.25rem` | 700 | `-0.04em` | Mono, `line-height: 0.95` |
| Display heading | `1.5rem` | 800 | `-0.02em` | Display face |
| Panel title | `1.125rem` | 700 | `-0.01em` | Display face |
| Body | `0.9375rem` | 400–500 | normal | Body face |
| Meta | `0.8125rem` | 500–600 | `-0.01em` | Mono when numeric |
| Eyebrow / label | `0.75rem` | 600 | `0.14em`, uppercase | Espresso |
| Tag / chip | `0.6875rem` | 600 | `0.05em` | Mono, pill |

Editorial eyebrow: the uppercase espresso label above a figure or field is the
signature move of this system. Reach for it before reaching for a bigger heading.

Numbers are always mono with negative tracking. This is what makes the console
read as editorial finance rather than as a generic dashboard.

## Shape

| Token | Value | Use |
| ----- | ----- | --- |
| `--radius-pill` | `999px` | Buttons, tabs, chips, tags, spinners |
| `--radius-ticket` | `28px 8px 28px 8px` | Feature cards: the asymmetric ticket |
| `--radius-panel` | `24px` | Standard panels and popovers |
| `--radius-card` | `18px` | Option rows, dense list cards |
| `--radius-field` | `20px` | Input fields |
| `--radius-chip` | `12px` | Inline chips |
| `--radius-box` | `6px` | Checkbox boxes, legend swatches |

The asymmetric ticket radius is the system's most recognisable shape. Use it on
at most one card per view; repeated, it stops reading as intentional.

Elevation is warm, never neutral grey:

- `--shadow-card`: `0 14px 36px rgba(40, 18, 6, 0.18)`
- `--shadow-panel`: `0 16px 40px rgba(58, 36, 24, 0.18)`

## Motion

One easing curve for the whole system: `cubic-bezier(0.22, 0.61, 0.36, 1)`,
exposed as `--ease-editorial`.

| Transition | Token | Duration |
| ---------- | ----- | -------- |
| Colour, border, background | `--duration-color` | `180ms` |
| Press offset (`translateY(1px)`) | `--duration-press` | `140ms` |
| Spark-mark rotation | `--duration-mark` | `600ms` |

The four-point spark glyph is the brand mark. In the shipped layer it survives in
exactly one place: `.tc-spinner` (`.tc-spinner__spark`), where it rests at
`rotate(-14deg)` and turns to between `14deg` and `18deg`. It was removed from
buttons, tabs and tooltips - do not reintroduce it there.

Always honour `prefers-reduced-motion`: stop the spinner rotation, the spark tilt
and the dot pulse, keep the colour transitions.

## Focus

Every interactive element carries a 2px ring with no offset:

- `box-shadow: 0 0 0 2px var(--color-saffron)` on light surfaces
- `box-shadow: 0 0 0 2px var(--color-ink)` on saffron surfaces

Set `outline: none` only when the ring is present. Never remove the ring without
replacing it.

## Component primitives

`tangerine.css` ships these as reusable classes. The full upstream markup and CSS
for the original twelve elements is in
[reference/components.md](reference/components.md) - consult it for the exact
structure before inventing a variant.

| Class | Base | Used for |
| ----- | ---- | -------- |
| `.tc-btn-primary` | Ink pill, parchment label, arrow glyph | Primary action |
| `.tc-btn-accent` | Saffron pill, ink label | Confirming CTA |
| `.tc-btn-ghost` | Ivory pill, ink border | Secondary action |
| `.tc-field` | Ivory pill field, espresso border | Text and search input |
| `.tc-field-amount` | Field with tangerine chip prefix | Numeric input |
| `.tc-check` | Ivory row, ink box, saffron tick | Task and filter checkboxes |
| `.tc-radio-card` | Ivory row, tangerine dot | Single-choice option rows |
| `.tc-tabs` | Ivory pill strip, ink active pill | View and filter switching |
| `.tc-ticket` | Ivory card, asymmetric radius, mono figure | Statistic cards |
| `.tc-panel` | Ivory panel, hairline, 24px radius | List and detail containers |
| `.tc-alloc` | Segmented bar plus mono legend | Distribution and progress summaries |
| `.tc-spinner` | Ivory pill, rotating spark, mono label | Loading states |
| `.tc-tip` | Ghost trigger, ivory popover | Field and metric explanations |
| `.tc-page` | Page grid plus editorial rhythm | Root of every `/dashboard/*` page |
| `.tc-page-head` | Eyebrow + display title + action slot | One page header per view |
| `.tc-section` | Ivory panel with `__head` / `__body` | Grouping card |
| `.tc-toolbar` | Flex row for filters and actions | Above a list |
| `.tc-empty` | Dashed parchment empty state | Zero-data states |
| `.tc-pill` | Token-tinted status chip | Status badges (`--brand`/`--positive`/`--danger`/`--warning`/`--neutral`) |

## Composition rules

- Group content in ivory panels over the tangerine page wash. Do not put ivory on
  ivory without a hairline between them.
- One primary action per view. Saffron is for the confirming action of a form,
  never for a destructive one.
- Figures lead, labels follow. A statistic card reads: eyebrow, mono figure,
  delta, caption - in that order.
- Keep a single hairline weight (`1px`) and a single border colour role.
- Prefer the segmented allocation bar over a chart for any breakdown that is
  static or has five or fewer categories.
- Destructive actions use ink-on-ivory with a clay hover; they never use saffron.

## Name watermark

`UserNameWatermark.tsx` renders a Feishu-style tiled overlay inside
`.dashboard-main` on every dashboard page. It reads the identity from
`fetchUsersMeDeduped()` / `getCachedMe()` and the `hxk:profile-updated` event,
then paints `nickname · YYYY-MM-DD` from an escaped inline SVG data URI
(`background-repeat: repeat`, rotated `-20deg`, about 6% opacity).

- Scope: dashboard only. Never mount it on auth (there is no identity there) or
  on the joinus funnel.
- Layering: `.dash-watermark` sits at `z-index: 0` inside `.dashboard-main`.
  That element is a stacking context, so `DashboardTopBar` (`z-index: 10`) and
  the fixed page modals (`z-index: 80`-`3000`) still paint above it. Keep the
  watermark below every modal.
- Interaction: always `pointer-events: none`, `user-select: none` and
  `aria-hidden="true"`. It carries no accessible text.

## Do not

- Do not import these tokens into `global.css` or any joinus stylesheet.
- Do not hardcode hex values; add a token if a new role is genuinely needed.
- Do not reuse the asymmetric ticket radius on more than one card per view.
- Do not set body copy in tangerine or saffron.
- Do not add a second easing curve or a second focus-ring colour.
- Do not reintroduce the spark glyph outside `.tc-spinner`.
- Do not introduce a component library; the primitives above are plain CSS.
- Do not mount the name watermark outside the dashboard, and never raise it
  above the modals.

## Example

```html
<article class="tc-ticket">
  <div class="tc-ticket__row">
    <span class="tc-ticket__eyebrow">Pending review</span>
    <span class="tc-ticket__tag">APPLY</span>
  </div>
  <div class="tc-ticket__fig">128</div>
  <p class="tc-ticket__caption">Submissions awaiting a first pass.</p>
</article>
```
