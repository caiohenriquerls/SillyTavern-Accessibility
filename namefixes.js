/**
 * Name fixes for remaining unnamed focusable controls
 *
 * An audit found several focusable controls (icons) that end up as just
 * "button" for the screen reader, with no name. Here we name them by category
 * and, as a safety net, an icon -> name map for the icon buttons that are left.
 *
 * We only touch controls that are focusable and unnamed -- it never overwrites
 * an existing name.
 */

/** Icon buttons by id (known context). */
const POR_ID = {
    'tts_refresh': 'Refresh available voices',
    'tts_voices': 'Available voices',
    'expression_override_button': 'Override sprite folder',
    'summaryExtensionPopoutButton': 'Pop out to window',
    'groupCurrentMemberPopoutButton': 'Pop out current members to window',
};

/** Safety net: FontAwesome icon -> name. */
const POR_ICONE = {
    'fa-power-off': 'Toggle on or off',
    'fa-bolt': 'Quick action',
    'fa-link': 'Connect',
    'fa-unlink': 'Disconnect',
    'fa-window-restore': 'Pop out to window',
    'fa-window-maximize': 'Maximize',
    'fa-trash-can': 'Delete',
    'fa-trash': 'Delete',
    'fa-pen-to-square': 'Edit',
    'fa-pencil': 'Edit',
    'fa-file-import': 'Import',
    'fa-file-export': 'Export',
    'fa-arrows-rotate': 'Refresh',
    'fa-rotate': 'Refresh',
    'fa-gear': 'Settings',
    'fa-cog': 'Settings',
    'fa-circle-xmark': 'Close',
    'fa-xmark': 'Close',
    'fa-ellipsis-vertical': 'More options',
    'fa-ellipsis': 'More options',
    'fa-flag': 'Checkpoint',
    'fa-eye': 'Toggle visibility',
    'fa-eye-slash': 'Toggle visibility',
    'fa-chevron-left': 'Previous',
    'fa-chevron-right': 'Next',
    'fa-circle-chevron-up': 'Collapse',
    'fa-circle-chevron-down': 'Expand',
    'fa-magnifying-glass': 'Search',
    'fa-plus': 'Add',
    'fa-minus': 'Remove',
};

function focavelSemNome(el) {
    if (el.getAttribute('tabindex') === '-1') return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.disabled) return false;
    // We do not require visibility: we also label what is hidden now (and even
    // templates), so the name is ready when the element appears -- the childList
    // observer does not fire when a panel only changes display.
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return false;
    if (el.getAttribute('title')) return false;
    if (el.labels && el.labels.length && [...el.labels].some(l => l.textContent.trim())) return false;
    if ((el.textContent || '').trim()) return false;
    const val = el.getAttribute('value');
    if (el.tagName === 'INPUT' && val && val.trim()) return false;
    return true;
}

/** First meaningful fa-* token of the element or of a child <i>. */
function iconeDe(el) {
    const classes = [el, ...el.querySelectorAll('i, span')]
        .flatMap(n => [...n.classList]);
    return classes.find(c => POR_ICONE[c]) || null;
}

function aplicar() {
    // --- buttons that only have data-tooltip: SillyTavern uses that attribute
    // for its own tooltip, but the screen reader does NOT read data-tooltip. We
    // turn it into aria-label (e.g. the "checkpoint" on messages).
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        if (!focavelSemNome(el)) return;
        const dica = (el.getAttribute('data-tooltip') || '').split('\n')[0].trim();
        if (dica) el.setAttribute('aria-label', dica);
    });

    // --- sampler-order toggles (empty divs, e.g. NovelAI #novel_order)
    document.querySelectorAll('.toggle_button').forEach(el => {
        if (focavelSemNome(el)) el.setAttribute('aria-label', 'Toggle on or off');
    });

    // --- removable tags: the "x" remove button
    document.querySelectorAll('.tag_remove').forEach(x => {
        if (!focavelSemNome(x)) return;
        const nome = x.closest('.tag')?.querySelector('.tag_name')?.textContent?.trim();
        x.setAttribute('aria-label', nome ? 'Remove tag: ' + nome : 'Remove tag');
    });

    // --- tag filter/manage buttons (icons with no text)
    const tagBotoes = { filterByFavorites: 'Filter by favorites', manageTags: 'Manage tags' };
    for (const [cls, nome] of Object.entries(tagBotoes)) {
        document.querySelectorAll('.tag.' + cls).forEach(t => {
            if (focavelSemNome(t)) t.setAttribute('aria-label', nome);
        });
    }

    // --- by known id
    for (const [id, nome] of Object.entries(POR_ID)) {
        const el = document.getElementById(id);
        if (el && focavelSemNome(el)) el.setAttribute('aria-label', nome);
    }

    // --- icon safety net, for whatever is left
    const sel = '.interactable, [role="button"], .menu_button';
    document.querySelectorAll(sel).forEach(el => {
        if (!focavelSemNome(el)) return;
        const icone = iconeDe(el);
        if (icone) el.setAttribute('aria-label', POR_ICONE[icone]);
    });
}

function iniciar() {
    aplicar();
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(aplicar, 200);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initNameFixes };
