/**
 * Collapsible sections (inline-drawer) accessibility
 *
 * SillyTavern uses .inline-drawer everywhere (each extension in the Extensions
 * panel is one; also in settings, groups, etc.). The header is an
 * .inline-drawer-toggle with the section text, but what receives keyboard focus
 * is the .inline-drawer-icon chevron inside it -- and that chevron has no name
 * or state. Result: the reader announces "button" without saying which section
 * or whether it is open.
 *
 * Here we give the chevron the section name (role=button + aria-label) and keep
 * aria-expanded up to date. World Info entries have their own handling in
 * lorebook.js (flagged with data-lorea11y), so we skip them.
 */

const TOGGLE = '.inline-drawer-toggle';

/** The focusable element: the toggle itself (when it is the icon) or the chevron. */
function iconeDe(toggle) {
    if (toggle.classList.contains('inline-drawer-icon')) return toggle;
    return toggle.querySelector('.inline-drawer-icon');
}

/** Header text, cleaned (removes the stray "?" from help links). */
function textoDe(toggle) {
    return (toggle.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/\s*\?\s*$/, '')
        .trim();
}

function atualizarEstado(icone) {
    // SillyTavern toggles the "up" (open) / "down" (closed) class on the chevron.
    icone.setAttribute('aria-expanded', icone.classList.contains('up') ? 'true' : 'false');
}

function enriquecer(toggle) {
    const icone = iconeDe(toggle);
    if (!icone) return;
    if (icone.dataset.lorea11y) return; // already handled by lorebook.js

    atualizarEstado(icone);

    if (icone.dataset.a11yCollapsible) return;
    if (!icone.hasAttribute('role')) icone.setAttribute('role', 'button');
    if (!icone.hasAttribute('aria-label')) {
        const txt = textoDe(toggle);
        if (txt) icone.setAttribute('aria-label', txt);
    }
    icone.dataset.a11yCollapsible = '1';
}

function aplicar(raiz = document) {
    raiz.querySelectorAll(TOGGLE).forEach(enriquecer);
}

function iniciar() {
    aplicar();

    // Update the state right after any click on a header (SillyTavern toggles
    // the chevron class synchronously, so a short delay is enough).
    document.addEventListener('click', (e) => {
        const alvo = e.target instanceof Element ? e.target.closest(TOGGLE) : null;
        if (!alvo) return;
        const icone = iconeDe(alvo);
        if (icone && !icone.dataset.lorea11y) {
            window.setTimeout(() => atualizarEstado(icone), 50);
        }
    }, true);

    // Extension sections and others arrive later; a light observer covers that.
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(() => aplicar(), 150);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initCollapsibles };
