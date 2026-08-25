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
 */

const NATIVE = 'select.select2-hidden-accessible';

function esconderWidget(container) {
    if (!container) return;
    container.setAttribute('aria-hidden', 'true');
    // Remove every focusable descendant from the tab order so it is not an
    // aria-hidden-with-focusable error and does not create extra tab stops.
    container.querySelectorAll('input, textarea, button, a, select, [tabindex]').forEach(el => {
        el.setAttribute('tabindex', '-1');
    });
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
    esconderWidget(container);
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
