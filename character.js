/**
 * Character / Group management accessibility
 *
 * O painel da direita (lista de personagens, criacao e edicao de personagem,
 * grupos e pastas) sofre dos mesmos problemas: botoes que sao <div>/<i> so com
 * title, campos sem rotulo proprio e cards de personagem que o leitor de tela
 * anuncia como "clicavel" sem dizer de quem sao.
 *
 * O SillyTavern ja tem o keyboard.js, que torna .menu_button, .character_select
 * etc. focaveis e ativaveis por Enter. Alem disso, ao marcarmos role="button" o
 * proprio NVDA passa a ativar por Enter e Espaco. Entao aqui NAO adicionamos
 * tratadores de teclado (evita clique duplicado): so acrescentamos a semantica
 * que falta -- papel, nome e estado.
 *
 * Modulo nao invasivo: observa e conserta a arvore de acessibilidade a cada
 * redesenho. Nada muda visualmente.
 */

const PAINEL_DIR = '#right-nav-panel';
const CARDS = '.character_select, .group_select, .bogus_folder_select';

/*
 * Rotulos em ingles, seguindo o padrao do proprio SillyTavern. Nao copiamos o
 * title porque a traducao (em qualquer idioma) do ST e incompleta e o resultado
 * fica inconsistente; aqui cravamos o nome das funcoes principais.
 */
const BOTOES_PT = {
    // barra da lista de personagens
    'rm_button_create': 'Create New Character',
    'character_import_button': 'Import Character from File',
    'external_import_button': 'Import content from external URL',
    'rm_button_group_chats': 'Create New Chat Group',
    // barra do formulario de edicao do personagem
    'rm_button_back': 'Back to character list',
    'favorite_button': 'Add to Favorites',
    'advanced_div': 'Advanced Definitions',
    'world_button': 'Character Lore (World Info)',
    'char_connections_button': 'Connected Personas',
    'export_button': 'Export and Download',
    'dupe_button': 'Duplicate Character',
    'delete_button': 'Delete Character',
    // formulario de criacao/edicao de grupo
    'rm_button_back_from_group': 'Back to character list',
    'rm_group_submit': 'Create group',
    'rm_group_delete': 'Delete group',
    'rm_group_scenario': 'Group chat settings overrides',
    'rm_group_restore_avatar': 'Restore collage avatar',
    'group_favorite_button': 'Add group to Favorites',
};

/** Botoes principais sem id unico (por seletor de classe). */
const BOTOES_PT_SELETOR = [
    ['.chat_lorebook_button', 'Chat Lore'],
    ['.open_alternate_greetings', 'Alternate Greetings'],
];

/** Campos do formulario de personagem: id -> nome falado. */
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
    // campos do formulario de grupo
    'rm_group_chat_name': 'Group name',
    'groupTagInput': 'Search or create tags',
    'rm_group_members_filter': 'Search current members',
    'rm_group_filter': 'Search characters to add',
    'group-chat-lorebook-dropdown': 'Group chat lorebook actions',
};

let observadorDir = null;

/* ------------------------------------------------------------------ */
/* utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Remove emoji e simbolos decorativos para o nome nao sair ilegivel. */
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

/** Um elemento so recebe role=button se nao for nativo nem contiver um. */
function podeVirarBotao(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input' ||
        tag === 'select' || tag === 'textarea' || tag === 'label') return false;
    if (el.querySelector('input, select, textarea, button, a')) return false;
    return true;
}

/** Nome visivel do proprio elemento (sem contar filhos interativos). */
function temTextoVisivel(el) {
    return (el.textContent || '').trim().length > 0;
}

/* ------------------------------------------------------------------ */
/* conserto do painel                                                  */
/* ------------------------------------------------------------------ */

function enriquecerBotoesIcone(raiz) {
    // Botoes principais por classe: rotulo em portugues garantido.
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
            // icone puro sem rotulo proprio: usa o title como ultimo recurso
            // (pode cair para ingles se o ST nao tiver traduzido aquele texto).
            const title = el.getAttribute('title');
            if (title) el.setAttribute('aria-label', title.split('\n')[0].trim());
        }
        // Se ja tem texto visivel, o proprio texto e o nome; so o role basta.
    });

    // Botao de salvar/criar: e um <input type="submit"> vazio dentro de um
    // <label> so com icone, entao fica sem nome nenhum para o leitor.
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

        // Card especial de "voltar uma pasta" na navegacao de pastas.
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
 * Membros de grupo (.group_member): o card nao e focavel e mostra o nome num
 * <span>. Os botoes de acao (silenciar, mover, remover, adicionar) tem title,
 * mas nao dizem de quem sao. Acrescentamos o nome do personagem a cada acao e
 * damos um rotulo ao card inteiro.
 */
function enriquecerMembrosDeGrupo(raiz) {
    raiz.querySelectorAll('.group_member').forEach(membro => {
        const nomeEl = membro.querySelector('.ch_name');
        const nome = limparNome(nomeEl ? nomeEl.textContent : '');
        if (!nome) return;
        if (!membro.hasAttribute('aria-label')) {
            membro.setAttribute('aria-label', 'Group member: ' + nome);
        }
        // Da contexto (nome) a cada botao de acao do membro.
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
    // Cards podem aparecer tambem fora do painel (ex.: busca/popup), entao
    // varremos o documento inteiro -- e barato e idempotente.
    enriquecerCards(document);
}

/* ------------------------------------------------------------------ */
/* inicializacao                                                       */
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
    // O painel da direita ja existe no carregamento, mas a lista so e
    // preenchida depois; observamos o body ate ele aparecer/mudar.
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
