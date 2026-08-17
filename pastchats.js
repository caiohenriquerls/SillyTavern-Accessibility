/**
 * Past chats (Manage chat files) accessibility
 *
 * The "Chat History" window lists the saved chats. Each item is a clickable
 * .select_chat_block, but the chat name lives in a <small> inside it, so the
 * block itself has no name. The rename/export/delete buttons have a title (core
 * covers them), but they are clearer with the chat name attached. The search
 * field and the close button also have no label.
 *
 * Non-invasive module: only adds role and name where they are missing.
 */

const POPUP = '#shadow_select_chat_popup';
const LISTA = '#select_chat_div';
const BLOCO = '.select_chat_block';
const NOME = '.select_chat_block_filename';

/** Action buttons inside each block: class -> name prefix. */
const ACOES = [
    ['.renameChatButton', 'Rename chat: '],
    ['.exportRawChatButton', 'Export chat as JSONL: '],
    ['.exportChatButton', 'Download chat as text: '],
    ['.PastChat_cross', 'Delete chat: '],
];

let observador = null;

function nomeDoBloco(bloco) {
    const el = bloco.querySelector(NOME);
    return (el && el.textContent || '').trim() || 'untitled chat';
}

function enriquecerBloco(bloco) {
    const nome = nomeDoBloco(bloco);

    if (!bloco.hasAttribute('role')) bloco.setAttribute('role', 'button');
    bloco.setAttribute('aria-label', 'Open chat: ' + nome);

    for (const [sel, prefixo] of ACOES) {
        const b = bloco.querySelector(sel);
        if (!b) continue;
        if (!b.hasAttribute('role')) b.setAttribute('role', 'button');
        b.setAttribute('aria-label', prefixo + nome);
    }
}

function enriquecerCabecalho() {
    const busca = document.getElementById('select_chat_search');
    if (busca && !busca.hasAttribute('aria-label')) {
        busca.setAttribute('aria-label', 'Search chats');
    }
    const fechar = document.getElementById('select_chat_cross');
    if (fechar && !fechar.hasAttribute('aria-label')) {
        fechar.setAttribute('role', 'button');
        if (!fechar.hasAttribute('tabindex')) fechar.setAttribute('tabindex', '0');
        fechar.setAttribute('aria-label', 'Close chat history');
    }
}

function aplicar() {
    const popup = document.querySelector(POPUP);
    if (!popup) return;
    enriquecerCabecalho();
    const lista = document.querySelector(LISTA);
    if (lista) lista.querySelectorAll(BLOCO).forEach(enriquecerBloco);
}

function ligarObservador() {
    const popup = document.querySelector(POPUP);
    if (!popup || observador) return;
    observador = new MutationObserver(() => {
        window.clearTimeout(ligarObservador._t);
        ligarObservador._t = window.setTimeout(aplicar, 60);
    });
    observador.observe(popup, { childList: true, subtree: true });
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

export { iniciar as initPastChats };
