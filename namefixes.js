/**
 * Name fixes for remaining unnamed focusable controls
 *
 * Uma auditoria mostrou varios controles focaveis (icones) que ficam so
 * "button" para o leitor de tela, sem nome. Aqui damos nome a eles por
 * categoria e, como rede de seguranca, um mapa de icone -> nome para os
 * botoes de icone que sobrarem.
 *
 * So mexemos em quem esta VISIVEL, focavel e sem nome -- nunca sobrescreve
 * um nome existente.
 */

/** Botoes de icone por id (contexto conhecido). */
const POR_ID = {
    'tts_refresh': 'Refresh available voices',
    'tts_voices': 'Available voices',
    'expression_override_button': 'Override sprite folder',
    'summaryExtensionPopoutButton': 'Pop out to window',
    'groupCurrentMemberPopoutButton': 'Pop out current members to window',
};

/** Rede de seguranca: icone FontAwesome -> nome. */
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
    // Nao exigimos visibilidade: rotulamos tambem o que esta oculto agora (e ate
    // os templates), para o nome ja estar pronto quando o elemento aparecer -- o
    // observador de childList nao dispara quando um painel so troca de display.
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return false;
    if (el.getAttribute('title')) return false;
    if (el.labels && el.labels.length && [...el.labels].some(l => l.textContent.trim())) return false;
    if ((el.textContent || '').trim()) return false;
    const val = el.getAttribute('value');
    if (el.tagName === 'INPUT' && val && val.trim()) return false;
    return true;
}

/** Primeiro token fa-* significativo do elemento ou de um <i> filho. */
function iconeDe(el) {
    const classes = [el, ...el.querySelectorAll('i, span')]
        .flatMap(n => [...n.classList]);
    return classes.find(c => POR_ICONE[c]) || null;
}

function aplicar() {
    // --- botoes que so tem data-tooltip: o SillyTavern usa esse atributo para
    // um tooltip proprio, mas o leitor de tela NAO le data-tooltip. Viramos ele
    // em aria-label (ex.: o "checkpoint" nas mensagens).
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        if (!focavelSemNome(el)) return;
        const dica = (el.getAttribute('data-tooltip') || '').split('\n')[0].trim();
        if (dica) el.setAttribute('aria-label', dica);
    });

    // --- toggles de ordem de sampler (divs vazios, ex.: NovelAI #novel_order)
    document.querySelectorAll('.toggle_button').forEach(el => {
        if (focavelSemNome(el)) el.setAttribute('aria-label', 'Toggle on or off');
    });

    // --- tags removiveis: o "x" de remover
    document.querySelectorAll('.tag_remove').forEach(x => {
        if (!focavelSemNome(x)) return;
        const nome = x.closest('.tag')?.querySelector('.tag_name')?.textContent?.trim();
        x.setAttribute('aria-label', nome ? 'Remove tag: ' + nome : 'Remove tag');
    });

    // --- botoes de filtro/gestao de tags (icones sem texto)
    const tagBotoes = { filterByFavorites: 'Filter by favorites', manageTags: 'Manage tags' };
    for (const [cls, nome] of Object.entries(tagBotoes)) {
        document.querySelectorAll('.tag.' + cls).forEach(t => {
            if (focavelSemNome(t)) t.setAttribute('aria-label', nome);
        });
    }

    // --- por id conhecido
    for (const [id, nome] of Object.entries(POR_ID)) {
        const el = document.getElementById(id);
        if (el && focavelSemNome(el)) el.setAttribute('aria-label', nome);
    }

    // --- rede de seguranca por icone, para o que sobrou
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
