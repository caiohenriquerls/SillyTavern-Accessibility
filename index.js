/**
 * Prompt Manager Accessibility
 *
 * O Prompt Manager do SillyTavern desenha cada toggle como um <span> vazio
 * cujo unico estado e o nome da classe CSS (fa-toggle-on / fa-toggle-off).
 * Para a arvore de acessibilidade aquilo nao e um controle: nao tem papel,
 * nao tem rotulo, nao tem estado, e nao recebe foco pelo teclado.
 *
 * Esta extensao nao altera o codigo do SillyTavern. Ela observa a lista e,
 * a cada redesenho, converte os elementos em switches de verdade.
 *
 * Nada aqui muda a aparencia visual.
 */

const LIST_ID = 'completion_prompt_manager_list';
const ROW = 'li.completion_prompt_manager_prompt';
const NAME = '.completion_prompt_manager_prompt_name';
const TOGGLE = '.prompt-manager-toggle-action';
const EDIT = '.prompt-manager-edit-action';
const DETACH = '.prompt-manager-detach-action';
const TOKENS = '.prompt_manager_prompt_tokens';

/** Linhas que sao apenas separadores visuais, nao modulos. */
const SEPARADOR = /^\s*=|=\s*$|pick one|edit custom toggles/i;

let anunciador = null;
let focoPendente = null;
let observadorLista = null;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

/**
 * Remove emoji e simbolos decorativos do nome.
 * Sem isso o leitor verbaliza "raio emoji Main Prompt robo emoji".
 * O texto visivel continua intacto: isto vai apenas para o aria-label.
 */
function limparNome(texto) {
    if (!texto) return '';
    let s = texto;
    try {
        s = s.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, ' ');
        s = s.replace(/[\uFE00-\uFE0F\u200D\u20E3]/gu, '');
    } catch {
        s = s.replace(/[\u2190-\u2BFF\u2600-\u27BF]/g, ' ');
        s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ');
    }
    s = s.replace(/[=\u2500-\u257F_]{2,}/g, ' ');
    s = s.replace(/^\s*[=_\s]+|[=_\s]+$/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s || 'unnamed module';
}

function anunciar(msg) {
    if (!anunciador) return;
    // limpar primeiro forca o leitor a reanunciar texto identico
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
 * Ativacao por teclado. O ST so escuta 'click', entao Enter e Espaco
 * precisam ser traduzidos.
 */
function tratarTecla(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.click();
}

/* ------------------------------------------------------------------ */
/* grupos mutuamente exclusivos                                        */
/* ------------------------------------------------------------------ */

/**
 * Muitos presets (o Freaky Frankenstein entre eles) delimitam grupos
 * "escolha um" com linhas separadoras. Lemos essa convencao para avisar
 * quando dois modulos do mesmo grupo ficam ligados ao mesmo tempo.
 * Apenas avisa: nunca desliga nada sozinho.
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
/* aplicacao                                                           */
/* ------------------------------------------------------------------ */

function tratarClique(ev) {
    const toggle = ev.currentTarget;
    const linha = toggle.closest(ROW);
    const lista = document.getElementById(LIST_ID);
    const nome = limparNome(linha?.querySelector(NAME)?.dataset.pmName || '');

    // o ST inverte o estado depois; anunciamos o valor futuro
    const futuro = !estaLigado(toggle);
    anunciar(`${nome}: ${futuro ? 'enabled' : 'disabled'}.`);

    // a lista inteira e redesenhada, o que destroi o elemento focado
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

    // icones decorativos e alca de arrastar nao devem ser lidos
    linha.querySelectorAll('.drag-handle, .fa-fw.fa-solid, [class*="fa-"]:empty')
        .forEach(el => {
            if (el.matches(`${TOGGLE}, ${EDIT}, ${DETACH}`)) return;
            el.setAttribute('aria-hidden', 'true');
        });

    // nome limpo, sem emoji
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

    // contagem de tokens
    const tok = linha.querySelector(TOKENS);
    if (tok && !tok.dataset.pma11y) {
        const n = tok.dataset.pmTokens || tok.textContent.trim();
        tok.setAttribute('aria-label', n === '-' ? 'no tokens' : `${n} tokens`);
        tok.dataset.pma11y = '1';
    }

    // o toggle: de span decorativo para switch de verdade
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

    // editar e remover tambem sao spans mudos
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

    // devolver o foco apos o redesenho
    if (focoPendente) {
        const alvo = lista.querySelector(
            `${ROW}[data-pm-identifier="${CSS.escape(focoPendente)}"] ${TOGGLE}`);
        focoPendente = null;
        if (alvo) window.setTimeout(() => alvo.focus(), 0);
    }
}

/* ------------------------------------------------------------------ */
/* inicializacao                                                       */
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

    // a lista so existe depois que o painel e aberto
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

// carrega tambem os demais modulos de acessibilidade
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
// Por ultimo: preenche com o title (como aria-label) tudo que os modulos acima
// nao nomearam explicitamente -- assim os rotulos especificos tem prioridade.
import './titles.js';

export { iniciar as init };
