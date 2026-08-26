/**
 * Regex extension accessibility
 *
 * The built-in Regex extension has two accessible-tree gaps:
 *
 *  1) Script rows: the enable/disable toggle is a checkbox whose <label for="">
 *     points to a class, not an id (broken association) -> unnamed; the action
 *     buttons (edit/delete/move/export) have a generic title but do not say
 *     WHICH script; the bulk-select and expand checkboxes are unnamed; the drag
 *     handle is decorative.
 *  2) Editor dialog: the Script Name / Find Regex / Replace With / Trim Out /
 *     Min Depth / Max Depth fields also use <label for="class"> (broken), so
 *     they have no accessible name.
 *
 * This module names everything and gives each row's controls the script name
 * for context. Non-invasive: observes and enriches on every redraw.
 */

const CONTAINERS = '#saved_regex_scripts, #saved_preset_scripts, #saved_scoped_scripts';
const ROW = '.regex-script-label';

/** After a toggle the whole list is redrawn; remember which script to refocus. */
let pendenteFoco = null;

/** Row action buttons: selector -> spoken purpose (the script name is appended). */
const ACOES = [
    ['.edit_existing_regex', 'Edit script'],
    ['.delete_regex', 'Delete script'],
    ['.move_to_global', 'Move to global scripts'],
    ['.move_to_preset', 'Move to preset scripts'],
    ['.move_to_scoped', 'Move to scoped scripts'],
    ['.export_regex', 'Export script'],
];

/** Editor fields (broken <label for>): selector -> spoken name. */
const CAMPOS_EDITOR = [
    ['input.regex_script_name', 'Script Name'],
    ['input.find_regex', 'Find Regex'],
    ['textarea.regex_replace_string', 'Replace With'],
    ['textarea.regex_trim_strings', 'Trim Out'],
    ['input[name="min_depth"]', 'Minimum depth'],
    ['input[name="max_depth"]', 'Maximum depth'],
];

function nomeDoScript(row) {
    const el = row.querySelector('.regex_script_name');
    return (el && el.textContent || '').replace(/\s+/g, ' ').trim() || 'unnamed script';
}

function enriquecerLinha(row) {
    const nome = nomeDoScript(row);

    // A linha inteira como grupo nomeado.
    if (!row.hasAttribute('role')) row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Regex script: ' + nome);

    // Enable/disable toggle. The native checkbox is `disable_regex`, whose
    // CHECKED means DISABLED (inverted), and its <label for> is broken -- so it
    // both reads confusingly and is awkward to drive. We hide it from the screen
    // reader and expose OUR OWN real <input type=checkbox> whose CHECKED means
    // ENABLED, named just with the script name. A real checkbox is toggled
    // natively by NVDA/keyboard; on change we mirror the new state onto the
    // native control (SillyTavern reacts and redraws the list).
    const toggle = row.querySelector('.disable_regex');
    if (toggle) {
        toggle.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('tabindex', '-1');
        let proxy = row.querySelector('input.pma11y-enable');
        if (!proxy) {
            proxy = document.createElement('input');
            proxy.type = 'checkbox';
            proxy.className = 'pma11y-enable';
            toggle.insertAdjacentElement('afterend', proxy);
            proxy.addEventListener('change', () => {
                pendenteFoco = nomeDoScript(proxy.closest(ROW));
                // the native "disable" checkbox must be the OPPOSITE of enabled
                if (toggle.checked !== !proxy.checked) toggle.click();
            });
        }
        proxy.setAttribute('aria-label', nome);
        proxy.checked = !toggle.checked;   // checked = enabled
    }

    // Checkbox de selecao em massa.
    const bulk = row.querySelector('.regex_bulk_checkbox');
    if (bulk && !bulk.hasAttribute('aria-label')) bulk.setAttribute('aria-label', 'Select script: ' + nome);

    // Expandir mais opcoes. O elemento FOCAVEL e o <label class="menu_button
    // regex_script_expand"> (o checkbox interno e display:none), entao rotulamos
    // o label.
    const expand = row.querySelector('label.regex_script_expand');
    if (expand) expand.setAttribute('aria-label', 'Show more options: ' + nome);

    // Botoes de acao: nome generico + nome do script para contexto.
    for (const [sel, rotulo] of ACOES) {
        const b = row.querySelector(sel);
        if (b) {
            if (!b.hasAttribute('role')) b.setAttribute('role', 'button');
            b.setAttribute('aria-label', rotulo + ': ' + nome);
        }
    }

    // Alca de arrastar e os icones do toggle: fora da leitura.
    row.querySelectorAll('.drag-handle, .regex-toggle-on, .regex-toggle-off').forEach(el => {
        el.setAttribute('aria-hidden', 'true');
    });
}

function enriquecerEditor() {
    for (const [sel, rotulo] of CAMPOS_EDITOR) {
        document.querySelectorAll(sel).forEach(el => {
            if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', rotulo);
        });
    }
}

/** Toggles de "permitir preset/scoped" no painel (checkboxes display:none). */
const TOGGLES_PAINEL = {
    'regex_preset_toggle': 'Allow preset regex scripts',
    'regex_scoped_toggle': 'Allow scoped regex scripts',
};

function enriquecerTogglesPainel() {
    for (const [id, rotulo] of Object.entries(TOGGLES_PAINEL)) {
        const cb = document.getElementById(id);
        if (!cb) continue;
        if (!cb.hasAttribute('aria-label')) cb.setAttribute('aria-label', rotulo);
        // esconde os icones decorativos do toggle ao lado
        cb.closest('label')?.querySelectorAll('.regex-toggle-on, .regex-toggle-off')
            .forEach(s => s.setAttribute('aria-hidden', 'true'));
    }
}

function aplicar() {
    document.querySelectorAll(CONTAINERS).forEach(c => {
        c.querySelectorAll(ROW).forEach(enriquecerLinha);
    });
    enriquecerEditor();
    enriquecerTogglesPainel();

    // The toggle redraws the whole list, destroying the focused control; put
    // focus back on the same script's toggle.
    if (pendenteFoco) {
        const alvo = [...document.querySelectorAll(ROW)]
            .find(r => nomeDoScript(r) === pendenteFoco);
        const cb = alvo && alvo.querySelector('input.pma11y-enable');
        pendenteFoco = null;
        if (cb) window.setTimeout(() => cb.focus(), 0);
    }
}

function iniciar() {
    aplicar();
    new MutationObserver(() => {
        window.clearTimeout(iniciar._t);
        iniciar._t = window.setTimeout(aplicar, 120);
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initRegex };
