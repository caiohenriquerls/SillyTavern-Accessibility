/**
 * Chat area accessibility (send bar + message swipes)
 *
 * O SillyTavern (keyboard.js) ja torna os botoes de mensagem e da barra de
 * envio focaveis, e a maioria tem title, entao o leitor os anuncia. Faltam os
 * controles SEM title, que ficam como botao sem nome:
 *
 *  - o botao de opcoes (as tres barrinhas) na barra de envio;
 *  - a caixa de digitar mensagem (so tem placeholder, sem nome estavel);
 *  - as setas de trocar resposta (swipe) em cada mensagem.
 *
 * Modulo nao invasivo: so acrescenta papel e nome onde faltam.
 */

const CHAT = '#chat';

let observadorChat = null;

/** Barra de envio: controles fixos sem nome. */
function enriquecerBarraEnvio() {
    const opcoes = document.getElementById('options_button');
    if (opcoes && !opcoes.hasAttribute('aria-label')) {
        if (!opcoes.hasAttribute('role')) opcoes.setAttribute('role', 'button');
        opcoes.setAttribute('aria-label', 'Options menu');
        // Semantica de menu (haspopup, expanded, foco) fica no modulo menus.js.
    }

    const texto = document.getElementById('send_textarea');
    if (texto && !texto.hasAttribute('aria-label')) {
        texto.setAttribute('aria-label', 'Message input');
    }

    // Botao "wand" que abre o menu de extensoes/acoes rapidas.
    // A semantica de menu (haspopup, expanded, foco) fica no modulo menus.js.
    const wand = document.getElementById('extensionsMenuButton');
    if (wand && !wand.hasAttribute('aria-label')) {
        if (!wand.hasAttribute('role')) wand.setAttribute('role', 'button');
        wand.setAttribute('aria-label', 'Extensions and quick actions menu');
    }
}

/** Setas de swipe: sao <div> sem title, uma por mensagem. */
function enriquecerSwipes(raiz) {
    raiz.querySelectorAll('.swipe_left').forEach(el => {
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Previous response');
    });
    raiz.querySelectorAll('.swipe_right').forEach(el => {
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Next response');
    });
}

function aplicar() {
    enriquecerBarraEnvio();
    const chat = document.querySelector(CHAT);
    if (chat) enriquecerSwipes(chat);
}

function ligarObservador() {
    const chat = document.querySelector(CHAT);
    if (!chat || observadorChat) return;
    observadorChat = new MutationObserver(() => {
        window.clearTimeout(ligarObservador._t);
        ligarObservador._t = window.setTimeout(aplicar, 60);
    });
    observadorChat.observe(chat, { childList: true, subtree: true });
    aplicar();
}

function iniciar() {
    enriquecerBarraEnvio();
    ligarObservador();
    // O #chat existe desde o carregamento, mas as mensagens (e seus swipes)
    // chegam depois; observamos o body ate o chat aparecer/mudar.
    new MutationObserver(() => {
        if (!observadorChat) ligarObservador();
        else aplicar();
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initChat };
