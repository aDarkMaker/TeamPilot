# Tangerine Capital - Component Source Reference

Verbatim extraction of the 12 UI elements from the
[Tangerine Capital](https://uiverse.io/ui-kits/tangerine-capital) kit on Uiverse,
published by `uiverse-astronaut` under the MIT License.

Each entry keeps the upstream markup and CSS unchanged so the DOM contract and
class names stay recognisable. Two edits are applied consistently:

- The upstream `@import url(...)` font lines are omitted. Uiverse serves them
  through a sanitizer that rewrites them into invalid URLs (`s://fonts.googleapis.com`,
  `://fonts.googleapis.com`). Fonts are supplied by the local `@font-face` layer
  described in `SKILL.md` instead.
- Nothing else is touched: selectors, values, easing curves and comments are as authored.

Shipped subset: `src/client/styles/tangerine.css` re-implements this kit as the
smaller `tc-*` primitive set listed in [../SKILL.md](../SKILL.md), and it is the
source of truth for what actually renders. Three upstream elements are not
shipped because the console dropped the spark brand glyph from them: the
`.tc-saffron-btn` reserved seat (row 2), the `.tc-tabs__spark` mark on `.tc-tabs`
(row 9) and the standalone `.tc-spark` glyph. The only spark left in the shipped
layer is `.tc-spinner__spark`. Read this file for upstream structure, then check
`tangerine.css` before assuming a class exists.

All components consume the same CSS custom properties. The complete token set is
documented in [../SKILL.md](../SKILL.md).

| # | Component | Upstream category | Root class |
| - | --------- | ----------------- | ---------- |
| 1 | Ink pill primary button | Button | `.tc-pill-btn` |
| 2 | Saffron sparkle reserve button (not shipped) | Button | `.tc-saffron-btn` |
| 3 | Saffron tick checkbox | Checkbox | `.tc-check` |
| 4 | Time horizon radio cards | Radio | `.tc-horizon` |
| 5 | USD subscription amount input | Input | `.tc-amt` |
| 6 | Annual letter newsletter form | Form | `.tc-news` |
| 7 | Allocation ticket card | Card | `.tc-ticket` |
| 8 | Allocator subscription plan card | Card | `.tc-plan` |
| 9 | Pill tabs with spark mark (mark not shipped) | Pattern | `.tc-tabs` |
| 10 | Portfolio allocation bar with legend | Pattern | `.tc-alloc` |
| 11 | Spark spinner loader | Loader | `.tc-spinner` |
| 12 | Editorial term tooltip | Tooltip | `.tc-tip` |

---

## 1. Ink pill primary button

Source: https://uiverse.io/uiverse-astronaut/sour-insect-80

"Ink-filled pill with a parchment label and an arrow glyph. Clay hover, saffron focus ring."

Tokens: `--font-body`, `--color-ink`, `--color-parchment`, `--color-clay`, `--color-saffron`

```html
<button class="tc-pill-btn" type="button">
  Open account
  <svg class="tc-pill-btn__icon" viewBox="0 0 256 256" aria-hidden="true">
    <path
      d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"
    ></path>
  </svg>
</button>
```

```css
.tc-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  padding: 0 26px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.005em;
  line-height: 1;
  border-radius: 999px;
  border: 1.5px solid var(--color-ink, #1a0e08);
  background: var(--color-ink, #1a0e08);
  color: var(--color-parchment, #f4ecd8);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 140ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-pill-btn:hover {
  background: var(--color-clay, #b33a0e);
  border-color: var(--color-clay, #b33a0e);
}

.tc-pill-btn:active {
  transform: translateY(1px);
}

.tc-pill-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-pill-btn__icon {
  width: 18px;
  height: 18px;
  display: block;
  fill: currentColor;
  transition: transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-pill-btn:hover .tc-pill-btn__icon {
  transform: translate(2px, -2px);
}
```

---

## 2. Saffron sparkle reserve button

Source: https://uiverse.io/uiverse-astronaut/splendid-squid-48

"Saffron pill carrying a tilted four-point spark mark that rotates lazily on hover. Ink label at 700 weight, ink focus ring."

Tokens: `--font-body`, `--color-saffron`, `--color-ink`

```html
<button class="tc-saffron-btn" type="button">
  Reserve allocation
  <span class="tc-saffron-btn__mark" aria-hidden="true">
    <svg viewBox="0 0 392.94 418.13">
      <path
        d="M243.7,418.13C198.37,312.3,118.14,268.5,0,294.73,135.19,238.54,203.38,148.99,149.24,0c49.45,103.91,130.68,145.05,243.7,123.4-127.69,63.18-168.91,165.26-149.24,294.73Z"
      ></path>
    </svg>
  </span>
</button>
```

```css
.tc-saffron-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 52px;
  padding: 0 28px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.005em;
  line-height: 1;
  border-radius: 999px;
  border: 1.5px solid var(--color-saffron, #f2c545);
  background: var(--color-saffron, #f2c545);
  color: var(--color-ink, #1a0e08);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 140ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-saffron-btn:hover {
  background: #e9b832;
  border-color: #e9b832;
}

.tc-saffron-btn:active {
  transform: translateY(1px);
}

.tc-saffron-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ink, #1a0e08);
}

.tc-saffron-btn__mark {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  color: var(--color-ink, #1a0e08);
  transform: rotate(-14deg);
  transition: transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-saffron-btn__mark svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  display: block;
}

.tc-saffron-btn:hover .tc-saffron-btn__mark {
  transform: rotate(18deg);
}
```

---

## 3. Saffron tick checkbox

Source: https://uiverse.io/uiverse-astronaut/popular-lizard-58

"Square checkbox with a hand-cut saffron tick over an ink fill. Ivory surface at rest, ink border."

Tokens: `--font-body`, `--font-mono`, `--color-ivory`, `--color-ink`, `--color-saffron`, `--color-espresso`

```html
<label class="tc-check">
  <input class="tc-check__input" type="checkbox" checked="" />
  <span class="tc-check__box" aria-hidden="true"></span>
  <span class="tc-check__label">Hedge currency to base USD</span>
  <span class="tc-check__meta">12 bp</span>
</label>
```

```css
.tc-check {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 16px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 0.9375rem;
  color: var(--color-ink, #1a0e08);
  cursor: pointer;
  user-select: none;
  min-width: 280px;
  transition: border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-check:hover {
  border-color: var(--color-ink, #1a0e08);
}

.tc-check__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.tc-check__box {
  flex-shrink: 0;
  display: inline-grid;
  place-content: center;
  width: 22px;
  height: 22px;
  background: var(--color-ivory, #fbf6ea);
  border: 1.5px solid var(--color-ink, #1a0e08);
  border-radius: 6px;
  transition:
    background 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-check__box::before {
  content: "";
  width: 13px;
  height: 13px;
  background: var(--color-saffron, #f2c545);
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0, 43% 62%);
  transform: scale(0);
  transition: transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-check__input:checked + .tc-check__box {
  background: var(--color-ink, #1a0e08);
  border-color: var(--color-ink, #1a0e08);
}

.tc-check__input:checked + .tc-check__box::before {
  transform: scale(1);
}

.tc-check__input:focus-visible + .tc-check__box {
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-check__label {
  font-weight: 500;
}

.tc-check__meta {
  margin-left: auto;
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--color-espresso, #3a2418);
  letter-spacing: -0.01em;
}
```

---

## 4. Time horizon radio cards

Source: https://uiverse.io/uiverse-astronaut/lucky-dodo-72

"Stacked radio cards on ivory. Active dot fills tangerine, mono meta value on the right, display face carries the option title."

Tokens: `--font-body`, `--font-display`, `--font-mono`, `--color-ivory`, `--color-espresso`, `--color-ink`, `--color-tangerine`, `--color-saffron`

```html
<fieldset class="tc-horizon">
  <legend class="tc-horizon__legend">Time horizon</legend>
  <label class="tc-horizon__opt">
    <input class="tc-horizon__input" type="radio" name="tc-horizon" />
    <span class="tc-horizon__dot" aria-hidden="true"></span>
    <span class="tc-horizon__title">Charter</span>
    <span class="tc-horizon__meta">10 yr</span>
  </label>
  <label class="tc-horizon__opt">
    <input
      class="tc-horizon__input"
      type="radio"
      name="tc-horizon"
      checked=""
    />
    <span class="tc-horizon__dot" aria-hidden="true"></span>
    <span class="tc-horizon__title">Patient</span>
    <span class="tc-horizon__meta">20 yr</span>
  </label>
  <label class="tc-horizon__opt">
    <input class="tc-horizon__input" type="radio" name="tc-horizon" />
    <span class="tc-horizon__dot" aria-hidden="true"></span>
    <span class="tc-horizon__title">Founder</span>
    <span class="tc-horizon__meta">30 yr</span>
  </label>
</fieldset>
```

```css
.tc-horizon {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 320px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}

.tc-horizon__legend {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-espresso, #3a2418);
  margin-bottom: 6px;
  padding: 0;
}

.tc-horizon__opt {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 18px;
  cursor: pointer;
  transition:
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-horizon__opt:hover {
  border-color: var(--color-ink, #1a0e08);
}

.tc-horizon__opt:has(.tc-horizon__input:checked) {
  border-color: var(--color-ink, #1a0e08);
  box-shadow: 0 1px 0 rgba(58, 36, 24, 0.08);
}

.tc-horizon__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.tc-horizon__dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--color-ink, #1a0e08);
  background: transparent;
  display: inline-grid;
  place-content: center;
  transition: background 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-horizon__dot::before {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-tangerine, #e0521a);
  transform: scale(0);
  transition: transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-horizon__input:checked ~ .tc-horizon__dot::before {
  transform: scale(1);
}

.tc-horizon__input:focus-visible ~ .tc-horizon__dot {
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-horizon__title {
  font-family: var(--font-display, "Bricolage Grotesque", "Inter", sans-serif);
  font-weight: 700;
  font-size: 1.0625rem;
  letter-spacing: -0.01em;
  color: var(--color-ink, #1a0e08);
}

.tc-horizon__meta {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 500;
  font-size: 0.8125rem;
  color: var(--color-espresso, #3a2418);
  letter-spacing: -0.01em;
}
```

---

## 5. USD subscription amount input

Source: https://uiverse.io/uiverse-astronaut/tough-newt-23

"Pill-style input with a tangerine USD chip prefix and mono digits. Saffron focus ring shifts the border to tangerine."

Tokens: `--font-body`, `--font-mono`, `--color-ivory`, `--color-espresso`, `--color-tangerine`, `--color-saffron`, `--color-ink`

```html
<div class="tc-amt">
  <label class="tc-amt__label" for="tc-amt-input">Subscription amount</label>
  <div class="tc-amt__field">
    <span class="tc-amt__chip">USD</span>
    <input
      id="tc-amt-input"
      class="tc-amt__input"
      type="text"
      inputmode="decimal"
      value="250,000"
    />
    <span class="tc-amt__suffix">/ year</span>
  </div>
</div>
```

```css
.tc-amt {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  min-width: 360px;
}

.tc-amt__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-espresso, #3a2418);
}

.tc-amt__field {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 60px;
  padding: 0 6px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid var(--color-espresso, #3a2418);
  border-radius: 20px;
  transition:
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-amt__field:focus-within {
  border-color: var(--color-tangerine, #e0521a);
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-amt__chip {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 14px;
  background: rgba(224, 82, 26, 0.14);
  color: var(--color-tangerine, #e0521a);
  border-radius: 12px;
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 0.9375rem;
  letter-spacing: 0.02em;
}

.tc-amt__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-ink, #1a0e08);
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.tc-amt__input::placeholder {
  color: rgba(58, 36, 24, 0.55);
}

.tc-amt__suffix {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-espresso, #3a2418);
  padding-right: 16px;
}
```

---

## 6. Annual letter newsletter form

Source: https://uiverse.io/uiverse-astronaut/new-quail-49

"Parchment pill input pinned over an ink slab. Tangerine submit button with a tilted paper-plane glyph and a fine-print note below."

Tokens: `--font-body`, `--color-ink`, `--color-parchment`, `--color-tangerine`, `--color-clay`, `--color-saffron`

```html
<div class="tc-news">
  <form class="tc-news__form">
    <input
      class="tc-news__input"
      type="email"
      placeholder="you@allocator.com"
      aria-label="Email"
    />
    <button class="tc-news__submit" type="submit">
      Subscribe
      <svg class="tc-news__icon" viewBox="0 0 256 256" aria-hidden="true">
        <path
          d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.36,84.93A15.93,15.93,0,0,0,157.74,248c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,14.31-11.51l58.2-191.94,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"
        ></path>
      </svg>
    </button>
  </form>
  <p class="tc-news__note">
    Two letters a year. Unsubscribe in one line. We never sell the list, written
    into the partnership.
  </p>
</div>
```

```css
.tc-news {
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  max-width: 480px;
  width: 100%;
  padding: 28px;
  background: var(--color-ink, #1a0e08);
  color: var(--color-parchment, #f4ecd8);
  border-radius: 28px;
}

.tc-news__form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: var(--color-parchment, #f4ecd8);
  border-radius: 999px;
}

.tc-news__input {
  flex: 1;
  min-width: 0;
  height: 52px;
  padding: 0 18px;
  border: 0;
  outline: 0;
  background: transparent;
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--color-ink, #1a0e08);
}

.tc-news__input::placeholder {
  color: rgba(58, 36, 24, 0.55);
}

.tc-news__submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 22px;
  border: 0;
  background: var(--color-tangerine, #e0521a);
  color: var(--color-parchment, #f4ecd8);
  font-family: inherit;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-news__submit:hover {
  background: var(--color-clay, #b33a0e);
}

.tc-news__submit:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-news__icon {
  width: 16px;
  height: 16px;
  display: block;
  fill: currentColor;
  transform: rotate(-12deg);
}

.tc-news__note {
  margin: 14px 4px 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: rgba(244, 236, 216, 0.7);
}
```

---

## 7. Allocation ticket card

Source: https://uiverse.io/uiverse-astronaut/horrible-skunk-27

"Asymmetric ivory ticket card sitting over tangerine. Mono figure, upward delta indicator, and an ink ticker tag for a real-asset sleeve."

Tokens: `--font-body`, `--font-mono`, `--color-ivory`, `--color-ink`, `--color-parchment`, `--color-espresso`

```html
<article class="tc-ticket">
  <div class="tc-ticket__row">
    <span class="tc-ticket__eyebrow">Real Asset sleeve</span>
    <span class="tc-ticket__tag">TC.REAL</span>
  </div>
  <div class="tc-ticket__fig">$612M</div>
  <div class="tc-ticket__delta">
    <svg viewBox="0 0 256 256" aria-hidden="true">
      <path
        d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"
      ></path>
    </svg>
    +7.4% stabilised yield
  </div>
  <p class="tc-ticket__caption">
    14-asset light-industrial folio on 25-year inflation-linked ground leases.
  </p>
</article>
```

```css
.tc-ticket {
  width: 320px;
  background: var(--color-ivory, #fbf6ea);
  color: var(--color-ink, #1a0e08);
  border-radius: 28px 8px 28px 8px;
  padding: 22px 24px;
  box-shadow: 0 14px 36px rgba(40, 18, 6, 0.18);
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}

.tc-ticket__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tc-ticket__eyebrow {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-espresso, #3a2418);
}

.tc-ticket__tag {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 600;
  font-size: 0.6875rem;
  background: var(--color-ink, #1a0e08);
  color: var(--color-parchment, #f4ecd8);
  padding: 5px 10px;
  border-radius: 999px;
  letter-spacing: 0.05em;
}

.tc-ticket__fig {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 2.75rem;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--color-ink, #1a0e08);
  margin-top: 14px;
}

.tc-ticket__delta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 600;
  font-size: 0.8125rem;
  color: #1f6b3d;
  letter-spacing: -0.01em;
}

.tc-ticket__delta svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
  display: block;
}

.tc-ticket__caption {
  margin: 14px 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-espresso, #3a2418);
}
```

---

## 8. Allocator subscription plan card

Source: https://uiverse.io/uiverse-astronaut/itchy-deer-4

"Feature pricing card in tangerine with a saffron status tag, a mono price figure, a bulleted feature list, and an ivory primary action."

Tokens: `--font-body`, `--font-display`, `--font-mono`, `--color-tangerine`, `--color-ivory`, `--color-saffron`, `--color-ink`

```html
<article class="tc-plan">
  <header class="tc-plan__head">
    <h3 class="tc-plan__name">Allocator</h3>
    <span class="tc-plan__tag">Most subscribed</span>
  </header>
  <div class="tc-plan__price">
    <span class="tc-plan__num">$1.8M</span>
    <span class="tc-plan__unit">minimum</span>
  </div>
  <p class="tc-plan__desc">
    Direct subscription to the master fund. Quarterly capital calls, quarterly
    liquidity windows, named partner contact.
  </p>
  <ul class="tc-plan__list">
    <li>
      <svg viewBox="0 0 256 256" aria-hidden="true">
        <path
          d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
        ></path>
      </svg>
      Master fund, all four sleeves
    </li>
    <li>
      <svg viewBox="0 0 256 256" aria-hidden="true">
        <path
          d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
        ></path>
      </svg>
      Named partner contact
    </li>
    <li>
      <svg viewBox="0 0 256 256" aria-hidden="true">
        <path
          d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
        ></path>
      </svg>
      Quarterly underwriting calls
    </li>
    <li>
      <svg viewBox="0 0 256 256" aria-hidden="true">
        <path
          d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
        ></path>
      </svg>
      Annual partnership weekend
    </li>
  </ul>
  <button class="tc-plan__cta" type="button">
    Open an allocation
    <svg viewBox="0 0 256 256" aria-hidden="true">
      <path
        d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"
      ></path>
    </svg>
  </button>
</article>
```

```css
.tc-plan {
  width: 320px;
  background: var(--color-tangerine, #e0521a);
  color: var(--color-ivory, #fbf6ea);
  border-radius: 32px;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}

.tc-plan__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tc-plan__name {
  font-family: var(--font-display, "Bricolage Grotesque", "Inter", sans-serif);
  font-weight: 800;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  color: inherit;
  margin: 0;
}

.tc-plan__tag {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 600;
  font-size: 0.6875rem;
  letter-spacing: 0.05em;
  background: var(--color-saffron, #f2c545);
  color: var(--color-ink, #1a0e08);
  padding: 6px 10px;
  border-radius: 999px;
}

.tc-plan__price {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.tc-plan__num {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 3.25rem;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: inherit;
}

.tc-plan__unit {
  font-size: 0.8125rem;
  font-weight: 600;
  opacity: 0.85;
}

.tc-plan__desc {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.55;
  opacity: 0.9;
  max-width: 30ch;
}

.tc-plan__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tc-plan__list li {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  align-items: start;
  font-size: 0.875rem;
  line-height: 1.45;
  opacity: 0.95;
}

.tc-plan__list svg {
  width: 16px;
  height: 16px;
  fill: var(--color-saffron, #f2c545);
  margin-top: 3px;
}

.tc-plan__cta {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 48px;
  padding: 0 22px;
  background: var(--color-ivory, #fbf6ea);
  color: var(--color-ink, #1a0e08);
  border: 1.5px solid var(--color-ivory, #fbf6ea);
  border-radius: 999px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 140ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-plan__cta:hover {
  background: var(--color-saffron, #f2c545);
  border-color: var(--color-saffron, #f2c545);
}

.tc-plan__cta:active {
  transform: translateY(1px);
}

.tc-plan__cta svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
  display: block;
}
```

---

## 9. Pill tabs with spark mark

Source: https://uiverse.io/uiverse-astronaut/big-chicken-39

"Ink-pill tab strip on parchment. Active tab carries a tilted tangerine spark glyph that rotates lazily on hover."

Tokens: `--font-body`, `--color-ivory`, `--color-espresso`, `--color-ink`, `--color-parchment`, `--color-saffron`, `--color-tangerine`

```html
<div class="tc-tabs" role="tablist" aria-label="Allocation preview">
  <button
    class="tc-tabs__tab is-active"
    role="tab"
    aria-selected="true"
    type="button"
  >
    Balanced
    <span class="tc-tabs__spark" aria-hidden="true">
      <svg viewBox="0 0 392.94 418.13">
        <path
          d="M243.7,418.13C198.37,312.3,118.14,268.5,0,294.73,135.19,238.54,203.38,148.99,149.24,0c49.45,103.91,130.68,145.05,243.7,123.4-127.69,63.18-168.91,165.26-149.24,294.73Z"
        ></path>
      </svg>
    </span>
  </button>
  <button class="tc-tabs__tab" role="tab" aria-selected="false" type="button">
    Growth
  </button>
  <button class="tc-tabs__tab" role="tab" aria-selected="false" type="button">
    Income
  </button>
  <button class="tc-tabs__tab" role="tab" aria-selected="false" type="button">
    Liquidity
  </button>
</div>
```

```css
.tc-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 999px;
  padding: 6px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}

.tc-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 18px;
  border: 0;
  background: transparent;
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-espresso, #3a2418);
  cursor: pointer;
  transition:
    background 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    color 180ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-tabs__tab:hover {
  color: var(--color-ink, #1a0e08);
}

.tc-tabs__tab.is-active,
.tc-tabs__tab[aria-selected="true"] {
  background: var(--color-ink, #1a0e08);
  color: var(--color-parchment, #f4ecd8);
}

.tc-tabs__tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-tabs__spark {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  color: var(--color-tangerine, #e0521a);
  transform: rotate(-12deg);
  transition: transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

.tc-tabs__spark svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  display: block;
}

.tc-tabs__tab:hover .tc-tabs__spark {
  transform: rotate(14deg);
}
```

---

## 10. Portfolio allocation bar with legend

Source: https://uiverse.io/uiverse-astronaut/smart-catfish-16

"Five-segment allocation bar paired with a mono legend. Rotates the full tangerine, saffron, clay, ink, espresso palette in their canonical roles."

Tokens: `--font-body`, `--font-display`, `--font-mono`, `--color-ivory`, `--color-ink`, `--color-espresso`, `--color-tangerine`, `--color-saffron`, `--color-clay`

```html
<section class="tc-alloc" aria-label="Portfolio allocation">
  <header class="tc-alloc__head">
    <h3 class="tc-alloc__title">Allocation preview</h3>
    <span class="tc-alloc__meta">Balanced book</span>
  </header>
  <div class="tc-alloc__bar" aria-hidden="true">
    <span class="tc-alloc__seg tc-alloc__seg--equity"></span>
    <span class="tc-alloc__seg tc-alloc__seg--credit"></span>
    <span class="tc-alloc__seg tc-alloc__seg--real"></span>
    <span class="tc-alloc__seg tc-alloc__seg--liquid"></span>
    <span class="tc-alloc__seg tc-alloc__seg--gold"></span>
  </div>
  <ul class="tc-alloc__legend">
    <li>
      <span class="tc-alloc__sw tc-alloc__sw--equity"></span
      ><span class="tc-alloc__lbl">Equity</span
      ><span class="tc-alloc__val">38%</span>
    </li>
    <li>
      <span class="tc-alloc__sw tc-alloc__sw--credit"></span
      ><span class="tc-alloc__lbl">Credit</span
      ><span class="tc-alloc__val">26%</span>
    </li>
    <li>
      <span class="tc-alloc__sw tc-alloc__sw--real"></span
      ><span class="tc-alloc__lbl">Real</span
      ><span class="tc-alloc__val">20%</span>
    </li>
    <li>
      <span class="tc-alloc__sw tc-alloc__sw--liquid"></span
      ><span class="tc-alloc__lbl">Liquid</span
      ><span class="tc-alloc__val">10%</span>
    </li>
    <li>
      <span class="tc-alloc__sw tc-alloc__sw--gold"></span
      ><span class="tc-alloc__lbl">Gold</span
      ><span class="tc-alloc__val">6%</span>
    </li>
  </ul>
</section>
```

```css
.tc-alloc {
  width: 380px;
  padding: 24px 26px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 24px;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
  color: var(--color-ink, #1a0e08);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tc-alloc__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.tc-alloc__title {
  margin: 0;
  font-family: var(--font-display, "Bricolage Grotesque", "Inter", sans-serif);
  font-weight: 700;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
}

.tc-alloc__meta {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-espresso, #3a2418);
  letter-spacing: -0.01em;
}

.tc-alloc__bar {
  display: flex;
  gap: 2px;
  height: 18px;
  background: rgba(58, 36, 24, 0.1);
  border-radius: 999px;
  overflow: hidden;
}

.tc-alloc__seg {
  display: block;
  height: 100%;
}

.tc-alloc__seg--equity {
  flex-basis: 38%;
  background: var(--color-tangerine, #e0521a);
}

.tc-alloc__seg--credit {
  flex-basis: 26%;
  background: var(--color-saffron, #f2c545);
}

.tc-alloc__seg--real {
  flex-basis: 20%;
  background: var(--color-clay, #b33a0e);
}

.tc-alloc__seg--liquid {
  flex-basis: 10%;
  background: var(--color-ink, #1a0e08);
}

.tc-alloc__seg--gold {
  flex-basis: 6%;
  background: var(--color-espresso, #3a2418);
}

.tc-alloc__legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 22px;
}

.tc-alloc__legend li {
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 10px;
  font-size: 0.8125rem;
}

.tc-alloc__sw {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: block;
}

.tc-alloc__sw--equity {
  background: var(--color-tangerine, #e0521a);
}
.tc-alloc__sw--credit {
  background: var(--color-saffron, #f2c545);
}
.tc-alloc__sw--real {
  background: var(--color-clay, #b33a0e);
}
.tc-alloc__sw--liquid {
  background: var(--color-ink, #1a0e08);
}
.tc-alloc__sw--gold {
  background: var(--color-espresso, #3a2418);
}

.tc-alloc__lbl {
  color: var(--color-ink, #1a0e08);
}

.tc-alloc__val {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--color-ink, #1a0e08);
  letter-spacing: -0.01em;
}
```

---

## 11. Spark spinner loader

Source: https://uiverse.io/uiverse-astronaut/foolish-warthog-83

"Loader built around the four-point brand spark. A tangerine glyph rotates against an ivory chip with a mono status label."

Tokens: `--font-mono`, `--color-ivory`, `--color-espresso`, `--color-ink`, `--color-tangerine`, `--color-saffron`

```html
<div class="tc-spinner" role="status" aria-live="polite">
  <span class="tc-spinner__ring" aria-hidden="true">
    <span class="tc-spinner__spark">
      <svg viewBox="0 0 392.94 418.13">
        <path
          d="M243.7,418.13C198.37,312.3,118.14,268.5,0,294.73,135.19,238.54,203.38,148.99,149.24,0c49.45,103.91,130.68,145.05,243.7,123.4-127.69,63.18-168.91,165.26-149.24,294.73Z"
        ></path>
      </svg>
    </span>
  </span>
  <span class="tc-spinner__label"
    >Underwriting<span class="tc-spinner__dots"><i></i><i></i><i></i></span
  ></span>
</div>
```

```css
.tc-spinner {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px 14px 18px;
  background: var(--color-ivory, #fbf6ea);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 999px;
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 600;
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-espresso, #3a2418);
}

.tc-spinner__ring {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
}

.tc-spinner__ring::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(58, 36, 24, 0.18);
  border-top-color: var(--color-ink, #1a0e08);
  animation: tc-spin 1.1s linear infinite;
}

.tc-spinner__spark {
  display: inline-grid;
  place-items: center;
  width: 14px;
  height: 14px;
  color: var(--color-tangerine, #e0521a);
  animation: tc-spark-tilt 2.2s ease-in-out infinite;
}

.tc-spinner__spark svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  display: block;
}

.tc-spinner__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-ink, #1a0e08);
}

.tc-spinner__dots {
  display: inline-flex;
  gap: 3px;
  margin-left: 4px;
}

.tc-spinner__dots i {
  width: 4px;
  height: 4px;
  background: var(--color-saffron, #f2c545);
  border-radius: 50%;
  display: inline-block;
  animation: tc-pulse 1.4s ease-in-out infinite;
}

.tc-spinner__dots i:nth-child(2) {
  animation-delay: 0.18s;
}

.tc-spinner__dots i:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes tc-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes tc-spark-tilt {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(18deg);
  }
}

@keyframes tc-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.7);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tc-spinner__ring::before,
  .tc-spinner__spark,
  .tc-spinner__dots i {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## 12. Editorial term tooltip

Source: https://uiverse.io/uiverse-astronaut/tall-elephant-71

"Hover tooltip pinned over a ghost trigger. Tilted saffron spark mark, display-face title, explainer body inside an ivory panel."

Tokens: `--font-body`, `--font-display`, `--font-mono`, `--color-ink`, `--color-espresso`, `--color-clay`, `--color-tangerine`, `--color-saffron`, `--color-ivory`

```html
<span class="tc-tip">
  <button
    class="tc-tip__trigger"
    type="button"
    aria-describedby="tc-tip-net-irr"
  >
    Net IRR
    <svg class="tc-tip__icon" viewBox="0 0 256 256" aria-hidden="true">
      <path
        d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm12-88v40a12,12,0,0,1-24,0V136a12,12,0,0,1,0-24,12,12,0,0,1,24,0v16ZM112,80a16,16,0,1,1,16,16A16,16,0,0,1,112,80Z"
      ></path>
    </svg>
  </button>
  <span class="tc-tip__panel" id="tc-tip-net-irr" role="tooltip">
    <span class="tc-tip__mark" aria-hidden="true">
      <svg viewBox="0 0 392.94 418.13">
        <path
          d="M243.7,418.13C198.37,312.3,118.14,268.5,0,294.73,135.19,238.54,203.38,148.99,149.24,0c49.45,103.91,130.68,145.05,243.7,123.4-127.69,63.18-168.91,165.26-149.24,294.73Z"
        ></path>
      </svg>
    </span>
    <span class="tc-tip__title">Net internal rate of return</span>
    <span class="tc-tip__body"
      >Annualised rate measured after management fees, performance fees, and
      currency hedging costs. Reported since fund inception.</span
    >
    <span class="tc-tip__meta">
      <span class="tc-tip__val">17.8%</span>
      <span class="tc-tip__sub">5-year, fund-of-funds basis</span>
    </span>
  </span>
</span>
```

```css
.tc-tip {
  position: relative;
  display: inline-block;
  font-family: var(--font-body, "Inter", system-ui, sans-serif);
}

.tc-tip__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 0;
  border-bottom: 1.5px dashed var(--color-clay, #b33a0e);
  color: var(--color-ink, #1a0e08);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: help;
  border-radius: 4px 4px 0 0;
}

.tc-tip__trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-saffron, #f2c545);
}

.tc-tip__icon {
  width: 14px;
  height: 14px;
  fill: var(--color-tangerine, #e0521a);
  display: block;
}

.tc-tip__panel {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  width: 280px;
  padding: 18px 20px;
  background: var(--color-ivory, #fbf6ea);
  color: var(--color-ink, #1a0e08);
  border: 1px solid rgba(58, 36, 24, 0.18);
  border-radius: 18px 6px 18px 6px;
  box-shadow: 0 16px 40px rgba(58, 36, 24, 0.18);
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 0.61, 0.36, 1),
    visibility 180ms;
  z-index: 10;
  pointer-events: none;
}

.tc-tip__panel::before {
  content: "";
  position: absolute;
  top: -6px;
  left: 26px;
  width: 12px;
  height: 12px;
  background: var(--color-ivory, #fbf6ea);
  border-left: 1px solid rgba(58, 36, 24, 0.18);
  border-top: 1px solid rgba(58, 36, 24, 0.18);
  transform: rotate(45deg);
}

.tc-tip:hover .tc-tip__panel,
.tc-tip:focus-within .tc-tip__panel {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.tc-tip__mark {
  position: absolute;
  top: 14px;
  right: 16px;
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: var(--color-saffron, #f2c545);
  transform: rotate(-14deg);
}

.tc-tip__mark svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
  display: block;
}

.tc-tip__title {
  font-family: var(--font-display, "Bricolage Grotesque", "Inter", sans-serif);
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--color-ink, #1a0e08);
  max-width: 220px;
}

.tc-tip__body {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--color-espresso, #3a2418);
}

.tc-tip__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed rgba(58, 36, 24, 0.2);
}

.tc-tip__val {
  font-family: var(--font-mono, "JetBrains Mono", ui-monospace, monospace);
  font-weight: 700;
  font-size: 1.125rem;
  letter-spacing: -0.025em;
  color: var(--color-ink, #1a0e08);
}

.tc-tip__sub {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-espresso, #3a2418);
}
```

---

## License

Component markup and CSS are MIT licensed, copyright 2026 `uiverse-astronaut`.
Retrieved from https://uiverse.io/ui-kits/tangerine-capital.
