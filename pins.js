/**
 * Panel pin toggles accessibility
 *
 * Cada painel (drawer) tem um "pino" que o mantem aberto. A estrutura e um
 * checkbox de verdade dentro de um <label> SEM texto, mais duas metades
 * decorativas (os icones fa-unlock / fa-lock). O SillyTavern (keyboard.js)
 * torna essas metades focaveis como "button" -- sem nome -- e o checkbox, por
 * ter um label vazio, tambem fica sem nome.
 *
 * Aqui: damos nome ao checkbox e tiramos os icones decorativos da navegacao.
 */

function enriquecerPino(div) {
    const cb = div.querySelector('input[type="checkbox"]');
    if (cb && !cb.hasAttribute('aria-label')) {
        const titulo = div.getAttribute('title') || 'Keep this panel open';
        cb.setAttribute('aria-label', titulo);
    }
    // Metades decorativas (cadeado aberto/fechado): fora da leitura e da tabulacao.
    div.querySelectorAll('.unchecked, .checked').forEach(icone => {
        icone.setAttribute('aria-hidden', 'true');
        icone.setAttribute('tabindex', '-1');
    });
}

function aplicar() {
    // Os divs de pino tem id terminando em "_pin_div".
    document.querySelectorAll('[id$="_pin_div"]').forEach(enriquecerPino);
}

function iniciar() {
    aplicar();
    // Alguns paineis chegam depois; observador leve cobre isso.
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

export { iniciar as initPins };
