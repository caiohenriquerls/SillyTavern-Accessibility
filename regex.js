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

    // Interruptor ligar/desligar (checkbox; marcado = desativado).
    const toggle = row.querySelector('.disable_regex');
    if (toggle) toggle.setAttribute('aria-label', 'Disable script: ' + nome);

    // Checkbox de selecao em massa.
    const bulk = row.querySelector('.regex_bulk_checkbox');
    if (bulk && !bulk.hasAttribute('aria-label')) bulk.setAttribute('aria-label', 'Select script: ' + nome);

    // Expandir mais opcoes (checkbox dentro do label .regex_script_expand).
    const expand = row.querySelector('.regex_script_expand input[type="checkbox"]');
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

function aplicar() {
    document.querySelectorAll(CONTAINERS).forEach(c => {
        c.querySelectorAll(ROW).forEach(enriquecerLinha);
    });
    enriquecerEditor();
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
