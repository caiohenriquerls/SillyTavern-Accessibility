/**
 * select2 accessibility
 *
 * SillyTavern uses the select2 widget for many dropdowns/multiselects (active
 * lorebooks, character/group world info, model pickers, etc.). select2 hides the
 * real <select> with class "select2-hidden-accessible" AND SillyTavern marks it
 * aria-hidden="true" + tabindex="-1" -- so the screen reader/keyboard cannot
 * reach it.
 *
 * SINGLE selects: expose the native <select> (a clean combobox NVDA operates
 * well) and hide the visual select2 widget from the accessibility tree.
 *
 * MULTISELECTS (e.g. "Active World(s) for all chats"): the select2 widget packs
 * TWO jobs into one combobox -- the type-to-search input that ADDS an item, and
 * the "chips" of already-selected items, each with an "x" that REMOVES it. We:
 *   - keep the select2 combobox usable to ACTIVATE (it has a searchable dropdown,
 *     which the native multiselect does not);
 *   - do NOT expose the internal "x" buttons -- inside the combobox they read as
 *     controls "inside a text box";
 *   - instead build a SEPARATE list of real "Deactivate <name>" buttons next to
 *     the widget, so turning an item off is one Enter press, no Ctrl+Space.
 * The native <select> stays hidden for multiselects (the select2 combobox is the
 * activate control). The mouse keeps using the visual widget unchanged.
 */

const NATIVE = 'select.select2-hidden-accessible';

function detab(el) {
    if (el) el.setAttribute('tabindex', '-1');
}

/** The select2 container is the sibling right after the <select>. */
function widgetDe(native) {
    let c = native.nextElementSibling;
    if (c && c.classList.contains('select2-container')) return c;
    return native.parentElement?.querySelector(':scope > .select2-container') || null;
}

/**
 * A select2 configured with tags:true lets the user type NEW entries that are
 * not in the option list. For those the search field is the only way in, so we
 * must not touch it -- we skip the whole control and leave it to select2.
 */
function permiteTextoLivre(native) {
    try {
        const jq = window.jQuery || window.$;
        const inst = jq && jq(native).data('select2');
        return !!(inst && inst.options && inst.options.options && inst.options.options.tags);
    } catch {
        return false;
    }
}

/* ------------------------------------------------------------------ */
/* single select                                                       */
/* ------------------------------------------------------------------ */

function exporNativo(native, container) {
    if (native.getAttribute('aria-hidden') === 'true') native.removeAttribute('aria-hidden');
    if (native.getAttribute('tabindex') === '-1' || !native.hasAttribute('tabindex')) {
        native.setAttribute('tabindex', '0');
    }
    if (!container) return;
    // hide the visual widget from AT + tab order
    container.setAttribute('aria-hidden', 'true');
    container.querySelectorAll('input, textarea, button, a, select, [tabindex]').forEach(detab);
}

/* ------------------------------------------------------------------ */
/* multiselect                                                         */
/* ------------------------------------------------------------------ */

/** Keep the native <select> out of the way -- the select2 combobox is used. */
function esconderNativo(native) {
    if (native.getAttribute('aria-hidden') !== 'true') native.setAttribute('aria-hidden', 'true');
    if (native.getAttribute('tabindex') !== '-1') native.setAttribute('tabindex', '-1');
}

/**
 * Build/refresh the separate list of "Deactivate <name>" buttons for a
 * multiselect. The buttons are screen-reader-only (no visual change); clicking
 * one deselects that option and lets select2 + SillyTavern react.
 */
function construirBotoesRemover(container, native) {
    const verbo = /world/i.test(native.id) ? 'Deactivate ' : 'Remove ';
    // our own container, right after the select2 widget
    let box = container.nextElementSibling;
    if (!(box && box.classList.contains('pma11y-deactivate'))) {
        box = document.createElement('span');
        box.className = 'pma11y-deactivate';
        box.setAttribute('role', 'group');
        container.after(box);
    }
    box.setAttribute('aria-label', (native.getAttribute('aria-label') || 'Selected items') + ' -- remove');

    const selected = [...native.selectedOptions];
    const sig = selected.map(o => o.value).join('');
    if (box.dataset.sig === sig) return;   // unchanged -> keep focus, do nothing
    const querFoco = box.dataset.pendFoco;
    box.dataset.pendFoco = '';

    box.textContent = '';
    selected.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pma11y-sr-only';
        btn.textContent = '✕';
        btn.setAttribute('aria-label', verbo + opt.textContent.trim());
        btn.addEventListener('click', () => {
            // remember we want focus back here after the list rebuilds
            box.dataset.pendFoco = '1';
            opt.selected = false;
            native.dispatchEvent(new Event('change', { bubbles: true }));
        });
        box.appendChild(btn);
    });
    box.dataset.sig = sig;

    // after a deactivation, move focus to the next remaining button, or to the
    // add control, so a screen-reader user is not dumped on <body>.
    if (querFoco) {
        const alvo = box.querySelector('button')
            || container.querySelector('.select2-search__field');
        if (alvo) window.setTimeout(() => alvo.focus(), 0);
    }
}

function tratarMultiselect(container, native) {
    esconderNativo(native);
    container.removeAttribute('aria-hidden');
    // Keep the select2 combobox operable to ADD. Its internal "x" buttons and
    // clear-all are hidden from AT (we expose external ones instead) so they do
    // not read as controls "inside a text box"; the chip labels stay as the
    // combobox value, and the search field stays as the add input.
    container.querySelectorAll('.select2-selection__choice__remove, .select2-selection__clear')
        .forEach(el => { detab(el); el.setAttribute('aria-hidden', 'true'); });
    // the clickable chip label is a mouse-only "open for edit" shortcut: keep it
    // readable but out of the tab order.
    container.querySelectorAll('.select2-selection__choice__display').forEach(detab);
    // make sure the search field (the add input) is reachable
    const busca = container.querySelector('.select2-search__field');
    if (busca) busca.removeAttribute('aria-hidden');
    construirBotoesRemover(container, native);
}

/* ------------------------------------------------------------------ */
/* driver                                                              */
/* ------------------------------------------------------------------ */

function expor(native) {
    if (permiteTextoLivre(native)) return;
    const container = widgetDe(native);
    if (native.multiple) tratarMultiselect(container, native);
    else exporNativo(native, container);
}

function aplicar() {
    document.querySelectorAll(NATIVE).forEach(expor);
}

function iniciar() {
    aplicar();
    // select2 re-renders its widget when chips/options change; a light observer
    // re-applies (rebuilding the deactivate buttons when the selection changes).
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(aplicar, 150);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initSelect2 };
