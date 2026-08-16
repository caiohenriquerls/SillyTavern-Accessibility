/**
 * Lorebook Accessibility
 *
 * A tela de World Info / Lorebook do SillyTavern tem os mesmos problemas do
 * Prompt Manager, e alguns piores:
 *
 *  - o interruptor de ativacao e uma <div> vazia cujo estado vive so na
 *    classe CSS (fa-toggle-on / fa-toggle-off);
 *  - o expansor tambem e uma <div>, sem aria-expanded;
 *  - mover, duplicar e apagar sao <i> vazios que nao recebem foco;
 *  - o seletor de posicao usa opcoes que sao apenas simbolos (arrows,
 *    engrenagem, robo), ilegiveis para leitor de tela;
 *  - os rotulos usam for="position", for="depth", for="order" mas os campos
 *    nao tem id correspondente, entao a associacao nao funciona.
 *
 * Este modulo nao altera o SillyTavern. Ele observa a lista e conserta a
 * arvore de acessibilidade a cada redesenho. Nada muda visualmente.
 */

const LISTA = '#world_popup_entries_list';
const ENTRADA = '.world_entry';
const TITULO = 'textarea[name="comment"]';
const KILL = '.killSwitch';
const EXPANDIR = '.inline-drawer-toggle';
const MOVER = '.move_entry_button';
const DUPLICAR = '.duplicate_entry_button';
const APAGAR = '.delete_entry_button';

/** Opcoes do seletor de posicao que sao apenas simbolos. */
const POSICOES = {
    '0': 'Before Character Definitions',
    '1': 'After Character Definitions',
    '5': 'Before Example Messages',
    '6': 'After Example Messages',
    '2': "Before Author's Note",
    '3': "After Author's Note",
    '7': 'Outlet (named output)',
};
/** value 4 se desdobra por data-role. */
const POSICOES_PROFUNDIDADE = {
    '0': 'At Depth, as System',
    '1': 'At Depth, as User',
    '2': 'At Depth, as Assistant',
};

/** Estados da entrada, hoje representados por bolinhas coloridas. */
const ESTADOS = {
    constant: 'Constant, always active',
    normal: 'Normal, active by keyword',
    vectorized: 'Vectorized, active by similarity',
};

let anunciador = null;
let observador = null;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

function anunciar(msg) {
    if (!anunciador) return;
    anunciador.textContent = '';
    window.setTimeout(() => { anunciador.textContent = msg; }, 60);
}

function criarAnunciador() {
    let el = document.getElementById('lorea11y-live');
    if (el) { anunciador = el; return; }
    el = document.createElement('div');
    el.id = 'lorea11y-live';
    el.setAttribute('aria-live', 'assertive');
    el.setAttribute('aria-atomic', 'true');
    el.className = 'pma11y-sr-only';
    document.body.appendChild(el);
    anunciador = el;
}

function tituloDe(entrada) {
    const ta = entrada.querySelector(TITULO);
    const t = (ta && ta.value || '').trim();
    return t || 'untitled entry';
}

function ligada(kill) {
    return kill.classList.contains('fa-toggle-on');
}

function tratarTecla(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.currentTarget.click();
}

/** Gera um id unico e estavel para associar rotulo a campo. */
let contadorId = 0;
function garantirId(el) {
    if (!el.id) el.id = 'lorea11y-' + (++contadorId);
    return el.id;
}

/* ------------------------------------------------------------------ */
/* conserto do painel: botao de abrir e barra de ferramentas           */
/* ------------------------------------------------------------------ */

/*
 * A propria barra de ferramentas do World Info (criar, importar, exportar,
 * nova entrada, expandir tudo, etc.) e uma fileira de <div>/<i> so com title,
 * e a busca, a ordenacao e os seletores de mundo nao tem rotulo. Aqui
 * consertamos essa moldura. As entradas continuam sendo tratadas por
 * enriquecerEntrada, e o icone que abre o painel na barra de cima pelo
 * modulo navigation.js.
 */

/** Botoes da barra de ferramentas: id -> rotulo falado. */
const FERRAMENTAS = {
    'world_create_button': 'Create new lorebook',
    'world_import_button': 'Import lorebook',
    'world_popup_export': 'Export lorebook',
    'world_popup_name_button': 'Rename lorebook',
    'world_duplicate': 'Duplicate lorebook',
    'world_popup_delete': 'Delete lorebook',
    'world_popup_new': 'New entry',
    'OpenAllWIEntries': 'Open all entries',
    'CloseAllWIEntries': 'Close all entries',
    'world_backfill_memos': 'Fill empty memos/titles with keywords',
    'world_apply_current_sorting': 'Apply current sorting as order',
    'world_refresh': 'Refresh entry list',
};

/** Campos nativos da barra que so precisam de rotulo. */
const CAMPOS_PAINEL = {
    'world_info_search': 'Search entries',
    'world_info_sort_order': 'Sort entries by',
    'world_editor_select': 'Pick a lorebook to edit',
    'world_info': 'Active World(s) for all chats',
};

/** Transforma uma <div>/<i> muda num botao operavel pelo teclado. */
function virarBotao(el, rotulo) {
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    const nativo = tag === 'button' || tag === 'a' || tag === 'input' ||
        tag === 'select' || tag === 'textarea';
    if (!nativo && !el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!nativo && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (rotulo) el.setAttribute('aria-label', rotulo);
    if (!el.dataset.lorea11y) {
        if (!nativo) el.addEventListener('keydown', tratarTecla);
        el.dataset.lorea11y = '1';
    }
}

function enriquecerPainel() {
    // --- barra de ferramentas: botoes de acao
    for (const [id, rotulo] of Object.entries(FERRAMENTAS)) {
        virarBotao(document.getElementById(id), rotulo);
    }

    // --- busca, ordenacao e seletores de mundo
    for (const [id, rotulo] of Object.entries(CAMPOS_PAINEL)) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (!el.dataset.lorea11yLabel) {
            el.setAttribute('aria-label', rotulo);
            garantirId(el);
            el.dataset.lorea11yLabel = '1';
        }
        // O select2 desenha um combobox proprio ao lado do <select> oculto e so
        // aparece depois que o painel abre; por isso rotulamos separado e sem
        // depender da flag acima, ate o combobox existir.
        const combo = el.parentElement &&
            el.parentElement.querySelector('.select2-selection');
        if (combo && !combo.dataset.lorea11yLabel) {
            combo.setAttribute('aria-label', rotulo);
            combo.dataset.lorea11yLabel = '1';
        }
    }
}

/* ------------------------------------------------------------------ */
/* conserto de uma entrada                                             */
/* ------------------------------------------------------------------ */

function enriquecerEntrada(entrada) {
    const nome = tituloDe(entrada);

    // --- campo de titulo: sem rotulo proprio, so placeholder
    const ta = entrada.querySelector(TITULO);
    if (ta && !ta.dataset.lorea11y) {
        ta.setAttribute('aria-label', 'Entry title');
        ta.dataset.lorea11y = '1';
        // renomear os controles quando o titulo mudar
        ta.addEventListener('change', () => enriquecerEntrada(entrada));
    }

    // --- interruptor de ativacao: div muda -> switch de verdade
    const kill = entrada.querySelector(KILL);
    if (kill) {
        const on = ligada(kill);
        kill.setAttribute('role', 'switch');
        kill.setAttribute('aria-checked', on ? 'true' : 'false');
        kill.setAttribute('aria-label', 'Active: ' + nome);
        kill.setAttribute('tabindex', '0');
        if (!kill.dataset.lorea11y) {
            kill.addEventListener('keydown', tratarTecla);
            kill.addEventListener('click', () => {
                const futuro = !ligada(kill);
                anunciar(nome + ': ' + (futuro ? 'activated' : 'deactivated'));
            });
            kill.dataset.lorea11y = '1';
        }
    }

    // --- expansor: div muda -> botao com aria-expanded
    const exp = entrada.querySelector(EXPANDIR);
    if (exp) {
        const aberto = entrada.querySelector('.inline-drawer-content');
        const visivel = !!(aberto && aberto.offsetParent !== null);
        exp.setAttribute('role', 'button');
        exp.setAttribute('aria-expanded', visivel ? 'true' : 'false');
        exp.setAttribute('aria-label', 'Details of ' + nome);
        exp.setAttribute('tabindex', '0');
        if (!exp.dataset.lorea11y) {
            exp.addEventListener('keydown', tratarTecla);
            exp.addEventListener('click', () => {
                window.setTimeout(() => {
                    const c = entrada.querySelector('.inline-drawer-content');
                    const v = !!(c && c.offsetParent !== null);
                    exp.setAttribute('aria-expanded', v ? 'true' : 'false');
                    anunciar(nome + ': ' + (v ? 'expanded' : 'collapsed'));
                }, 120);
            });
            exp.dataset.lorea11y = '1';
        }
    }

    // --- botoes de acao: <i> vazios sem foco
    const acoes = [
        [MOVER, 'Move or copy to another lorebook: '],
        [DUPLICAR, 'Duplicate: '],
        [APAGAR, 'Delete: '],
    ];
    for (const [sel, prefixo] of acoes) {
        const b = entrada.querySelector(sel);
        if (!b) continue;
        b.setAttribute('role', 'button');
        b.setAttribute('tabindex', '0');
        b.setAttribute('aria-label', prefixo + nome);
        if (!b.dataset.lorea11y) {
            b.addEventListener('keydown', tratarTecla);
            b.dataset.lorea11y = '1';
        }
    }

    // --- seletor de estado: opcoes sao bolinhas coloridas
    const estado = entrada.querySelector('select[name="entryStateSelector"]');
    if (estado && !estado.dataset.lorea11y) {
        estado.setAttribute('aria-label', 'Activation state');
        for (const op of estado.options) {
            const texto = ESTADOS[op.value];
            if (texto) op.textContent = texto;
        }
        estado.dataset.lorea11y = '1';
    }

    // --- seletor de posicao: opcoes sao setas e emoji
    const pos = entrada.querySelector('select[name="position"]');
    if (pos && !pos.dataset.lorea11y) {
        pos.setAttribute('aria-label', 'Position in prompt');
        for (const op of pos.options) {
            let texto;
            if (op.value === '4') {
                texto = POSICOES_PROFUNDIDADE[op.dataset.role || '0'];
            } else {
                texto = POSICOES[op.value];
            }
            if (texto) op.textContent = texto;
        }
        pos.dataset.lorea11y = '1';
    }

    // --- rotulos quebrados: for= aponta para id que nao existe
    const campos = [
        ['input[name="depth"]', 'Depth'],
        ['input[name="order"]', 'Order'],
        ['input[name="probability"]', 'Trigger chance, percent'],
        ['input[name="scanDepth"]', 'Scan depth'],
        ['input[name="outletName"]', 'Outlet name'],
        ['input[name="automationId"]', 'Automation ID'],
        ['input[name="delayUntilRecursionLevel"]', 'Recursion level'],
        ['input[name="groupWeight"]', 'Group weight'],
        ['textarea[name="content"]', 'Entry content'],
        ['select[name="entryLogicType"]', 'Keyword logic'],
        ['select[name="caseSensitive"]', 'Case sensitive'],
        ['select[name="matchWholeWords"]', 'Match whole words'],
        ['select[name="useGroupScoring"]', 'Group scoring'],
        ['textarea.keyprimarytextpole', 'Primary keywords, comma separated'],
        ['textarea.keysecondarytextpole', 'Secondary keywords, comma separated'],
        ['select.keyprimaryselect', 'Primary keywords'],
        ['select.keysecondaryselect', 'Secondary keywords'],
    ];
    for (const [sel, rotulo] of campos) {
        entrada.querySelectorAll(sel).forEach(el => {
            if (el.dataset.lorea11y) return;
            el.setAttribute('aria-label', rotulo);
            garantirId(el);
            el.dataset.lorea11y = '1';
        });
    }

    // --- botao de alternar modo das palavras-chave (etiquetas <-> texto).
    // E um <button> de verdade, mas vem com tabindex="-1", entao o teclado
    // nao o alcanca. O modo texto simples e bem mais facil no leitor de tela.
    entrada.querySelectorAll('.switch_input_type_icon').forEach(btn => {
        btn.setAttribute('tabindex', '0');
        const secundaria = !!btn.closest('.keysecondary');
        btn.setAttribute('aria-label', secundaria
            ? 'Switch optional filter mode, tags or plain text'
            : 'Switch keyword mode, tags or plain text');
    });

    // --- contador de tokens
    const tok = entrada.querySelector('.world_entry_form_token_counter');
    if (tok && !tok.dataset.lorea11y) {
        tok.setAttribute('aria-label', 'token count');
        tok.dataset.lorea11y = '1';
    }

    // --- alca de arrastar e icones decorativos: fora da leitura
    entrada.querySelectorAll('.drag-handle, .fa-circle-info').forEach(el => {
        el.setAttribute('aria-hidden', 'true');
    });

    // --- a entrada inteira ganha rotulo de grupo
    if (!entrada.dataset.lorea11y) {
        entrada.setAttribute('role', 'group');
        entrada.dataset.lorea11y = '1';
    }
    entrada.setAttribute('aria-label', 'Entry: ' + nome);
}

/* ------------------------------------------------------------------ */
/* aplicacao                                                           */
/* ------------------------------------------------------------------ */

function aplicar() {
    // A moldura do painel (botao de abrir, barra de ferramentas) existe desde
    // o carregamento, mesmo antes de qualquer entrada aparecer.
    enriquecerPainel();

    const lista = document.querySelector(LISTA);
    if (!lista) return;

    if (!lista.dataset.lorea11y) {
        lista.setAttribute('role', 'list');
        lista.setAttribute('aria-label',
            'Lorebook entries. Use Enter or Space to toggle and expand.');
        lista.dataset.lorea11y = '1';
    }

    lista.querySelectorAll(ENTRADA).forEach(enriquecerEntrada);
}

function ligarObservador() {
    const lista = document.querySelector(LISTA);
    if (!lista || observador) return;
    observador = new MutationObserver(() => {
        window.clearTimeout(ligarObservador._t);
        ligarObservador._t = window.setTimeout(aplicar, 60);
    });
    observador.observe(lista, { childList: true, subtree: true });
    aplicar();
}

function iniciar() {
    criarAnunciador();
    enriquecerPainel();
    ligarObservador();
    // a lista so existe depois que o painel de World Info e aberto
    new MutationObserver(() => {
        if (!observador) ligarObservador();
        else aplicar();
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initLorebook };
