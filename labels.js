/**
 * Settings sliders labels
 *
 * O SillyTavern usa por toda parte o par "slider + campo numerico" da classe
 * neo-range: um <small> com o texto (ex.: "Response (tokens)", "Temperature")
 * vem antes de <input class="neo-range-slider"> e de <input class="neo-range-input">.
 * Esse <small> nao esta associado a nenhum dos dois, entao o leitor de tela
 * anuncia so "slider" e "spin button", sem nome.
 *
 * Este modulo associa o texto visual a cada slider e ao seu campo numerico,
 * sem mudar nada na tela. Sao ~70 pares em todo o app.
 */

const SLIDER = '.neo-range-slider';
const CAMPO = '.neo-range-input';

let observador = null;

/** Texto limpo de um elemento de rotulo (ignora icones sem texto). */
function textoRotulo(el) {
    if (!el) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Ja tem um <label for=""> associado? Entao nao mexemos. */
function jaTemLabel(el) {
    if (el.hasAttribute('aria-label')) return true;
    if (el.labels && el.labels.length) {
        for (const l of el.labels) if (textoRotulo(l)) return true;
    }
    return false;
}

/**
 * Descobre o texto do rotulo de um slider: normalmente e o <small> irmao
 * anterior; se nao houver, procuramos um <small> no mesmo bloco.
 */
function rotuloDoSlider(slider) {
    let el = slider.previousElementSibling;
    while (el) {
        if (el.tagName === 'SMALL' || el.tagName === 'LABEL' || el.tagName === 'SPAN') {
            const t = textoRotulo(el);
            if (t) return t;
        }
        el = el.previousElementSibling;
    }
    // fallback: primeiro <small> do container imediato
    const pai = slider.parentElement;
    if (pai) {
        const small = pai.querySelector(':scope > small, :scope > label');
        const t = textoRotulo(small);
        if (t) return t;
    }
    return '';
}

function aplicar(raiz = document) {
    raiz.querySelectorAll(SLIDER).forEach(slider => {
        if (slider.dataset.a11yLabel) return;
        if (jaTemLabel(slider)) { slider.dataset.a11yLabel = '1'; return; }
        const texto = rotuloDoSlider(slider);
        if (!texto) return;
        slider.setAttribute('aria-label', texto);
        slider.dataset.a11yLabel = '1';
        // campo numerico pareado (data-for aponta para o id do slider)
        if (slider.id) {
            const campo = document.querySelector(`${CAMPO}[data-for="${slider.id}"]`);
            if (campo && !jaTemLabel(campo)) {
                campo.setAttribute('aria-label', texto);
                campo.dataset.a11yLabel = '1';
            }
        }
    });
}

function iniciar() {
    aplicar();
    // A maioria dos sliders e estatica, mas paineis de extensoes podem trazer
    // mais depois; um observador leve cobre isso.
    observador = new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(() => aplicar(), 150);
    });
    observador.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initLabels };
