/**
 * Panel pin toggles accessibility
 *
 * Each panel (drawer) has a "pin" that keeps it open. The structure is a real
 * checkbox inside a <label> with NO text, plus two decorative halves (the
 * fa-unlock / fa-lock icons). SillyTavern (keyboard.js) makes those halves
 * focusable as an unnamed "button", and the checkbox, having an empty label,
 * also ends up with no name.
 *
 * Here: we name the checkbox and take the decorative icons out of navigation.
 */

function enriquecerPino(div) {
    const cb = div.querySelector('input[type="checkbox"]');
    if (cb && !cb.hasAttribute('aria-label')) {
        const titulo = div.getAttribute('title') || 'Keep this panel open';
        cb.setAttribute('aria-label', titulo);
    }
    // Decorative halves (open/closed lock): out of the reading and tab order.
    div.querySelectorAll('.unchecked, .checked').forEach(icone => {
        icone.setAttribute('aria-hidden', 'true');
        icone.setAttribute('tabindex', '-1');
    });
}

function aplicar() {
    // The pin divs have an id ending in "_pin_div".
    document.querySelectorAll('[id$="_pin_div"]').forEach(enriquecerPino);
}

function iniciar() {
    aplicar();
    // Some panels arrive later; a light observer covers that.
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
