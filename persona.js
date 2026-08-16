/**
 * Persona Management accessibility
 *
 * O painel de Personas tem, como o resto, botoes e campos que o leitor nao
 * anuncia bem. O SillyTavern (keyboard.js) ja da foco e Enter aos .menu_button
 * e aos cards .avatar-container, e a maioria dos botoes de icone tem title.
 * As lacunas reais aqui sao:
 *
 *  - os cards de persona (.avatar-container) nao tem papel nem nome: o unico
 *    title deles e o nome do arquivo (ex.: "user-default.png"), inutil;
 *  - a busca, a ordenacao, a descricao e a posicao da descricao nao tem
 *    rotulo proprio;
 *  - o botao "+" de adicionar persona e os botoes de travar (texto so "Default",
 *    "Character", "Chat") sao vagos fora de contexto.
 *
 * Modulo nao invasivo: so acrescenta papel e nome onde faltam.
 */

const PAINEL = '#PersonaManagement';
const CARDS = '#user_avatar_block .avatar-container';

/** Botoes cujo texto/estado visivel e vago: id -> nome falado claro. */
const BOTOES = {
    'create_dummy_persona': 'Create persona',
    'lock_persona_default': 'Set as default persona for new chats',
    'lock_persona_to_char': 'Lock persona to current character',
    'lock_user_name': 'Lock persona to current chat',
};

/** Campos sem rotulo proprio: id -> nome falado. */
const CAMPOS = {
    'persona_search_bar': 'Search personas',
    'persona_sort_order': 'Sort personas by',
    'persona_description': 'Persona description',
    'persona_description_position': 'Persona description position',
    'persona-management-dropdown': 'Persona actions',
};

let observador = null;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Remove emoji e simbolos decorativos para o nome nao sair ilegivel. */
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
/* conserto do painel                                                  */
/* ------------------------------------------------------------------ */

function enriquecerBotoes(raiz) {
    for (const [id, rotulo] of Object.entries(BOTOES)) {
        const el = raiz.querySelector('#' + id);
        if (el && !el.hasAttribute('aria-label')) {
            if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
            el.setAttribute('aria-label', rotulo);
        }
    }

    // Botao "+" de adicionar persona (so tem o simbolo "+").
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
        // Estado de persona atual tambem via aria-current.
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
/* inicializacao                                                       */
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
