# SillyTavern Accessibility (Screen Reader)

A non-invasive [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension that makes the UI usable with a **screen reader** (tested with **NVDA**) and by **keyboard only**.

SillyTavern builds most of its buttons out of `<div>`/`<i>` icons named only by a `title` attribute, exposes toggles as CSS classes rather than real controls, and never gives many controls an accessible name, role, or state. That works for sighted mouse users but leaves screen‑reader users navigating a wall of unlabeled "button"s. This extension fixes the **accessibility tree** at runtime — it adds the missing roles, names and states, and manages focus where needed — **without changing the app's code, appearance, or mouse behavior**.

Built by and for a blind SillyTavern user.

## What it covers

- **Prompt Manager** — toggles become real `switch`es (with state announced), edit/detach controls are named, and mutually‑exclusive groups warn when more than one module is enabled.
- **World Info / Lorebooks** — entry toggle → `switch`; expander → `button` with `aria-expanded`; move/duplicate/delete named with the entry title; the symbol‑only **Position** (`↑Char`, `@D 🤖`, …) and **Status** (colored dots) options become readable words; the panel toolbar, search, sort and world selectors get labels.
- **Characters & Groups** — list create/import buttons, the edit‑form toolbar and fields, the unnamed *Create/Save* submit, and the character/group/folder cards (announced as "Character: / Group: / Folder: `<name>`"). Group members' action buttons get the character's name for context.
- **Personas** — cards named "Persona: `<name>`" (with `aria-current` for the active one), fields labeled, vague buttons clarified.
- **Past chats** — each saved chat becomes a named "Open chat: `<name>`" button, with its rename/export/delete actions labeled with the chat name.
- **Top navigation bar** — the 9 panel icons get `aria-expanded` (open/closed state) and the unnamed *Backgrounds* icon a name.
- **Send bar & messages** — the options menu button, the message input, the swipe (previous/next response) arrows, and the "wand" menu.
- **Menus** (options / wand) — turned into proper focus‑managed pop‑ups: focus moves into the menu on open and back to the button on close, `aria-expanded` reflects state, Escape closes.
- **Panel pins** — the lock/unlock pin of each drawer is named, and its decorative icon halves are removed from the tab order.
- **select2 dropdowns** — SillyTavern hides the real `<select>` behind the select2 widget and marks it `aria-hidden` + `tabindex="-1"`, so a screen reader cannot reach it. For **single selects** (model pickers, etc.) this re‑exposes the native `<select>`, a control NVDA operates well, and hides the visual widget. For **multiselects** like *Active World(s) for all chats*, the select2 combobox is kept as the searchable **activate** control, and a separate list of real **"Deactivate \<name\>"** buttons is added next to it so an active lorebook can be turned off with a single Enter — no `Ctrl+Space`. This is what finally lets a screen‑reader user both **activate and deactivate** lorebooks. The mouse keeps using the visual widget unchanged.
- **Collapsible sections** — every `inline-drawer` (each extension in the Extensions panel, plus settings/group sections) gets a named `button` with `aria-expanded`.
- **Settings sliders** — the ~78 `slider + number` pairs get their visual label associated as an accessible name.
- **`title` → `aria-label`** — the single biggest win: `title` is read by NVDA in focus mode (Tab) but **not** reliably in browse mode (arrow keys). This promotes `title` to `aria-label` on ~800 icon controls so they are announced in **every** reading mode.
- **`data-tooltip` → `aria-label`** — SillyTavern's custom tooltip attribute is invisible to screen readers; it is converted to a real name (e.g. the message *checkpoint* button).
- A visible **focus outline** for keyboard navigation throughout.

## Why an extension (and not core edits)

Extensions survive SillyTavern updates; edits to core files do not. Everything here works by observing the DOM and enriching it, so nothing in SillyTavern itself is modified. Some of these fixes (roles, `aria-label`, `aria-expanded`) arguably belong in SillyTavern core — see *Contributing* below.

## Install

In SillyTavern: **Extensions → Install extension**, then paste this repository's URL. Reload afterward.

Or clone manually into your data folder:

```
SillyTavern/data/<user>/extensions/SillyTavern-Accessibility/
```

## Notes for screen‑reader users

- All accessible names are in **English**, matching SillyTavern's own labels.
- Tested with **NVDA**. Most controls are reachable by Tab and by browse‑mode arrows.
- Enter (and Space, on `role=button` controls) activates. The options/wand menus move focus for you and close with Escape.

## Known limitations

- select2 dropdowns are made operable by re‑exposing the native `<select>`; free‑text tag inputs (if any appear) are left to the widget so typing new entries still works.
- The FontAwesome icon → name fallback is heuristic for a small number of controls that have neither text nor a `title`.

## Contributing

Accessibility is never "done." Issues and PRs welcome. If you maintain SillyTavern and would like any of this upstreamed into core (so it helps everyone without an extension), please open a discussion — that would be the ideal outcome.

## License

[AGPL‑3.0](LICENSE), matching SillyTavern.
