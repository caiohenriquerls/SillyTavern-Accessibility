/**
 * Prompt Manager Accessibility
 *
 * SillyTavern's Prompt Manager draws each toggle as an empty <span> whose only
 * state is the CSS class name (fa-toggle-on / fa-toggle-off). To the
 * accessibility tree that is not a control: no role, no name, no state, and it
 * cannot be focused with the keyboard.
 *
 * This extension does not modify SillyTavern's code. It observes the list and,
 * on every redraw, turns the elements into real switches.
 *
 * Nothing here changes the visual appearance.
 */

const LIST_ID = 'completion_prompt_manager_list';
const ROW = 'li.completion_prompt_manager_prompt';
const NAME = '.completion_prompt_manager_prompt_name';
const TOGGLE = '.prompt-manager-toggle-action';
const EDIT = '.prompt-manager-edit-action';
const DETACH = '.prompt-manager-detach-action';
const TOKENS = '.prompt_manager_prompt_tokens';

/** Rows that are only visual separators, not modules. */
const SEPARADOR = /^\s*=|=\s*$|pick one|edit custom toggles/i;

let anunciador = null;
let focoPendente = null;
let observadorLista = null;

/* ------------------------------------------------------------------ */
/* utilities                                                           */
/* ------------------------------------------------------------------ */

/**
 * Removes emoji and decorative symbols from the name.
 * Without this the reader says "lightning-emoji Main Prompt robot-emoji".
 * The visible text stays intact: this only goes into the aria-label.
 */
function limparNome(texto) {
    if (!texto) return '';
    let s = texto;
    try {
        s = s.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ' ');
        s = s.replace(/[︀-️‍⃣]/gu, '');
    } catch {
        s = s.replace(/[←-⯿☀-➿]/g, ' ');
        s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ');
    }
    s = s.replace(/[=─-╿_]{2,}/g, ' ');
    s = s.replace(/^\s*[=_\s]+|[=_\s]+$/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s || 'unnamed module';
}

function anunciar(msg) {
    if (!anunciador) return;
    // clearing first forces the reader to re-announce identical text
    anunciador.textContent = '';
    window.setTimeout(() => { anunciador.textContent = msg; }, 60);
}

function criarAnunciador() {
    if (document.getElementById('pma11y-live')) return;
    const el = document.createElement('div');
    el.id = 'pma11y-live';
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'pma11y-sr-only';
    document.body.appendChild(el);
    anunciador = el;
}

function estaLigado(toggle) {
    return toggle.classList.contains('fa-toggle-on');
}

/**
 * Keyboard activation. SillyTavern only listens for 'click', so Enter and
 * Space have to be translated into a click.
 */
function tratarTecla(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.click();
}

/* ------------------------------------------------------------------ */
/* mutually exclusive groups                                           */
/* ------------------------------------------------------------------ */

/**
 * Many presets (the Freaky Frankenstein among them) delimit "pick one" groups
 * with separator rows. We read that convention to warn when two modules of the
 * same group are enabled at the same time. It only warns: it never turns
 * anything off on its own.
 */
function grupoDaLinha(lista, linha) {
    const linhas = Array.from(lista.querySelectorAll(ROW));
    let idx = linhas.indexOf(linha);
    if (idx < 0) return null;

    let rotulo = null;
    let inicio = 0;
    for (let i = idx; i >= 0; i--) {
        const n = linhas[i].querySelector(NAME)?.dataset.pmName || '';
        if (SEPARADOR.test(n)) { rotulo = limparNome(n); inicio = i + 1; break; }
    }
    if (rotulo === null) return null;

    const membros = [];
    for (let i = inicio; i < linhas.length; i++) {
        const n = linhas[i].querySelector(NAME)?.dataset.pmName || '';
        if (SEPARADOR.test(n)) break;
        membros.push(linhas[i]);
    }
    return { rotulo, membros };
}

function conferirGrupo(lista, linha) {
    const g = grupoDaLinha(lista, linha);
    if (!g || g.membros.length < 2) return;
    const ativos = g.membros.filter(m => {
        const t = m.querySelector(TOGGLE);
        return t && estaLigado(t);
    });
    if (ativos.length > 1) {
        const nomes = ativos
            .map(m => limparNome(m.querySelector(NAME)?.dataset.pmName || ''))
            .join(', ');
        anunciar(`Warning. ${ativos.length} modules enabled in group ${g.rotulo}. ${nomes}.`);
    }
}

/* ------------------------------------------------------------------ */
/* application                                                         */
/* ------------------------------------------------------------------ */

function tratarClique(ev) {
    const toggle = ev.currentTarget;
    const linha = toggle.closest(ROW);
    const lista = document.getElementById(LIST_ID);
    const nome = limparNome(linha?.querySelector(NAME)?.dataset.pmName || '');

    // SillyTavern flips the state afterwards; we announce the upcoming value
    const futuro = !estaLigado(toggle);
    anunciar(`${nome}: ${futuro ? 'enabled' : 'disabled'}.`);

    // the whole list is redrawn, which destroys the focused element
    focoPendente = linha?.dataset.pmIdentifier || null;

    if (lista && linha) {
        window.setTimeout(() => conferirGrupo(lista,
            lista.querySelector(`${ROW}[data-pm-identifier="${CSS.escape(linha.dataset.pmIdentifier)}"]`) || linha), 250);
    }
}

function enriquecerLinha(linha) {
    const spanNome = linha.querySelector(NAME);
    const bruto = spanNome?.dataset.pmName || spanNome?.textContent || '';
    const nome = limparNome(bruto);
    const separador = SEPARADOR.test(bruto);

    // decorative icons and the drag handle should not be read
    linha.querySelectorAll('.drag-handle, .fa-fw.fa-solid, [class*="fa-"]:empty')
        .forEach(el => {
            if (el.matches(`${TOGGLE}, ${EDIT}, ${DETACH}`)) return;
            el.setAttribute('aria-hidden', 'true');
        });

    // clean name, without emoji
    const alvoNome = spanNome?.querySelector('a') || spanNome;
    if (alvoNome && !alvoNome.dataset.pma11y) {
        alvoNome.setAttribute('aria-label', nome);
        alvoNome.dataset.pma11y = '1';
        if (alvoNome.tagName === 'A') {
            alvoNome.setAttribute('role', 'button');
            if (!alvoNome.hasAttribute('tabindex')) alvoNome.setAttribute('tabindex', '0');
            alvoNome.addEventListener('keydown', tratarTecla);
        }
    }

    // token count
    const tok = linha.querySelector(TOKENS);
    if (tok && !tok.dataset.pma11y) {
        const n = tok.dataset.pmTokens || tok.textContent.trim();
        tok.setAttribute('aria-label', n === '-' ? 'no tokens' : `${n} tokens`);
        tok.dataset.pma11y = '1';
    }

    // the toggle: from decorative span to a real switch
    const toggle = linha.querySelector(TOGGLE);
    if (toggle) {
        const ligado = estaLigado(toggle);
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', ligado ? 'true' : 'false');
        toggle.setAttribute('aria-label', nome);
        toggle.setAttribute('tabindex', '0');
        toggle.setAttribute('title', `${nome}: ${ligado ? 'enabled' : 'disabled'}`);
        if (separador) toggle.setAttribute('aria-describedby', 'pma11y-sep');
        if (!toggle.dataset.pma11y) {
            toggle.addEventListener('keydown', tratarTecla);
            toggle.addEventListener('click', tratarClique);
            toggle.dataset.pma11y = '1';
        }
    }

    // edit and remove are also mute spans
    const edit = linha.querySelector(EDIT);
    if (edit && !edit.dataset.pma11y) {
        edit.setAttribute('role', 'button');
        edit.setAttribute('tabindex', '0');
        edit.setAttribute('aria-label', `Edit ${nome}`);
        edit.addEventListener('keydown', tratarTecla);
        edit.dataset.pma11y = '1';
    }
    const det = linha.querySelector(DETACH);
    if (det && !det.dataset.pma11y) {
        det.setAttribute('role', 'button');
        det.setAttribute('tabindex', '0');
        det.setAttribute('aria-label', `Remove ${nome}`);
        det.addEventListener('keydown', tratarTecla);
        det.dataset.pma11y = '1';
    }
}

function aplicar() {
    const lista = document.getElementById(LIST_ID);
    if (!lista) return;

    if (!lista.dataset.pma11y) {
        lista.setAttribute('role', 'list');
        lista.setAttribute('aria-label', 'Prompt modules. Use Enter or Space to toggle.');
        lista.dataset.pma11y = '1';
    }

    lista.querySelectorAll(ROW).forEach(enriquecerLinha);

    // restore focus after the redraw
    if (focoPendente) {
        const alvo = lista.querySelector(
            `${ROW}[data-pm-identifier="${CSS.escape(focoPendente)}"] ${TOGGLE}`);
        focoPendente = null;
        if (alvo) window.setTimeout(() => alvo.focus(), 0);
    }
}

/* ------------------------------------------------------------------ */
/* initialization                                                      */
/* ------------------------------------------------------------------ */

function ligarObservadorLista() {
    const lista = document.getElementById(LIST_ID);
    if (!lista || observadorLista) return;
    observadorLista = new MutationObserver(() => {
        window.clearTimeout(ligarObservadorLista._t);
        ligarObservadorLista._t = window.setTimeout(aplicar, 40);
    });
    observadorLista.observe(lista, { childList: true, subtree: true });
    aplicar();
}

function iniciar() {
    criarAnunciador();

    const dica = document.createElement('span');
    dica.id = 'pma11y-sep';
    dica.className = 'pma11y-sr-only';
    dica.textContent = 'Group separator, no effect on the prompt.';
    document.body.appendChild(dica);

    ligarObservadorLista();

    // the list only exists after the panel is opened
    new MutationObserver(() => {
        if (!observadorLista) ligarObservadorLista();
        else aplicar();
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

// also loads the other accessibility modules
import './lorebook.js';
import './character.js';
import './navigation.js';
import './chat.js';
import './persona.js';
import './pastchats.js';
import './labels.js';
import './collapsibles.js';
import './menus.js';
import './pins.js';
import './namefixes.js';
import './keyboardfix.js';
// Last: fills in the title (as aria-label) for everything the modules above
// did not name explicitly -- so the specific labels take priority.
import './titles.js';

export { iniciar as init };
