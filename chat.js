/**
 * Chat area accessibility (send bar + message swipes)
 *
 * SillyTavern (keyboard.js) already makes the message and send-bar buttons
 * focusable, and most have a title, so the reader announces them. The controls
 * WITHOUT a title are the ones left as an unnamed button:
 *
 *  - the options button (the three bars) in the send bar;
 *  - the message input box (only a placeholder, no stable name);
 *  - the swipe (previous/next response) arrows on each message.
 *
 * Non-invasive module: only adds role and name where they are missing.
 */

const CHAT = '#chat';

let observadorChat = null;

/** Send bar: fixed controls with no name. */
function enriquecerBarraEnvio() {
    const opcoes = document.getElementById('options_button');
    if (opcoes && !opcoes.hasAttribute('aria-label')) {
        if (!opcoes.hasAttribute('role')) opcoes.setAttribute('role', 'button');
        opcoes.setAttribute('aria-label', 'Options menu');
        // Menu semantics (haspopup, expanded, focus) live in the menus.js module.
    }

    const texto = document.getElementById('send_textarea');
    if (texto && !texto.hasAttribute('aria-label')) {
        texto.setAttribute('aria-label', 'Message input');
    }

    // "wand" button that opens the extensions / quick actions menu.
    // Menu semantics (haspopup, expanded, focus) live in the menus.js module.
    const wand = document.getElementById('extensionsMenuButton');
    if (wand && !wand.hasAttribute('aria-label')) {
        if (!wand.hasAttribute('role')) wand.setAttribute('role', 'button');
        wand.setAttribute('aria-label', 'Extensions and quick actions menu');
    }
}

/** Swipe arrows: they are <div> with no title, one per message. */
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
    // #chat exists from load, but the messages (and their swipes) arrive later;
    // we observe the body until the chat appears/changes.
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
