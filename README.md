# ChatGPT Hashtag Templates

ChatGPT Hashtag Templates is a lightweight Chrome extension that helps you reuse prompt snippets inside ChatGPT by typing `#` and selecting a saved template. It is designed for faster prompting, cleaner workflows, and easier prompt management directly inside the ChatGPT input box.

## Features

- Trigger saved templates instantly by typing `#`
- Filter templates as you type
- Insert a template directly into the ChatGPT prompt box
- Navigate the template list with keyboard shortcuts
- Add new templates from the dropdown
- Edit or delete existing templates
- Save templates locally with Chrome storage
- Includes useful default templates for brainstorming, debugging, teaching, review, and more

## Current UI

### Templates Dropdown

When you type `#`, the extension opens a dropdown showing all saved templates and matching results.

![Templates Dropdown](https://github.com/user-attachments/assets/c3fe1494-d539-43c0-bf64-d46dedc19d78)

### Add / Edit Template

The extension also supports creating new templates and updating existing ones through a simple modal interface.

![Add or Edit Template](https://github.com/user-attachments/assets/7a34cd92-80b5-48bd-97e6-3fd0aebdc488)

### Prompt Improvement Flow

This project also includes a prompt-improvement direction in the product vision for keeping prompts more relevant over time.

![Prompt Improvement](https://github.com/user-attachments/assets/79834454-b131-48e6-b132-d1b409fe9b8d)

## Default Templates Included

The extension currently ships with starter templates such as:

- `#mystack`
- `#myproject`
- `#mylevel`
- `#gate`
- `#teach`
- `#brainstorm`
- `#debug`
- `#review`

## How It Works

1. Open ChatGPT
2. Click into the main prompt input
3. Type `#`
4. Choose a template from the dropdown
5. Press `Enter` or click the template to insert it

## Installation

1. Download or clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder you downloaded or cloned

## Project Structure

```text
gpt-extension/
├── content.js      # Core extension logic for templates, dropdown, and modal UI
├── styles.css      # Styling for the dropdown, modal, and action button
├── manifest.json   # Chrome extension manifest (MV3)
└── icon*.png       # Extension icons
```

## Tech Stack

- JavaScript
- Chrome Extensions Manifest V3
- Chrome Storage API
- CSS

## Status

### Implemented

- Template dropdown
- Local template persistence
- Add, edit, and delete template flow
- Keyboard navigation for selection

### Planned / In Progress

- Prompt improvement action from the input toolbar

## Why This Project

This extension is useful for anyone who frequently reuses prompt patterns in ChatGPT and wants a faster way to manage them without leaving the conversation interface.

## Author

Built by [Hari Charan](https://github.com/haricharanbonam)
