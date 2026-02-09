// ChatGPT Hashtag Templates & PDF Export Extension

// Default templates
const DEFAULT_TEMPLATES = {
  'mystack': "I'm working with React, TypeScript, Tailwind, and Supabase",
  'myproject': "I'm building a SaaS for freelancers that helps them track time and invoice clients",
  'mylevel': "I'm a beginner in programming, currently learning JavaScript. I know HTML/CSS well",
  'gate': "I'm preparing for GATE CS exam. For each concept: give deep explanation, explain why wrong options are wrong, and suggest related questions I can expect",
  'teach': "Teach me this concept. After explaining, give me a small quiz question to check my understanding. Wait for my answer before continuing.",
  'brainstorm': "Let's brainstorm together. After each of your responses, ask me 2-3 follow-up questions to explore the idea deeper. Challenge my assumptions.",
  'debug': "I need debugging help. Ask me clarifying questions first before suggesting solutions. Think step-by-step about what could be wrong.",
  'review': "Review what I'm sharing. Be critical but constructive. Point out what's good AND what needs improvement."
};

let templates = {};
let dropdown = null;
let isFromPaste = false;

// Load templates from storage
function loadTemplates() {
  chrome.storage.local.get(['templates'], (result) => {
    if (result.templates) {
      templates = result.templates;
    } else {
      templates = { ...DEFAULT_TEMPLATES };
      saveTemplates();
    }
  });
}

// Save templates to storage
function saveTemplates() {
  chrome.storage.local.set({ templates: templates });
}

// Delete template
function deleteTemplate(key) {
  if (confirm(`Are you sure you want to delete template "#${key}"?`)) {
    delete templates[key];
    saveTemplates();
    createDropdown(); // Re-render dropdown
    showDropdown(document.querySelector('#prompt-textarea')); // Refresh view
  }
}



// Initialize
function init() {
  loadTemplates();
  observeInput();
    // loadPDFLibrary();  
  observeResponses();

}

// Observe input field for hashtags
function observeInput() {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) {
    setTimeout(observeInput, 1000);
    return;
  }

  // Detect paste events
  inputField.addEventListener('paste', () => {
    isFromPaste = true;
    setTimeout(() => {
      isFromPaste = false;
    }, 100);
  });

  // Detect manual typing
  inputField.addEventListener('input', (e) => {
    if (isFromPaste) return;

    const text = inputField.innerText || inputField.textContent || '';
    const cursorPos = getCaretPosition(inputField);
    
    // Check if user just typed '#'
    if (text[cursorPos - 1] === '#') {
      showDropdown(inputField);
    } else if (dropdown && dropdown.style.display === 'block') {
      // Update dropdown filter based on text after #
      const beforeCursor = text.substring(0, cursorPos);
      const hashtagMatch = beforeCursor.match(/#(\w*)$/);
      if (hashtagMatch) {
        filterDropdown(hashtagMatch[1]);
      } else {
        hideDropdown();
      }
    }
  });

  // Handle keyboard navigation
  inputField.addEventListener('keydown', (e) => {
    // If dropdown is visible
    if (dropdown && dropdown.style.display === 'block') {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateDropdown(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        const selected = dropdown.querySelector('.template-item.selected');
        if (selected) {
          e.preventDefault();
          e.stopPropagation(); // Stop event from propagating to other listeners
          selectTemplate(selected.dataset.key);
        }
      }
    } 
    // If dropdown is NOT visible, handle Enter for template replacement
    else if (e.key === 'Enter' && !e.shiftKey) {
       // Replace IMMEDIATELY before the send event processes
       // We use a slight timeout or verify if we need to block propagation
       // But usually, we just want to replace text.
       // However, to ensure text is replaced BEFORE send, we should preventing default if needed, 
       // but ChatGPT sends on Enter. 
       
       // Best approach: Replace text synchronously then let the event proceed?
       // Or is replaceHashtagsInInput synchronous? Yes.
       replaceHashtagsInInput();
       // We don't prevent default here so ChatGPT can still send the message
    }
  }, true); // Capture phase to run before other handlers
}

// Get caret position in contenteditable div
function getCaretPosition(element) {
  let position = 0;
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    position = preCaretRange.toString().length;
  }
  return position;
}

// Show dropdown with templates
function showDropdown(inputField) {
  if (!dropdown) {
    createDropdown();
  }

  const rect = inputField.getBoundingClientRect();
  dropdown.style.display = 'block';
  dropdown.style.top = `${rect.top - dropdown.offsetHeight - 10}px`;
  dropdown.style.left = `${rect.left}px`;

  filterDropdown('');
}

// Create dropdown element
function createDropdown() {
  if (dropdown) {
    dropdown.remove();
  }

  dropdown = document.createElement('div');
  dropdown.id = 'hashtag-dropdown';
  dropdown.className = 'hashtag-dropdown';

  // 1. Header
  const header = document.createElement('div');
  header.className = 'dropdown-header';
  
  const title = document.createElement('span');
  title.textContent = 'Templates';
  title.className = 'header-title';
  
  const addBtn = document.createElement('button');
  addBtn.className = 'icon-btn add-btn';
  addBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
  addBtn.title = 'Add New Template';
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(null, '', false);
  });

  header.appendChild(title);
  header.appendChild(addBtn);
  dropdown.appendChild(header);

  // 2. List
  const templateList = document.createElement('div');
  templateList.className = 'template-list';

  Object.keys(templates).forEach((key, index) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    if (index === 0) item.classList.add('selected');
    item.dataset.key = key;

    // Content container
    const content = document.createElement('div');
    content.className = 'item-content';

    const name = document.createElement('div');
    name.className = 'template-name';
    name.textContent = `#${key}`;

    const preview = document.createElement('div');
    preview.className = 'template-preview';
    preview.textContent = templates[key];

    content.appendChild(name);
    content.appendChild(preview);

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'item-actions';

    // Edit Button
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn edit-btn';
    editBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    `;
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(key, templates[key], true);
    });

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn del-btn';
    delBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTemplate(key);
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(content);
    item.appendChild(actions);
    
    // Select on click (if not clicking actions)
    item.addEventListener('mousedown', (e) => e.preventDefault());
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.icon-btn')) {
        selectTemplate(key);
      }
    });
    
    item.addEventListener('mouseenter', () => {
      dropdown.querySelectorAll('.template-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
    });

    templateList.appendChild(item);
  });

  dropdown.appendChild(templateList);
  document.body.appendChild(dropdown);

  // Close on click outside
  document.addEventListener('click', (e) => {
    // If click is outside dropdown AND not in a modal
    if (dropdown && 
        !dropdown.contains(e.target) && 
        e.target.id !== 'prompt-textarea' && 
        !document.querySelector('.custom-modal-overlay')) {
      hideDropdown();
    }
  });
}

// Filter dropdown based on search
function filterDropdown(search) {
  const items = dropdown.querySelectorAll('.template-item');
  let firstVisible = null;

  items.forEach(item => {
    const key = item.dataset.key;
    if (key.toLowerCase().startsWith(search.toLowerCase())) {
      item.style.display = 'flex';
      if (!firstVisible) firstVisible = item;
    } else {
      item.style.display = 'none';
    }
  });

  // Select first visible item
  items.forEach(i => i.classList.remove('selected'));
  if (firstVisible) firstVisible.classList.add('selected');
}

// Navigate dropdown with arrow keys
function navigateDropdown(direction) {
  const items = Array.from(dropdown.querySelectorAll('.template-item')).filter(
    item => item.style.display !== 'none'
  );
  const currentIndex = items.findIndex(item => item.classList.contains('selected'));
  let newIndex = currentIndex + direction;

  if (newIndex < 0) newIndex = items.length - 1;
  if (newIndex >= items.length) newIndex = 0;

  items.forEach(item => item.classList.remove('selected'));
  items[newIndex].classList.add('selected');
}

// Select template and insert into input
function selectTemplate(key) {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) return;

  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;

  // Check text content before cursor in current node
  if (node.nodeType === Node.TEXT_NODE) {
    const textBefore = node.textContent.substring(0, offset);
    const match = textBefore.match(/#(\w*)$/);
    
    if (match) {
      const matchLength = match[0].length;
      
      // Delete the partial hashtag
      range.setStart(node, offset - matchLength);
      range.setEnd(node, offset);
      range.deleteContents();
      
      // Insert completed hashtag (NOT the template content yet)
      const hashtagText = `#${key} `;
      const textNode = document.createTextNode(hashtagText);
      range.insertNode(textNode);
      
      // Move cursor after the inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger input event so the field updates
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  hideDropdown();
}

// Open Modal for Add/Edit
function openModal(key, value, isEdit) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.custom-modal-overlay');
  if (existingModal) existingModal.remove();

  // Hide dropdown
  hideDropdown();

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'custom-modal-overlay';

  // Modal Container
  const modal = document.createElement('div');
  modal.className = 'custom-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  header.textContent = isEdit ? 'Edit Template' : 'New Template';

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  // Key Input
  const keyGroup = document.createElement('div');
  keyGroup.className = 'input-group';
  const keyLabel = document.createElement('label');
  keyLabel.textContent = 'Trigger (e.g., mystack)';
  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.value = key || '';
  keyInput.placeholder = 'trigger';
  if (isEdit) {
    keyInput.disabled = true; // Key is unique identifier, maybe allow editing if we handle rename logic, but simpler to lock for now or clone. 
    // Actually, user might want to rename. Let's allow editing but we need to handle key change.
    // For simplicity V1: If key changes, it creates new, need to delete old? 
    // Let's keep it simple: Key is ID. If they want new key, delete old and add new.
    // OR: Allow rename, handle logic. Let's allow rename for better UX.
    keyInput.disabled = false; 
  }
  keyGroup.appendChild(keyLabel);
  keyGroup.appendChild(keyInput);

  // Value Input
  const valGroup = document.createElement('div');
  valGroup.className = 'input-group';
  const valLabel = document.createElement('label');
  valLabel.textContent = 'Template Content';
  const valInput = document.createElement('textarea');
  valInput.value = value || '';
  valInput.placeholder = 'Template text...';
  valInput.rows = 4;
  valGroup.appendChild(valLabel);
  valGroup.appendChild(valInput);

  body.appendChild(keyGroup);
  body.appendChild(valGroup);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'modal-btn cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const saveBtn = document.createElement('button');
  saveBtn.className = 'modal-btn save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => {
    const newKey = keyInput.value.trim();
    const newValue = valInput.value.trim();

    if (!newKey || !newValue) {
      alert('Please fill in both fields');
      return;
    }

    // If editing and key changed, delete old key
    if (isEdit && key && key !== newKey) {
      delete templates[key];
    }
    
    // Save new/updated template
    templates[newKey] = newValue;
    saveTemplates();
    
    // Refresh Dropdown
    createDropdown();
    
    overlay.remove();
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus input
  setTimeout(() => keyInput.focus(), 100);
}

// Hide dropdown
function hideDropdown() {
  if (dropdown) {
    dropdown.style.display = 'none';
  }
}

// Setup send button listener to replace hashtags
// Setup send button listener to replace hashtags


// Replace all hashtags with their definitions BEFORE sending
function replaceHashtagsInInput() {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) return;

  // Get all text nodes and replace hashtags
  const walker = document.createTreeWalker(
    inputField,
    NodeFilter.SHOW_TEXT,
    null
  );

  const nodesToReplace = [];
  let node;

  while (node = walker.nextNode()) {
    let text = node.textContent;
    let hasHashtag = false;
    
    // Check if this text node contains any hashtags
    Object.keys(templates).forEach(key => {
      const pattern = '#' + key + '\\b';
      const regex = new RegExp(pattern, 'g');
      if (regex.test(text)) {
        hasHashtag = true;
      }
    });

    if (hasHashtag) {
      nodesToReplace.push(node);
    }
  }

  // Replace hashtags in collected nodes
  nodesToReplace.forEach(node => {
    let text = node.textContent;
    
    Object.keys(templates).forEach(key => {
      const pattern = '#' + key + '\\b';
      // Use function replacement to avoid issues with special chars in template content
      const regex = new RegExp(pattern, 'g');
      text = text.replace(regex, templates[key]);
    });

    node.textContent = text;
  });

  // Trigger input event to update the field
  if (nodesToReplace.length > 0) {
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Observe for new responses to add PDF button
function observeResponses() {
  const observer = new MutationObserver(() => {
    addPDFButtonsToResponses();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Aggressive initial check and interval
  setTimeout(() => {
    addPDFButtonsToResponses();
    setInterval(addPDFButtonsToResponses, 3000); // Keep checking
  }, 2000);
}

// Add PDF download button to responses
function addPDFButtonsToResponses() {
  // Find all assistant message containers
  const responses = document.querySelectorAll('[data-message-author-role="assistant"]');
  console.log('🔍 Found responses:', responses.length);
  
  responses.forEach((response, i) => {
    // console.log(`Response ${i}:`, response);

    // Check if PDF button already exists
    if (response.querySelector('.pdf-download-btn')) return;

    // Find the copy button
    const copyButton = response.querySelector('button[data-testid="copy-turn-action-button"]') || 
                       response.querySelector('button[aria-label="Copy"]');
    
    // console.log(`Copy button ${i}:`, copyButton);

    if (!copyButton) {
        // console.log("Copy button not found for response", i);
        return;
    }

    // console.log('Parent:', copyButton.parentElement);

    // Create and insert PDF button
    const pdfButton = createPDFButton(response);
    
    // Insert PDF button IMMEDIATELY after copy button
    copyButton.insertAdjacentElement('afterend', pdfButton);
  });
}

// Create PDF download button
function createPDFButton(responseElement) {
  const button = document.createElement('button');
  button.className = 'text-token-text-secondary hover:bg-token-bg-secondary rounded-lg pdf-download-btn';
  button.setAttribute('aria-label', 'Download PDF');
  button.setAttribute('data-testid', 'pdf-download-button');
  button.setAttribute('data-state', 'closed');

  button.innerHTML = `
    <span class="flex items-center justify-center touch:w-10 h-8 w-8">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </span>
  `;

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadResponseAsPDF(responseElement);
  });

  return button;
}

// Download response as PDF
// Download response as PDF using Print-to-PDF
function downloadResponseAsPDF(responseElement) {
  // Get user question (optional, but good context)
  let userQuestion = '';
  const prevUserMsg = responseElement.closest('.group/conversation-turn')?.querySelector('[data-message-author-role="user"]');
  // Or navigate nicely if structure is different
  if (!prevUserMsg) {
       // fallback approach: previous sibling
       const potentialUserMsg = responseElement.parentElement.previousElementSibling;
       if (potentialUserMsg && potentialUserMsg.querySelector('[data-message-author-role="user"]')) {
           userQuestion = potentialUserMsg.innerText;
       }
  } else {
      userQuestion = prevUserMsg.innerText;
  }

  // Get content
  const content = responseElement.innerHTML;
  
  if (!content) {
    alert('No content found to export');
    return;
  }

  // Create print window
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) {
      alert('Please allow popups to download PDF');
      return;
  }

  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
      }
      .question-section {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      .question-label {
        color: #666;
        font-size: 0.9em;
        text-transform: uppercase;
        margin-bottom: 5px;
        font-weight: bold;
      }
      .question-text {
        font-size: 1.1em;
        font-weight: 500;
        color: #1a1a1a;
      }
      .response-section {
        margin-top: 20px;
      }
      .response-label {
         color: #666;
        font-size: 0.9em;
        text-transform: uppercase;
        margin-bottom: 15px;
        font-weight: bold;
      }
      /* Markdown content styling */
      pre {
        background: #f4f4f4;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
      }
      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        font-size: 0.9em;
        background: rgba(0,0,0,0.05);
        padding: 2px 4px;
        border-radius: 3px;
      }
      pre code {
        background: none;
        padding: 0;
      }
      blockquote {
        border-left: 4px solid #ddd;
        margin: 0;
        padding-left: 15px;
        color: #666;
      }
      img {
        max-width: 100%;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 15px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f9f9f9;
      }
      /* Hide elements that shouldn't appear in print */
      .pdf-download-btn, button {
        display: none !important;
      }
    </style>
  `;

  // Write content
  printWindow.document.write('<html><head><title>ChatGPT Export</title>');
  printWindow.document.write(styles);
  printWindow.document.write('</head><body>');
  
  if (userQuestion) {
    printWindow.document.write(`
      <div class="question-section">
        <div class="question-label">Question</div>
        <div class="question-text">${userQuestion}</div>
      </div>
    `);
  }

  printWindow.document.write(`
    <div class="response-section">
      <div class="response-label">Response</div>
      <div class="response-content">${content}</div>
    </div>
  `);
  
  printWindow.document.write('</body></html>');
  
  printWindow.document.close();
  printWindow.focus();

  // Wait for images to load (if any) then print
  setTimeout(() => {
      printWindow.print();
      // Optional: close after print. 
      // Some browsers block close() if script didn't open it, but we did.
      // However, it's often better to let user close to see what they printed if print fails.
      // But user requested auto-close.
      printWindow.close();
  }, 500);
}
// Start the extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}