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

/** First non-empty line of a title (the name; the rest is usually a shortcut). */
function nomeDoTitle(title) {
    if (!title) return '';
    return title.split(/[\r\n]/).map(s => s.trim()).find(Boolean) || '';
}

function promover(el) {
    if (el.getAttribute('tabindex') === '-1') return;
    if (el.getAttribute('aria-hidden') === 'true') return;
    if (el.disabled) return;
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
    // Own text (including from children) is already announced with arrows.
    if ((el.textContent || '').trim()) return;
    // A form field with an associated <label> also already has a name.
    if (el.labels && el.labels.length && [...el.labels].some(l => l.textContent.trim())) return;
    const nome = nomeDoTitle(el.getAttribute('title'));
    if (nome) {
        el.setAttribute('aria-label', nome);
        // Remember this label came from the title, so we can keep it in sync if
        // the app later changes the title (e.g. a toggle button whose title flips
        // between "Show more" and "Show less").
        el.dataset.a11yFromTitle = '1';
    }
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

    // Keep title-derived aria-labels in sync when the app changes the title on
    // the same element (otherwise the screen reader keeps reading the old name).
    new MutationObserver(muts => {
        for (const mut of muts) {
            const el = mut.target;
            if (el instanceof HTMLElement && el.dataset.a11yFromTitle) {
                const nome = nomeDoTitle(el.getAttribute('title'));
                if (nome) el.setAttribute('aria-label', nome);
            }
        }
    }).observe(document.body, { attributes: true, attributeFilter: ['title'], subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initTitles };
