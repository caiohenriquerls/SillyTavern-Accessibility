/**
 * Settings sliders labels
 *
 * SillyTavern uses the "slider + number field" pair from the neo-range class
 * everywhere: a <small> with the text (e.g. "Response (tokens)", "Temperature")
 * comes before <input class="neo-range-slider"> and <input class="neo-range-input">.
 * That <small> is not associated with either of them, so the screen reader
 * announces only "slider" and "spin button", with no name.
 *
 * This module associates the visual text with each slider and its number field,
 * without changing anything on screen. There are ~70 pairs across the app.
 */

const SLIDER = '.neo-range-slider';
const CAMPO = '.neo-range-input';

let observador = null;

/** Clean text of a label element (ignores text-less icons). */
function textoRotulo(el) {
    if (!el) return '';
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Already has an associated <label for="">? Then we leave it alone. */
function jaTemLabel(el) {
    if (el.hasAttribute('aria-label')) return true;
    if (el.labels && el.labels.length) {
        for (const l of el.labels) if (textoRotulo(l)) return true;
    }
    return false;
}

/**
 * Finds a slider's label text: usually the previous <small> sibling; if there
 * is none, we look for a <small> in the same block.
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
    // fallback: first <small> of the immediate container
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
        // paired number field (data-for points to the slider's id)
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
    // Most sliders are static, but extension panels can bring more later; a
    // light observer covers that.
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
