/**
 * Collapsible sections (inline-drawer) accessibility
 *
 * O SillyTavern usa .inline-drawer por toda parte (cada extensao no painel de
 * Extensions e uma; tambem em configuracoes, grupos, etc.). O cabecalho e um
 * .inline-drawer-toggle com o texto da secao, mas quem recebe o foco pelo
 * teclado e o chevron .inline-drawer-icon dentro dele -- e esse chevron nao
 * tem nome nem estado. Resultado: o leitor anuncia "button" sem dizer qual
 * secao nem se esta aberta.
 *
 * Aqui damos ao chevron o nome da secao (role=button + aria-label) e mantemos
 * o aria-expanded em dia. As entradas do World Info tem tratamento proprio no
 * lorebook.js (marcadas com data-lorea11y), entao pulamos elas.
 */

const TOGGLE = '.inline-drawer-toggle';

/** O elemento focavel: o proprio toggle (quando ja e o icone) ou o chevron. */
function iconeDe(toggle) {
    if (toggle.classList.contains('inline-drawer-icon')) return toggle;
    return toggle.querySelector('.inline-drawer-icon');
}

/** Texto do cabecalho, limpo (remove o "?" solto dos links de ajuda). */
function textoDe(toggle) {
    return (toggle.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/\s*\?\s*$/, '')
        .trim();
}

function atualizarEstado(icone) {
    // O ST alterna a classe "up" (aberto) / "down" (fechado) no chevron.
    icone.setAttribute('aria-expanded', icone.classList.contains('up') ? 'true' : 'false');
}

function enriquecer(toggle) {
    const icone = iconeDe(toggle);
    if (!icone) return;
    if (icone.dataset.lorea11y) return; // ja tratado pelo lorebook.js

    atualizarEstado(icone);

    if (icone.dataset.a11yCollapsible) return;
    if (!icone.hasAttribute('role')) icone.setAttribute('role', 'button');
    if (!icone.hasAttribute('aria-label')) {
        const txt = textoDe(toggle);
        if (txt) icone.setAttribute('aria-label', txt);
    }
    icone.dataset.a11yCollapsible = '1';
}

function aplicar(raiz = document) {
    raiz.querySelectorAll(TOGGLE).forEach(enriquecer);
}

function iniciar() {
    aplicar();

    // Atualiza o estado logo apos qualquer clique num cabecalho (o ST alterna a
    // classe do chevron de forma sincrona, entao um tempo curto basta).
    document.addEventListener('click', (e) => {
        const alvo = e.target instanceof Element ? e.target.closest(TOGGLE) : null;
        if (!alvo) return;
        const icone = iconeDe(alvo);
        if (icone && !icone.dataset.lorea11y) {
            window.setTimeout(() => atualizarEstado(icone), 50);
        }
    }, true);

    // Secoes de extensoes e outras chegam depois; observador leve cobre isso.
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(() => aplicar(), 150);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initCollapsibles };
