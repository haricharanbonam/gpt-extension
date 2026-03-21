// =====================================================
// ChatGPT Hashtag Templates Extension
// Features:
//   1. Type # in the input to see your templates.
//      Click one (or press Enter) to instantly insert
//      the full template text.
//   2. A small icon sits at the bottom-right of the
//      input box (functionality to be added later).
// =====================================================

// ----- Default Templates -----
const DEFAULT_TEMPLATES = {
  'mystack':    "I'm working with React, TypeScript, Tailwind, and Supabase",
  'myproject':  "I'm building a SaaS for freelancers that helps them track time and invoice clients",
  'mylevel':    "I'm a beginner in programming, currently learning JavaScript. I know HTML/CSS well",
  'gate':       "I'm preparing for GATE CS exam. For each concept: give a deep explanation, explain why wrong options are wrong, and suggest related questions I can expect",
  'teach':      "Teach me this concept. After explaining, give me a small quiz question to check my understanding. Wait for my answer before continuing.",
  'brainstorm': "Let's brainstorm together. After each of your responses, ask me 2-3 follow-up questions to explore the idea deeper. Challenge my assumptions.",
  'debug':      "I need debugging help. Ask me clarifying questions first before suggesting solutions. Think step-by-step about what could be wrong.",
  'review':     "Review what I'm sharing. Be critical but constructive. Point out what's good AND what needs improvement."
};

// ----- State -----
let templates  = {};   // loaded from storage
let dropdown   = null; // the dropdown element
let savedRange = null; // last known cursor position in the input box


// =====================================================
// STARTUP
// =====================================================

function init() {
  loadTemplates();
  waitForInput();
}

// Templates are stored in chrome.storage.local
function loadTemplates() {
  chrome.storage.local.get(['templates'], (result) => {
    templates = result.templates || { ...DEFAULT_TEMPLATES };
    if (!result.templates) {
      chrome.storage.local.set({ templates });
    }
  });
}

function saveTemplates() {
  chrome.storage.local.set({ templates });
}


// =====================================================
// WAIT FOR THE CHATGPT INPUT BOX
// =====================================================

function waitForInput() {
  const input = document.querySelector('#prompt-textarea');
  if (!input) {
    setTimeout(waitForInput, 1000);
    return;
  }
  setupInput(input);
  addIconButton(input);
}


// =====================================================
// FEATURE 1 — HASHTAG DROPDOWN
// =====================================================

function setupInput(input) {

  // Save cursor position on every key/click so we can restore
  // it after the dropdown steals focus.
  input.addEventListener('keyup',   () => saveRange());
  input.addEventListener('mouseup', () => saveRange());

  // Watch what the user types
  input.addEventListener('input', () => {
    const text   = getFullText(input);
    const cursor = getCaretPosition(input);
    const before = text.substring(0, cursor);
    const match  = before.match(/#(\w*)$/);    // text after the last #

    if (match) {
      showDropdown(input, match[1]);          // match[1] = partial word after #
    } else {
      hideDropdown();
    }
  });

  // Keyboard navigation inside the dropdown
  input.addEventListener('keydown', (e) => {
    if (!dropdown || dropdown.style.display === 'none') return;

    if (e.key === 'Escape') {
      e.preventDefault();
      hideDropdown();

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);

    } else if (e.key === 'Enter' && !e.shiftKey) {
      const highlighted = dropdown.querySelector('.template-item.selected');
      if (highlighted) {
        e.preventDefault();
        e.stopPropagation();
        insertTemplate(input, highlighted.dataset.key);
      }
    }
  }, true); // capture phase so we intercept before ChatGPT's Enter handler
}

// ---- Dropdown helpers ----

function showDropdown(input, filter) {
  if (!dropdown) buildDropdown(input);

  // Position above the input box
  const rect = input.getBoundingClientRect();
  dropdown.style.display = 'block';
  dropdown.style.left    = `${rect.left}px`;
  dropdown.style.top     = `${rect.top - dropdown.offsetHeight - 8}px`;

  applyFilter(filter);
}

function hideDropdown() {
  if (dropdown) dropdown.style.display = 'none';
}

function buildDropdown(input) {
  // Remove any old dropdown first
  if (dropdown) dropdown.remove();

  dropdown = document.createElement('div');
  dropdown.id        = 'hashtag-dropdown';
  dropdown.className = 'hashtag-dropdown';

  // --- Header row (title + add button) ---
  const header = document.createElement('div');
  header.className = 'dropdown-header';

  const title = document.createElement('span');
  title.textContent = 'Templates';
  title.className   = 'header-title';

  const addBtn = document.createElement('button');
  addBtn.className = 'icon-btn add-btn';
  addBtn.title     = 'Add new template';
  addBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`;
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(null, '', false);
  });

  header.appendChild(title);
  header.appendChild(addBtn);
  dropdown.appendChild(header);

  // --- Template list ---
  const list = document.createElement('div');
  list.className = 'template-list';

  Object.keys(templates).forEach((key, index) => {
    const item = createItem(key, index === 0, input);
    list.appendChild(item);
  });

  dropdown.appendChild(list);
  document.body.appendChild(dropdown);

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      hideDropdown();
    }
  });
}

function createItem(key, isFirst, input) {
  const item = document.createElement('div');
  item.className   = 'template-item' + (isFirst ? ' selected' : '');
  item.dataset.key = key;

  // Prevent the click from blurring the input (we'll focus manually)
  item.addEventListener('mousedown', (e) => e.preventDefault());

  // Click → insert template text immediately
  item.addEventListener('click', (e) => {
    if (!e.target.closest('.icon-btn')) {
      insertTemplate(input, key);
    }
  });

  // Hover → highlight
  item.addEventListener('mouseenter', () => {
    dropdown.querySelectorAll('.template-item')
      .forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
  });

  // Content (name + preview)
  const content = document.createElement('div');
  content.className = 'item-content';

  const name = document.createElement('div');
  name.className   = 'template-name';
  name.textContent = `#${key}`;

  const preview = document.createElement('div');
  preview.className   = 'template-preview';
  preview.textContent = templates[key];

  content.appendChild(name);
  content.appendChild(preview);

  // Action buttons (edit / delete)
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn edit-btn';
  editBtn.title     = 'Edit';
  editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>`;
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(key, templates[key], true);
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn del-btn';
  delBtn.title     = 'Delete';
  delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>`;
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete template "#${key}"?`)) {
      delete templates[key];
      saveTemplates();
      dropdown.remove();
      dropdown = null;
      buildDropdown(input);
      hideDropdown();
    }
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  item.appendChild(content);
  item.appendChild(actions);
  return item;
}

function applyFilter(search) {
  const items = dropdown.querySelectorAll('.template-item');
  let firstVisible = null;

  items.forEach(item => {
    const matches = item.dataset.key.toLowerCase().startsWith(search.toLowerCase());
    item.style.display = matches ? 'flex' : 'none';
    if (matches && !firstVisible) firstVisible = item;
  });

  items.forEach(i => i.classList.remove('selected'));
  if (firstVisible) firstVisible.classList.add('selected');
}

function moveSelection(direction) {
  const visible = Array.from(dropdown.querySelectorAll('.template-item'))
    .filter(i => i.style.display !== 'none');
  const current = visible.findIndex(i => i.classList.contains('selected'));
  let next = current + direction;
  if (next < 0) next = visible.length - 1;
  if (next >= visible.length) next = 0;
  visible.forEach(i => i.classList.remove('selected'));
  visible[next].classList.add('selected');
}


// =====================================================
// INSERT TEMPLATE TEXT INTO INPUT
// =====================================================

function insertTemplate(input, key) {
  const templateText = templates[key];

  // Restore focus + saved cursor so we know where # was typed
  input.focus();
  const sel = window.getSelection();
  if (savedRange) {
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  if (sel.rangeCount === 0) { hideDropdown(); return; }

  const range  = sel.getRangeAt(0);
  const node   = range.startContainer;
  const offset = range.startOffset;

  if (node.nodeType === Node.TEXT_NODE) {
    const before = node.textContent.substring(0, offset);
    const match  = before.match(/#(\w*)$/);

    if (match) {
      // Remove the partial #hashtag the user typed
      range.setStart(node, offset - match[0].length);
      range.setEnd(node, offset);
      range.deleteContents();

      // Insert the full template text in its place
      const textNode = document.createTextNode(templateText);
      range.insertNode(textNode);

      // Place cursor right after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      sel.removeAllRanges();
      sel.addRange(range);

      // Tell ChatGPT the content changed
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  hideDropdown();
}


// =====================================================
// CURSOR POSITION HELPERS
// =====================================================

function saveRange() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
}

function getFullText(element) {
  return element.innerText || element.textContent || '';
}

function getCaretPosition(element) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre   = range.cloneRange();
  pre.selectNodeContents(element);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}


// =====================================================
// ADD / EDIT TEMPLATE MODAL
// =====================================================

function openModal(key, value, isEdit) {
  // Remove any existing modal
  document.querySelector('.custom-modal-overlay')?.remove();
  hideDropdown();

  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'custom-modal';

  // Header
  const header = document.createElement('div');
  header.className   = 'modal-header';
  header.textContent = isEdit ? 'Edit Template' : 'New Template';

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  const keyGroup   = document.createElement('div');
  keyGroup.className = 'input-group';
  const keyLabel   = document.createElement('label');
  keyLabel.textContent = 'Trigger word (e.g. mystack)';
  const keyInput   = document.createElement('input');
  keyInput.type        = 'text';
  keyInput.value       = key || '';
  keyInput.placeholder = 'trigger';
  keyGroup.appendChild(keyLabel);
  keyGroup.appendChild(keyInput);

  const valGroup   = document.createElement('div');
  valGroup.className = 'input-group';
  const valLabel   = document.createElement('label');
  valLabel.textContent = 'Template text';
  const valInput   = document.createElement('textarea');
  valInput.value       = value || '';
  valInput.placeholder = 'Template text…';
  valInput.rows        = 4;
  valGroup.appendChild(valLabel);
  valGroup.appendChild(valInput);

  body.appendChild(keyGroup);
  body.appendChild(valGroup);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className   = 'modal-btn cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'modal-btn save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value.trim();
    const newVal = valInput.value.trim();
    if (!newKey || !newVal) { alert('Please fill in both fields.'); return; }

    // If the trigger word was renamed, remove the old one
    if (isEdit && key && key !== newKey) delete templates[key];

    templates[newKey] = newVal;
    saveTemplates();

    // Rebuild dropdown so the new template appears
    dropdown?.remove();
    dropdown = null;

    overlay.remove();
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setTimeout(() => keyInput.focus(), 100);
}


// =====================================================
// FEATURE 2 — PLACEHOLDER ICON BUTTON (bottom-right of input)
// =====================================================

function addIconButton(input) {
  // We wrap the input in a relative container so we can position the button
  const wrapper = input.closest('form') || input.parentElement;

  const btn = document.createElement('button');
  btn.id        = 'custom-action-btn';
  btn.className = 'custom-action-btn';
  btn.title     = 'Action (coming soon)';
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`;

  // Clicking does nothing yet — functionality added later
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: add functionality
  });

  wrapper.style.position = 'relative';
  wrapper.appendChild(btn);
}


// =====================================================
// START
// =====================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}