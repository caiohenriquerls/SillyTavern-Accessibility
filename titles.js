/**
 * Promote title -> aria-label
 *
 * Quase todos os botoes de icone do SillyTavern sao nomeados so pelo atributo
 * `title`. Isso funciona no modo foco do NVDA (Tab), mas no modo de navegacao
 * (setas / cursor virtual) o `title` NAO e lido de forma confiavel -- entao o
 * usuario passava pelos botoes (AI Response Configuration, API Connections, os
 * botoes das mensagens, etc.) sem ouvir nome nenhum.
 *
 * A correcao correta e dar a esses controles um `aria-label`, que e lido em
 * todos os modos e leitores. Aqui copiamos o `title` (a primeira linha, que e
 * o nome; o resto costuma ser instrucao/atalho) para `aria-label`, mantendo o
 * `title` para o tooltip visual. So mexemos em quem e focavel, nao tem nome
 * ainda e nao tem texto proprio (texto proprio ja e lido nas setas).
 */

const FOCAVEL = '.interactable, [role="button"], .menu_button, .right_menu_button, '
    + '.drawer-icon, .inline-drawer-icon, .mes_button, button, a, input, select, '
    + 'textarea, [tabindex="0"]';

function promover(el) {
    if (el.getAttribute('tabindex') === '-1') return;
    if (el.getAttribute('aria-hidden') === 'true') return;
    if (el.disabled) return;
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) return;
    // Texto proprio (incluindo de filhos) ja e anunciado nas setas.
    if ((el.textContent || '').trim()) return;
    // Campo de formulario com <label> associado tambem ja tem nome.
    if (el.labels && el.labels.length && [...el.labels].some(l => l.textContent.trim())) return;
    const title = el.getAttribute('title');
    if (!title || !title.trim()) return;
    const nome = title.split(/[\r\n]/).map(s => s.trim()).find(Boolean);
    if (nome) el.setAttribute('aria-label', nome);
}

function aplicar() {
    document.querySelectorAll('[title]').forEach(el => {
        if (el.matches(FOCAVEL)) promover(el);
    });
}

function iniciar() {
    aplicar();
    // Mensagens, cards e paineis chegam depois; observador leve cobre isso.
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(aplicar, 150);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initTitles };
