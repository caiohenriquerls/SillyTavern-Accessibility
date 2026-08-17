/**
 * Lorebook Accessibility
 *
 * SillyTavern's World Info / Lorebook screen has the same problems as the
 * Prompt Manager, and a few worse ones:
 *
 *  - the activation toggle is an empty <div> whose state lives only in the CSS
 *    class (fa-toggle-on / fa-toggle-off);
 *  - the expander is also a <div>, with no aria-expanded;
 *  - move, duplicate and delete are empty <i> elements that never get focus;
 *  - the position selector uses options that are just symbols (arrows, gear,
 *    robot), unreadable to a screen reader;
 *  - the labels use for="position", for="depth", for="order" but the fields
 *    have no matching id, so the association does not work.
 *
 * This module does not modify SillyTavern. It observes the list and fixes the
 * accessibility tree on every redraw. Nothing changes visually.
 */

const LISTA = '#world_popup_entries_list';
const ENTRADA = '.world_entry';
const TITULO = 'textarea[name="comment"]';
const KILL = '.killSwitch';
const EXPANDIR = '.inline-drawer-toggle';
const MOVER = '.move_entry_button';
const DUPLICAR = '.duplicate_entry_button';
const APAGAR = '.delete_entry_button';

/** Position selector options that are only symbols. */
const POSICOES = {
    '0': 'Before Character Definitions',
    '1': 'After Character Definitions',
    '5': 'Before Example Messages',
    '6': 'After Example Messages',
    '2': "Before Author's Note",
    '3': "After Author's Note",
    '7': 'Outlet (named output)',
};
/** value 4 expands by data-role. */
const POSICOES_PROFUNDIDADE = {
    '0': 'At Depth, as System',
    '1': 'At Depth, as User',
    '2': 'At Depth, as Assistant',
};

/** Entry states, currently shown as colored dots. */
const ESTADOS = {
    constant: 'Constant, always active',
    normal: 'Normal, active by keyword',
    vectorized: 'Vectorized, active by similarity',
};

let anunciador = null;
let observador = null;

/* ------------------------------------------------------------------ */
/* utilities                                                           */
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

/** Generates a unique, stable id to associate a label with a field. */
let contadorId = 0;
function garantirId(el) {
    if (!el.id) el.id = 'lorea11y-' + (++contadorId);
    return el.id;
}

/* ------------------------------------------------------------------ */
/* panel: toolbar and world selectors                                  */
/* ------------------------------------------------------------------ */

/*
 * The World Info toolbar itself (create, import, export, new entry, expand
 * all, etc.) is a row of <div>/<i> elements with only a title, and the search,
 * sort and world selectors have no label. Here we fix that chrome. The entries
 * are still handled by enriquecerEntrada, and the icon that opens the panel in
 * the top bar by the navigation.js module.
 */

/** Toolbar buttons: id -> spoken label. */
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

/** Native toolbar fields that just need a label. */
const CAMPOS_PAINEL = {
    'world_info_search': 'Search entries',
    'world_info_sort_order': 'Sort entries by',
    'world_editor_select': 'Pick a lorebook to edit',
    'world_info': 'Active World(s) for all chats',
};

/** Turns a mute <div>/<i> into a keyboard-operable button. */
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
    // --- toolbar: action buttons
    for (const [id, rotulo] of Object.entries(FERRAMENTAS)) {
        virarBotao(document.getElementById(id), rotulo);
    }

    // --- search, sort and world selectors
    for (const [id, rotulo] of Object.entries(CAMPOS_PAINEL)) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (!el.dataset.lorea11yLabel) {
            el.setAttribute('aria-label', rotulo);
            garantirId(el);
            el.dataset.lorea11yLabel = '1';
        }
        // select2 draws its own combobox next to the hidden <select> and only
        // appears after the panel opens; so we label it separately, without
        // depending on the flag above, until the combobox exists.
        const combo = el.parentElement &&
            el.parentElement.querySelector('.select2-selection');
        if (combo && !combo.dataset.lorea11yLabel) {
            combo.setAttribute('aria-label', rotulo);
            combo.dataset.lorea11yLabel = '1';
        }
    }
}

/* ------------------------------------------------------------------ */
/* one entry                                                           */
/* ------------------------------------------------------------------ */

function enriquecerEntrada(entrada) {
    const nome = tituloDe(entrada);

    // --- title field: no label of its own, only a placeholder
    const ta = entrada.querySelector(TITULO);
    if (ta && !ta.dataset.lorea11y) {
        ta.setAttribute('aria-label', 'Entry title');
        ta.dataset.lorea11y = '1';
        // rename the controls when the title changes
        ta.addEventListener('change', () => enriquecerEntrada(entrada));
    }

    // --- activation toggle: mute div -> real switch
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

    // --- expander: mute div -> button with aria-expanded
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

    // --- action buttons: empty <i> with no focus
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

    // --- state selector: options are colored dots
    const estado = entrada.querySelector('select[name="entryStateSelector"]');
    if (estado && !estado.dataset.lorea11y) {
        estado.setAttribute('aria-label', 'Activation state');
        for (const op of estado.options) {
            const texto = ESTADOS[op.value];
            if (texto) op.textContent = texto;
        }
        estado.dataset.lorea11y = '1';
    }

    // --- position selector: options are arrows and emoji
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

    // --- broken labels: for= points to an id that does not exist
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

    // --- keyword input mode toggle (tags <-> plain text).
    // It is a real <button>, but comes with tabindex="-1", so the keyboard
    // cannot reach it. Plain-text mode is much easier with a screen reader.
    entrada.querySelectorAll('.switch_input_type_icon').forEach(btn => {
        btn.setAttribute('tabindex', '0');
        const secundaria = !!btn.closest('.keysecondary');
        btn.setAttribute('aria-label', secundaria
            ? 'Switch optional filter mode, tags or plain text'
            : 'Switch keyword mode, tags or plain text');
    });

    // --- token counter
    const tok = entrada.querySelector('.world_entry_form_token_counter');
    if (tok && !tok.dataset.lorea11y) {
        tok.setAttribute('aria-label', 'token count');
        tok.dataset.lorea11y = '1';
    }

    // --- drag handle and decorative icons: out of the reading order
    entrada.querySelectorAll('.drag-handle, .fa-circle-info').forEach(el => {
        el.setAttribute('aria-hidden', 'true');
    });

    // --- the whole entry gets a group label
    if (!entrada.dataset.lorea11y) {
        entrada.setAttribute('role', 'group');
        entrada.dataset.lorea11y = '1';
    }
    entrada.setAttribute('aria-label', 'Entry: ' + nome);
}

/* ------------------------------------------------------------------ */
/* application                                                         */
/* ------------------------------------------------------------------ */

function aplicar() {
    // The panel chrome (open button, toolbar) exists from load, even before
    // any entry appears.
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
    // the list only exists after the World Info panel is opened
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
