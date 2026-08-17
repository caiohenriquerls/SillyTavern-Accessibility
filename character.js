/**
 * Character / Group management accessibility
 *
 * The right-hand panel (character list, character create/edit, groups and
 * folders) suffers from the same problems: buttons that are <div>/<i> with
 * only a title, fields with no label of their own, and character cards that a
 * screen reader announces as "clickable" without saying whose they are.
 *
 * SillyTavern already has keyboard.js, which makes .menu_button,
 * .character_select etc. focusable and Enter-activatable. On top of that, once
 * we mark role="button" NVDA itself activates on Enter and Space. So here we do
 * NOT add keyboard handlers (avoids a double click): we only add the missing
 * semantics -- role, name and state.
 *
 * Non-invasive module: observes and fixes the accessibility tree on every
 * redraw. Nothing changes visually.
 */

const PAINEL_DIR = '#right-nav-panel';
const CARDS = '.character_select, .group_select, .bogus_folder_select';

/*
 * English labels, following SillyTavern's own convention. We do not copy the
 * title because SillyTavern's translation (in any language) is incomplete and
 * the result is inconsistent; here we hard-code the names of the main actions.
 */
const BOTOES_PT = {
    // character list toolbar
    'rm_button_create': 'Create New Character',
    'character_import_button': 'Import Character from File',
    'external_import_button': 'Import content from external URL',
    'rm_button_group_chats': 'Create New Chat Group',
    // character edit-form toolbar
    'rm_button_back': 'Back to character list',
    'favorite_button': 'Add to Favorites',
    'advanced_div': 'Advanced Definitions',
    'world_button': 'Character Lore (World Info)',
    'char_connections_button': 'Connected Personas',
    'export_button': 'Export and Download',
    'dupe_button': 'Duplicate Character',
    'delete_button': 'Delete Character',
    // group create/edit form
    'rm_button_back_from_group': 'Back to character list',
    'rm_group_submit': 'Create group',
    'rm_group_delete': 'Delete group',
    'rm_group_scenario': 'Group chat settings overrides',
    'rm_group_restore_avatar': 'Restore collage avatar',
    'group_favorite_button': 'Add group to Favorites',
};

/** Main buttons without a unique id (matched by class). */
const BOTOES_PT_SELETOR = [
    ['.chat_lorebook_button', 'Chat Lore'],
    ['.open_alternate_greetings', 'Alternate Greetings'],
];

/** Character form fields: id -> spoken name. */
const CAMPOS_PERSONAGEM = {
    'character_name_pole': 'Character Name',
    'description_textarea': 'Character Description',
    'firstmessage_textarea': 'First Message',
    'personality_textarea': 'Personality summary',
    'scenario_pole': 'Scenario',
    'mes_example_textarea': 'Example Messages',
    'creator_notes_textarea': "Creator's Notes",
    'depth_prompt_prompt': "Character's Note (depth prompt)",
    'talkativeness_slider': 'Talkativeness',
    'character_sort_order': 'Characters sorting order',
    'character_search_bar': 'Search characters',
    // group form fields
    'rm_group_chat_name': 'Group name',
    'groupTagInput': 'Search or create tags',
    'rm_group_members_filter': 'Search current members',
    'rm_group_filter': 'Search characters to add',
    'group-chat-lorebook-dropdown': 'Group chat lorebook actions',
};

let observadorDir = null;

/* ------------------------------------------------------------------ */
/* utilities                                                           */
/* ------------------------------------------------------------------ */

/** Removes emoji and decorative symbols so the name is not unreadable. */
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
    return s.replace(/\s+/g, ' ').trim();
}

/** An element only gets role=button if it is not native and contains none. */
function podeVirarBotao(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input' ||
        tag === 'select' || tag === 'textarea' || tag === 'label') return false;
    if (el.querySelector('input, select, textarea, button, a')) return false;
    return true;
}

/** The element's own visible text (not counting interactive children). */
function temTextoVisivel(el) {
    return (el.textContent || '').trim().length > 0;
}

/* ------------------------------------------------------------------ */
/* panel                                                               */
/* ------------------------------------------------------------------ */

function enriquecerBotoesIcone(raiz) {
    // Main buttons by class: guaranteed label.
    for (const [sel, rotulo] of BOTOES_PT_SELETOR) {
        raiz.querySelectorAll(sel).forEach(el => {
            if (podeVirarBotao(el) && !el.hasAttribute('role')) el.setAttribute('role', 'button');
            if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', rotulo);
        });
    }

    raiz.querySelectorAll('.menu_button, .right_menu_button').forEach(el => {
        if (!podeVirarBotao(el)) return;
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        if (el.hasAttribute('aria-label')) return;
        const fixo = el.id && BOTOES_PT[el.id];
        if (fixo) {
            el.setAttribute('aria-label', fixo);
        } else if (!temTextoVisivel(el)) {
            // pure icon with no label of its own: use the title as a last resort
            // (may fall back to English if SillyTavern has not translated it).
            const title = el.getAttribute('title');
            if (title) el.setAttribute('aria-label', title.split('\n')[0].trim());
        }
        // If it already has visible text, that text is the name; role is enough.
    });

    // Save/create button: it is an empty <input type="submit"> inside a <label>
    // that has only an icon, so it ends up with no name at all for the reader.
    const submit = raiz.querySelector('#create_button');
    if (submit && !submit.hasAttribute('aria-label')) {
        submit.setAttribute('aria-label', 'Create or save character');
    }
}

function enriquecerCampos(raiz) {
    for (const [id, rotulo] of Object.entries(CAMPOS_PERSONAGEM)) {
        const el = raiz.querySelector('#' + id);
        if (el && !el.hasAttribute('aria-label')) {
            el.setAttribute('aria-label', rotulo);
        }
    }
}

function enriquecerCards(raiz) {
    raiz.querySelectorAll(CARDS).forEach(card => {
        if (!card.hasAttribute('role')) card.setAttribute('role', 'button');

        // Special "go back one folder" card in the folder navigation.
        if (card.classList.contains('bogus_folder_select_back')) {
            card.setAttribute('aria-label', 'Go back one folder');
            return;
        }

        const nomeEl = card.querySelector('.ch_name');
        const nome = limparNome(nomeEl ? nomeEl.textContent : '');
        if (!nome) return;
        const ehGrupo = card.classList.contains('group_select');
        const ehPasta = card.classList.contains('bogus_folder_select');
        const prefixo = ehPasta ? 'Folder: ' : ehGrupo ? 'Group: ' : 'Character: ';
        card.setAttribute('aria-label', prefixo + nome);
    });
}

/**
 * Group members (.group_member): the card is not focusable and shows the name
 * in a <span>. The action buttons (mute, move, remove, add) have a title but do
 * not say whose they are. We add the character's name to each action and give
 * the whole card a label.
 */
function enriquecerMembrosDeGrupo(raiz) {
    raiz.querySelectorAll('.group_member').forEach(membro => {
        const nomeEl = membro.querySelector('.ch_name');
        const nome = limparNome(nomeEl ? nomeEl.textContent : '');
        if (!nome) return;
        if (!membro.hasAttribute('aria-label')) {
            membro.setAttribute('aria-label', 'Group member: ' + nome);
        }
        // Give context (the name) to each of the member's action buttons.
        membro.querySelectorAll('.right_menu_button, .menu_button').forEach(btn => {
            if (btn.dataset.a11yMember) return;
            const title = btn.getAttribute('title');
            if (title) btn.setAttribute('aria-label', title.split('\n')[0].trim() + ': ' + nome);
            btn.dataset.a11yMember = '1';
        });
    });
}

function aplicar() {
    const painel = document.querySelector(PAINEL_DIR);
    if (painel) {
        enriquecerBotoesIcone(painel);
        enriquecerCampos(painel);
        enriquecerMembrosDeGrupo(painel);
    }
    // Cards can also appear outside the panel (e.g. search/popup), so we scan
    // the whole document -- it is cheap and idempotent.
    enriquecerCards(document);
}

/* ------------------------------------------------------------------ */
/* initialization                                                      */
/* ------------------------------------------------------------------ */

function ligarObservador() {
    const painel = document.querySelector(PAINEL_DIR);
    if (!painel || observadorDir) return;
    observadorDir = new MutationObserver(() => {
        window.clearTimeout(ligarObservador._t);
        ligarObservador._t = window.setTimeout(aplicar, 60);
    });
    observadorDir.observe(painel, { childList: true, subtree: true });
    aplicar();
}

function iniciar() {
    ligarObservador();
    // The right-hand panel exists from load, but the list is only filled in
    // later; we observe the body until it appears/changes.
    new MutationObserver(() => {
        if (!observadorDir) ligarObservador();
        else aplicar();
    }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}

export { iniciar as initCharacter };
