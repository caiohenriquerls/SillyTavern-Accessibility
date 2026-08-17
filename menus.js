/**
 * Popup menus (options + wand) accessibility
 *
 * The options button (#options_button) and the "wand" button
 * (#extensionsMenuButton) open menus (#options / #extensionsMenu) that sit far
 * from them in the DOM, down below the chat. SillyTavern shows the menu but does
 * NOT move focus into it. Result: the screen reader announced "has submenu" but
 * focus stayed on the button and the items were read as stray links below the
 * conversation.
 *
 * Fix (the "disclosure" pattern):
 *  - the button gets aria-haspopup, aria-controls and aria-expanded;
 *  - on open, focus moves to the first item; on close, back to the button;
 *  - Escape closes.
 *
 * IMPORTANT: we deliberately do NOT use role=menu / role=menuitem. SillyTavern's
 * items are <a> without href, activated by the core keyboard handler (Enter ->
 * click). Marking role=menu puts NVDA into "menu mode", which intercepts Enter
 * and blocks activation (e.g. regenerate stopped working). By leaving the items
 * as plain focusable links, the user navigates with Tab (or arrows in browse
 * mode) and activates with Enter, exactly like the rest of the app.
 */

const MENUS = [
    { btn: 'options_button', menu: 'options', itens: '.options-content > a, #options a' },
    { btn: 'extensionsMenuButton', menu: 'extensionsMenu', itens: '.interactable, .extension_container' },
];

function visivel(el) {
    return !!el && el.offsetParent !== null;
}

function configurarMenu({ btn: btnId, menu: menuId, itens: itemSel }) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;

    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-controls', menuId);
    btn.setAttribute('aria-expanded', 'false');

    const itens = () => [...menu.querySelectorAll(itemSel)].filter(visivel);

    let estavaAberto = false;
    function sincronizar() {
        const aberto = visivel(menu);
        if (aberto === estavaAberto) return;
        estavaAberto = aberto;
        btn.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        if (aberto) {
            const lista = itens();
            if (lista[0]) window.setTimeout(() => lista[0].focus(), 0);
        } else {
            // On close, we only return focus if it was lost (went to the body)
            // or is still inside the menu -- this way we do not interfere with
            // actions that move focus on purpose (e.g. regenerate focuses the chat).
            const ae = document.activeElement;
            if (!ae || ae === document.body || menu.contains(ae)) {
                window.setTimeout(() => btn.focus(), 0);
            }
        }
    }

    new MutationObserver(sincronizar).observe(menu, {
        attributes: true, attributeFilter: ['style', 'class'], childList: true, subtree: true,
    });
    sincronizar();

    // Escape closes the menu and returns focus to the button. We do not touch
    // any other key, so as not to interfere with item activation (Enter stays native).
    menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && visivel(menu)) {
            e.preventDefault();
            btn.click();
            window.setTimeout(() => btn.focus(), 0);
        }
    });
}

function iniciar() {
    MENUS.forEach(configurarMenu);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initMenus };
