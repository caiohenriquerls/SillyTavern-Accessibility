/**
 * Native button double-activation fix
 *
 * SillyTavern's keyboard.js turns .menu_button / .interactable controls into
 * keyboard buttons by listening for Enter on the document and calling
 * target.click(). It does NOT check whether the target is already a NATIVE
 * control. For a native <button>, <input type=button|submit|reset> or <a href>
 * -- which the browser ALSO activates on Enter -- this fires the click TWICE
 * (native + core). For a toggle button that cancels itself out, so under a
 * screen reader (focus mode) the button appeared to "do nothing" -- e.g. the
 * "Show more recent chats" button.
 *
 * Fix: on a plain Enter over a natively-activatable interactable, stop the event
 * in the capture phase so core's document-level handler never runs. The native
 * activation still fires (we do not preventDefault), so the control activates
 * exactly once. Controls that RELY on core (e.g. <a> without href, or <div>
 * buttons) are not natively activatable and are left untouched.
 */

function nativamenteAtivavel(el) {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    if (tag === 'BUTTON') return true;
    if (tag === 'INPUT') return ['button', 'submit', 'reset'].includes(el.type);
    if (tag === 'A') return el.hasAttribute('href');
    return false;
}

function iniciar() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.altKey || e.ctrlKey || e.shiftKey || e.metaKey) return;
        const el = e.target;
        if (!nativamenteAtivavel(el)) return;
        if (el.disabled) return;
        // Only when core would ALSO click it (i.e. it is a keyboard interactable).
        if (!el.classList.contains('interactable') && !el.classList.contains('menu_button')) return;
        // Let the native activation happen; prevent core's redundant second click.
        e.stopPropagation();
    }, true); // capture: runs before core's document (bubble) handler
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initKeyboardFix };
