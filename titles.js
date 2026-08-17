/**
 * Promote title -> aria-label
 *
 * Almost every icon button in SillyTavern is named only by the `title`
 * attribute. That works in NVDA's focus mode (Tab), but in browse mode (arrows
 * / virtual cursor) `title` is NOT read reliably -- so the user was passing over
 * buttons (AI Response Configuration, API Connections, the message buttons,
 * etc.) without hearing any name.
 *
 * The correct fix is to give those controls an `aria-label`, which is read in
 * every mode and reader. Here we copy the `title` (the first line, which is the
 * name; the rest is usually instructions/shortcuts) into `aria-label`, keeping
 * the `title` for the visual tooltip. We only touch elements that are focusable,
 * not yet named, and have no own text (own text is already read with arrows).
 */

const FOCAVEL = '.interactable, [role="button"], .menu_button, .right_menu_button, '
    + '.drawer-icon, .inline-drawer-icon, .mes_button, button, a, input, select, '
    + 'textarea, [tabindex="0"]';

function promover(el) {
    if (el.getAttribute('tabindex') === '-1') return;
    if (el.getAttribute('aria-hidden') === 'true') return;
    if (el.disabled) return;
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
    // Own text (including from children) is already announced with arrows.
    if ((el.textContent || '').trim()) return;
    // A form field with an associated <label> also already has a name.
    if (el.labels && el.labels.length && [...el.labels].some(l => l.textContent.trim())) return;
    const title = el.getAttribute('title');
    if (!title || !title.trim()) return;
    const nome = title.split(/[\r\n]/).map(s => s.trim()).find(Boolean);
    if (nome) el.setAttribute('aria-label', nome);
}

function aplicar() {
    document.querySelectorAll('[title]').forEach(el => {
        if (el.matches(FOCAVEL)) promover(el);
    });
}

function iniciar() {
    aplicar();
    // Messages, cards and panels arrive later; a light observer covers that.
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

export { iniciar as initTitles };
