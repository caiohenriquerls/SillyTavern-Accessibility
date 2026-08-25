/**
 * select2 accessibility
 *
 * SillyTavern uses the select2 widget for many dropdowns/multiselects (active
 * lorebooks, character/group world info, model pickers, etc.). select2 hides the
 * real <select> with class "select2-hidden-accessible" AND SillyTavern marks it
 * aria-hidden="true" + tabindex="-1" -- so the screen reader/keyboard cannot
 * reach it. The visual select2 widget in its place has poor screen-reader
 * support (and its inner chips + search field create multiple tab stops).
 *
 * The most reliable fix is to expose the NATIVE <select>, which NVDA operates
 * well (a real listbox/combobox: arrows to move, Space to toggle), and hide the
 * visual select2 widget from the accessibility tree + tab order. The mouse still
 * uses the visual widget exactly as before (aria-hidden/tabindex do not affect
 * the mouse). This is what finally lets a screen-reader user ACTIVATE a lorebook
 * in "Active World(s) for all chats".
 *
 * For MULTISELECTS we also expose each selected item's "x" remove button as a
 * real, named button ("Deactivate <name>"), so a screen-reader/keyboard user can
 * turn an item off with one Enter press -- the native multiselect alone would
 * force the clunky Ctrl+Space to deselect.
 */

const NATIVE = 'select.select2-hidden-accessible';

function detab(el) {
    if (el) el.setAttribute('tabindex', '-1');
}

/** The visible name of a select2 chip (a selected item). */
function nomeDoChip(chip) {
    return (chip.getAttribute('title')
        || chip.querySelector('.select2-selection__choice__display')?.textContent
        || '').trim();
}

/**
 * A multiselect select2 shows each selected item as a "chip" with an "x" remove
 * button. Those buttons are how you DEACTIVATE an item (e.g. turn a lorebook
 * off in "Active World(s)"), but they were unreachable. Here we keep the
 * container in the accessibility tree, silence the noisy/duplicate parts (the
 * type-to-search field, the chip name spans, the clear-all button), and expose
 * ONLY the remove buttons as real, named buttons. The native <select> stays the
 * way to add/read; these buttons are the one-press way to remove.
 */
function exporBotoesRemover(container, native) {
    container.removeAttribute('aria-hidden');
    // The selection box is an ANCESTOR of the chips: only detab it, never
    // aria-hide it (that would hide the chips + their remove buttons too).
    container.querySelectorAll('.select2-selection').forEach(detab);
    // Leaf noise -> out of the tab order and hidden from the screen reader.
    container.querySelectorAll('.select2-search__field, .select2-selection__choice__display, .select2-selection__clear')
        .forEach(el => { detab(el); el.setAttribute('aria-hidden', 'true'); });
    // "world" selects deactivate; other multiselects just remove.
    const verbo = /world/i.test(native.id) ? 'Deactivate ' : 'Remove ';
    container.querySelectorAll('.select2-selection__choice').forEach(chip => {
        const btn = chip.querySelector('.select2-selection__choice__remove');
        if (!btn) return;
        btn.removeAttribute('aria-hidden');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', verbo + nomeDoChip(chip));
    });
}

/** A single select has no chips: hide the whole widget from AT + tab order. */
function esconderWidget(container) {
    container.setAttribute('aria-hidden', 'true');
    // Remove every focusable descendant from the tab order so it is not an
    // aria-hidden-with-focusable error and does not create extra tab stops.
    container.querySelectorAll('input, textarea, button, a, select, [tabindex]').forEach(detab);
}

function tratarWidget(container, native) {
    if (!container) return;
    if (native.multiple) exporBotoesRemover(container, native);
    else esconderWidget(container);
}

/**
 * A select2 configured with tags:true lets the user type NEW entries that are
 * not in the option list. For those the search field is the only way in, so we
 * must not detab it -- we skip the whole control and leave it to select2.
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

function expor(native) {
    if (permiteTextoLivre(native)) return;
    // Native select -> reachable and in the accessibility tree.
    if (native.getAttribute('aria-hidden') === 'true') native.removeAttribute('aria-hidden');
    if (native.getAttribute('tabindex') === '-1' || !native.hasAttribute('tabindex')) {
        native.setAttribute('tabindex', '0');
    }
    // The select2 widget is the sibling right after the <select>.
    let container = native.nextElementSibling;
    if (!(container && container.classList.contains('select2-container'))) {
        container = native.parentElement && native.parentElement.querySelector(':scope > .select2-container');
    }
    tratarWidget(container, native);
}

function aplicar() {
    document.querySelectorAll(NATIVE).forEach(expor);
}

function iniciar() {
    aplicar();
    // select2 re-renders its widget when chips/options change; a light observer
    // keeps the widget hidden and the native exposed.
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
