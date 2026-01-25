// ChatGPT Hashtag Templates & PDF Export Extension

// Hardcoded templates
const TEMPLATES = {
  'mystack': "I'm working with React, TypeScript, Tailwind, and Supabase",
  'myproject': "I'm building a SaaS for freelancers that helps them track time and invoice clients",
  'mylevel': "I'm a beginner in programming, currently learning JavaScript. I know HTML/CSS well",
  'gate': "I'm preparing for GATE CS exam. For each concept: give deep explanation, explain why wrong options are wrong, and suggest related questions I can expect",
  'teach': "Teach me this concept. After explaining, give me a small quiz question to check my understanding. Wait for my answer before continuing.",
  'brainstorm': "Let's brainstorm together. After each of your responses, ask me 2-3 follow-up questions to explore the idea deeper. Challenge my assumptions.",
  'debug': "I need debugging help. Ask me clarifying questions first before suggesting solutions. Think step-by-step about what could be wrong.",
  'review': "Review what I'm sharing. Be critical but constructive. Point out what's good AND what needs improvement."
};

let dropdown = null;
let isFromPaste = false;

// Load jsPDF library
function loadJsPDF() {
  if (typeof window.jspdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);
  }
}

// Initialize
function init() {
  loadJsPDF();
  observeInput();
  observeResponses();
  setupSendButtonListener();
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
    if (dropdown && dropdown.style.display === 'block') {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateDropdown(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === 'Enter') {
        const selected = dropdown.querySelector('.template-item.selected');
        if (selected) {
          e.preventDefault();
          selectTemplate(selected.dataset.key);
        }
      }
    }
  });
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
  dropdown = document.createElement('div');
  dropdown.id = 'hashtag-dropdown';
  dropdown.className = 'hashtag-dropdown';

  const templateList = document.createElement('div');
  templateList.className = 'template-list';

  Object.keys(TEMPLATES).forEach((key, index) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    if (index === 0) item.classList.add('selected');
    item.dataset.key = key;

    const name = document.createElement('div');
    name.className = 'template-name';
    name.textContent = `#${key}`;

    const preview = document.createElement('div');
    preview.className = 'template-preview';
    preview.textContent = TEMPLATES[key];

    item.appendChild(name);
    item.appendChild(preview);
    
    item.addEventListener('click', () => selectTemplate(key));
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
    if (dropdown && !dropdown.contains(e.target) && e.target.id !== 'prompt-textarea') {
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

  const text = inputField.innerText || inputField.textContent || '';
  const cursorPos = getCaretPosition(inputField);
  
  // Find the hashtag to replace
  const beforeCursor = text.substring(0, cursorPos);
  const hashtagMatch = beforeCursor.match(/#(\w*)$/);
  
  if (hashtagMatch) {
    const hashtagStart = cursorPos - hashtagMatch[0].length;
    const newText = text.substring(0, hashtagStart) + `#${key}` + text.substring(cursorPos);
    
    inputField.innerText = newText;
    
    // Set cursor after inserted hashtag
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(inputField.childNodes[0] || inputField, hashtagStart + key.length + 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  hideDropdown();
}

// Hide dropdown
function hideDropdown() {
  if (dropdown) {
    dropdown.style.display = 'none';
  }
}

// Setup send button listener to replace hashtags
function setupSendButtonListener() {
  // Observe for send button clicks
  document.addEventListener('click', (e) => {
    const sendButton = e.target.closest('.composer-submit-button-color');
    if (sendButton) {
      setTimeout(() => replaceHashtagsInInput(), 0);
    }
  });

  // Also listen for Enter key in input
  const inputField = document.querySelector('#prompt-textarea');
  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && (!dropdown || dropdown.style.display === 'none')) {
        setTimeout(() => replaceHashtagsInInput(), 0);
      }
    });
  } else {
    setTimeout(setupSendButtonListener, 1000);
  }
}

// Replace all hashtags with their definitions
function replaceHashtagsInInput() {
  const inputField = document.querySelector('#prompt-textarea');
  if (!inputField) return;

  let text = inputField.innerText || inputField.textContent || '';
  
  // Replace all hashtags
  Object.keys(TEMPLATES).forEach(key => {
    const regex = new RegExp(`#${key}\\b`, 'g');
    text = text.replace(regex, TEMPLATES[key]);
  });

  inputField.innerText = text;
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

  // Initial check
  addPDFButtonsToResponses();
}

// Add PDF download button to responses
function addPDFButtonsToResponses() {
  const responses = document.querySelectorAll('div[data-message-author-role="assistant"]');
  
  responses.forEach(response => {
    // Check if PDF button already exists
    if (response.querySelector('.pdf-download-btn')) return;

    const copyButton = response.querySelector('button[data-testid="copy-turn-action-button"]');
    if (!copyButton) return;

    const pdfButton = createPDFButton(response);
    copyButton.parentNode.insertBefore(pdfButton, copyButton.nextSibling);
  });
}

// Create PDF download button
function createPDFButton(responseElement) {
  const button = document.createElement('button');
  button.className = 'text-token-text-secondary hover:bg-token-bg-secondary rounded-lg pdf-download-btn';
  button.setAttribute('aria-label', 'Download PDF');
  button.setAttribute('data-testid', 'pdf-download-button');

  button.innerHTML = `
    <span class="flex items-center justify-center touch:w-10 h-8 w-8">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </span>
  `;

  button.addEventListener('click', () => downloadResponseAsPDF(responseElement));

  return button;
}

// Download response as PDF
function downloadResponseAsPDF(responseElement) {
  // Wait for jsPDF to load
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library is loading. Please try again in a moment.');
    setTimeout(() => downloadResponseAsPDF(responseElement), 1000);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Get user question (previous user message)
  let userQuestion = 'User Question';
  const prevUserMsg = responseElement.previousElementSibling;
  if (prevUserMsg && prevUserMsg.getAttribute('data-message-author-role') === 'user') {
    userQuestion = prevUserMsg.innerText || prevUserMsg.textContent || 'User Question';
  }

  // Get ChatGPT response
  const responseContent = responseElement.querySelector('.markdown.prose');
  const responseText = responseContent ? (responseContent.innerText || responseContent.textContent) : 'No response found';

  // PDF styling
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);

  // Add question
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Question:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const questionLines = doc.splitTextToSize(userQuestion.trim(), maxWidth);
  doc.text(questionLines, margin, yPosition);
  yPosition += questionLines.length * 5 + 10;

  // Add response
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Response:', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  const responseLines = doc.splitTextToSize(responseText.trim(), maxWidth);
  
  responseLines.forEach(line => {
    if (yPosition > 280) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `chatgpt-response-${timestamp}.pdf`;

  // Download
  doc.save(filename);
}

// Start the extension
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}