/**
 * Top navigation bar accessibility
 *
 * The top bar has the icons that open the big panels (AI configuration,
 * connections, formatting, World Info, settings, extensions, personas,
 * characters). SillyTavern (keyboard.js) already makes those .drawer-icon
 * focusable and role=button, and the title serves as the name. Two things are
 * missing:
 *
 *  - state: nothing tells whether the panel is open or closed (aria-expanded);
 *  - one icon with no title (Backgrounds) ends up with no name at all.
 *
 * Non-invasive module: only adds the missing semantics.
 */

const BARRA = '#top-settings-holder';

/** Names for the icons that have no title of their own. */
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

    // Name: use the title (already in English); if there is none, use the map.
    const temNome = icone.hasAttribute('aria-label') || icone.getAttribute('title');
    if (!temNome && NOMES_POR_DRAWER[drawer.id]) {
        icone.setAttribute('aria-label', NOMES_POR_DRAWER[drawer.id]);
    }

    if (painel.id) icone.setAttribute('aria-controls', painel.id);

    // Open/closed state. SillyTavern sometimes applies the openDrawer class only
    // after an animation and closes on an outside click, so we watch the class.
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
    // The bar exists from load; a light observer covers any drawer added by
    // extensions later.
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
