/**
 * Popup menus (options + wand) accessibility
 *
 * O botao de opcoes (#options_button) e o botao "wand" (#extensionsMenuButton)
 * abrem menus (#options / #extensionsMenu) que ficam longe deles no DOM, la
 * embaixo depois do chat. O SillyTavern mostra o menu mas NAO move o foco para
 * ele. Resultado: o leitor de tela anunciava "tem submenu", mas o foco ficava
 * preso no botao e os itens eram lidos como links soltos abaixo da conversa.
 *
 * Correcao (padrao "disclosure"):
 *  - o botao ganha aria-haspopup, aria-controls e aria-expanded;
 *  - ao abrir, o foco vai para o primeiro item; ao fechar, volta ao botao;
 *  - Escape fecha.
 *
 * IMPORTANTE: NAO usamos role=menu / role=menuitem de proposito. Os itens do
 * SillyTavern sao <a> sem href, ativados pelo handler de teclado do core (Enter
 * -> click). Marcar role=menu coloca o NVDA em "modo menu", que intercepta o
 * Enter e impede a ativacao (ex.: nao dava para regenerar). Deixando os itens
 * como links focaveis normais, o usuario navega com Tab (ou setas no modo
 * navegacao) e ativa com Enter, exatamente como o resto do app.
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
            // Ao fechar, so devolvemos o foco se ele se perdeu (foi para o body)
            // ou ainda esta dentro do menu -- assim nao atrapalhamos acoes que
            // movem o foco de proposito (ex.: regenerar foca o chat).
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

    // Escape fecha o menu e devolve o foco ao botao. Nao tocamos em mais nenhuma
    // tecla, para nao interferir na ativacao dos itens (Enter continua nativo).
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
