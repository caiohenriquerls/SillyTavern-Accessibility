/**
 * Persona Management accessibility
 *
 * The Personas panel has, like the rest, buttons and fields the reader does not
 * announce well. SillyTavern (keyboard.js) already gives focus and Enter to the
 * .menu_button and the .avatar-container cards, and most icon buttons have a
 * title. The real gaps here are:
 *
 *  - the persona cards (.avatar-container) have no role or name: their only
 *    title is the file name (e.g. "user-default.png"), useless;
 *  - the search, sort, description and description-position fields have no
 *    label of their own;
 *  - the "+" add-persona button and the lock buttons (text just "Default",
 *    "Character", "Chat") are vague out of context.
 *
 * Non-invasive module: only adds role and name where they are missing.
 */

const PAINEL = '#PersonaManagement';
const CARDS = '#user_avatar_block .avatar-container';

/** Buttons whose visible text/state is vague: id -> clear spoken name. */
const BOTOES = {
    'create_dummy_persona': 'Create persona',
    'lock_persona_default': 'Set as default persona for new chats',
    'lock_persona_to_char': 'Lock persona to current character',
    'lock_user_name': 'Lock persona to current chat',
};

/** Fields with no label of their own: id -> spoken name. */
const CAMPOS = {
    'persona_search_bar': 'Search personas',
    'persona_sort_order': 'Sort personas by',
    'persona_description': 'Persona description',
    'persona_description_position': 'Persona description position',
    'persona-management-dropdown': 'Persona actions',
};

let observador = null;

/* ------------------------------------------------------------------ */
/* utilities                                                           */
/* ------------------------------------------------------------------ */

/** Removes emoji and decorative symbols so the name is not unreadable. */
function limparNome(texto) {
    if (!texto) return '';
    let s = texto;
    try {
        s = s.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ' ');
        s = s.replace(/[︀-️‍⃣]/gu, '');
    } catch {
        s = s.replace(/[←-⯿☀-➿]/g, ' ');
        s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ');
    }
    return s.replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* panel                                                               */
/* ------------------------------------------------------------------ */

function enriquecerBotoes(raiz) {
    for (const [id, rotulo] of Object.entries(BOTOES)) {
        const el = raiz.querySelector('#' + id);
        if (el && !el.hasAttribute('aria-label')) {
            if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
            el.setAttribute('aria-label', rotulo);
        }
    }

    // "+" add-persona button (it only has the "+" symbol).
    const upload = raiz.querySelector('#user_avatar_block .avatar_upload');
    if (upload && !upload.hasAttribute('aria-label')) {
        upload.setAttribute('role', 'button');
        if (!upload.hasAttribute('tabindex')) upload.setAttribute('tabindex', '0');
        upload.setAttribute('aria-label', 'Add a new persona (upload image)');
    }
}

function enriquecerCampos(raiz) {
    for (const [id, rotulo] of Object.entries(CAMPOS)) {
        const el = raiz.querySelector('#' + id);
        if (el && !el.hasAttribute('aria-label')) {
            el.setAttribute('aria-label', rotulo);
        }
    }
}

function enriquecerCards(raiz) {
    raiz.querySelectorAll(CARDS).forEach(card => {
        if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
        const nomeEl = card.querySelector('.ch_name');
        const nome = limparNome(nomeEl ? nomeEl.textContent : '');
        if (!nome) return;
        const selecionada = card.classList.contains('selected');
        card.setAttribute('aria-label', 'Persona: ' + nome + (selecionada ? ' (selected)' : ''));
        // Current-persona state also via aria-current.
        if (selecionada) card.setAttribute('aria-current', 'true');
        else card.removeAttribute('aria-current');
    });
}

function aplicar() {
    const painel = document.querySelector(PAINEL);
    if (!painel) return;
    enriquecerBotoes(painel);
    enriquecerCampos(painel);
    enriquecerCards(painel);
}

/* ------------------------------------------------------------------ */
/* initialization                                                      */
/* ------------------------------------------------------------------ */

function ligarObservador() {
    const painel = document.querySelector(PAINEL);
    if (!painel || observador) return;
    observador = new MutationObserver(() => {
        window.clearTimeout(ligarObservador._t);
        ligarObservador._t = window.setTimeout(aplicar, 60);
    });
    observador.observe(painel, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    aplicar();
}

function iniciar() {
    ligarObservador();
    new MutationObserver(() => {
        if (!observador) ligarObservador();
        else aplicar();
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initPersona };
