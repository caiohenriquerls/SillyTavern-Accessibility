/**
 * Top navigation bar accessibility
 *
 * A barra de cima tem os icones que abrem os grandes paineis (configuracao da
 * IA, conexoes, formatacao, World Info, ajustes, extensoes, personas,
 * personagens). O SillyTavern (keyboard.js) ja torna esses .drawer-icon
 * focaveis e com role=button, e o title serve de nome. Faltam duas coisas:
 *
 *  - o estado: nada diz se o painel esta aberto ou fechado (aria-expanded);
 *  - um icone sem title (Backgrounds) fica sem nome nenhum.
 *
 * Modulo nao invasivo: so acrescenta a semantica que falta.
 */

const BARRA = '#top-settings-holder';

/** Nomes para os icones que nao tem title proprio. */
const NOMES_POR_DRAWER = {
    'backgrounds-button': 'Backgrounds',
};

const observados = new WeakSet();

function sincronizarEstado(icone, painel) {
    const aberto = painel.classList.contains('openDrawer');
    icone.setAttribute('aria-expanded', aberto ? 'true' : 'false');
}

function enriquecerDrawer(drawer) {
    const icone = drawer.querySelector('.drawer-toggle .drawer-icon') ||
        drawer.querySelector('.drawer-icon');
    const painel = drawer.querySelector('.drawer-content');
    if (!icone || !painel) return;

    if (!icone.hasAttribute('role')) icone.setAttribute('role', 'button');

    // Nome: usa o title (ja em ingles); se nao houver, usa o mapa.
    const temNome = icone.hasAttribute('aria-label') || icone.getAttribute('title');
    if (!temNome && NOMES_POR_DRAWER[drawer.id]) {
        icone.setAttribute('aria-label', NOMES_POR_DRAWER[drawer.id]);
    }

    if (painel.id) icone.setAttribute('aria-controls', painel.id);

    // Estado aberto/fechado. O ST aplica a classe openDrawer as vezes depois de
    // uma animacao e fecha no clique de fora, entao observamos a classe.
    sincronizarEstado(icone, painel);
    if (!observados.has(painel)) {
        observados.add(painel);
        new MutationObserver(() => sincronizarEstado(icone, painel))
            .observe(painel, { attributes: true, attributeFilter: ['class'] });
    }
}

function aplicar() {
    const barra = document.querySelector(BARRA);
    if (!barra) return;
    barra.querySelectorAll(':scope > .drawer').forEach(enriquecerDrawer);
}

function iniciar() {
    aplicar();
    // A barra existe desde o carregamento; um observador leve cobre qualquer
    // drawer adicionado por extensoes depois.
    const barra = document.querySelector(BARRA);
    if (barra) {
        new MutationObserver(() => {
            window.clearTimeout(iniciar._t);
            iniciar._t = window.setTimeout(aplicar, 100);
        }).observe(barra, { childList: true });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initNavigation };
