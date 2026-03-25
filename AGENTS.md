# AGENTS.md - coax-tools Development Guide

This document provides guidelines for AI agents working on the coax-tools codebase.

## Project Overview

coax-tools is a pure frontend utility collection (no backend, no Node.js build step). The project contains various browser-based tools for text processing, data conversion, file operations, and more.

## Directory Structure

```
coax-tools/
├── js/           # JavaScript source files (one per tool)
├── css/          # Tool-specific styles
├── styles/       # Theme styles (theme-base.css, theme-cli.css)
├── pages/        # HTML pages (one per tool)
├── test/         # Browser-based test suite
├── data/         # Static data files
└── images/       # Image assets
```

## Build/Test Commands

```bash
npx serve        # Start local server (http://localhost:3000)
```

**Testing**: Browser-based only - Open `test/index.html` in a browser, or open individual test pages directly (e.g., `test/pages/converter-test.html`)

## Theme System

The project uses a **Linux CLI theme** with light/dark mode support. Theme files are in `styles/`:
- `theme-base.css` - Common base styles
- `theme-cli.css` - CLI/Terminal styling with CSS variables for light/dark modes

Use `body[data-theme="cli"]` for dark mode (default) and `body[data-theme="cli"][data-mode="light"]` for light mode.

CSS Variables available:
- `--cli-bg`, `--cli-fg` - Background and foreground colors
- `--cli-fg-dim` - Dimmed foreground color
- `--cli-border` - Border color
- `--cli-error`, `--cli-warning`, `--cli-info` - Status colors

## Code Style Guidelines

### File Header (Required)

Every source file (JS/CSS/HTML) must include the MIT license header.

### JavaScript Conventions

**DOM Element Selection**: Get all DOM elements at the top of the file:
```javascript
const myElement = document.getElementById('myElement');
const myButton = document.getElementById('myButton');
```

**Initialization Pattern**:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    populateOptions();
    myButton.addEventListener('click', handleClick);
});
```

**Naming Conventions**:
- Variables/functions: `camelCase`
- DOM element variables: prefixed with type (e.g., `inputValue`, `selectCategory`)
- Event handlers: `handleEventName`

**Error Handling**:
```javascript
function doSomething(input) {
    if (!input) {
        showMessage('请输入有效数据', 'error');
        return;
    }
    try {
        const result = performOperation(input);
        showMessage('操作成功!', 'success');
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}
```

**Message Display**:
```javascript
function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = 'message ' + type + '-message';
    messageDiv.style.display = 'block';
    setTimeout(hideMessage, 3000);
}
```

### HTML Conventions

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>工具名称 - coax的小工具</title>
    <link rel="stylesheet" href="../styles/theme-base.css">
    <link rel="stylesheet" href="../styles/theme-cli.css">
    <link rel="stylesheet" href="../css/tool-specific.css">
</head>
<body data-theme="cli">
    <div class="container">
        <main>
            <!-- Tool content -->
        </main>
        <footer>
            <p>&copy; <span id="currentYear"></span> coax的小工具.</p>
        </footer>
    </div>
    <script src="../js/tool.js"></script>
    <script src="../js/theme-switcher.js"></script>
</body>
</html>
```

### Homepage Specific

The homepage (`index.html`) includes:
- Editable title (click to edit, saves to localStorage)
- Search box for filtering tools (press `/` to focus)
- Dynamic tool grid rendering from `tools` array in `main.js`

When adding a new tool:
1. Add tool object to `tools` array in `js/main.js`
2. Create `pages/tool-name.html`, `js/tool-name.js`, `css/tool-name.css`
3. Tool will automatically appear in grid and search

### CSS Conventions

- Use 4-space indentation
- CLI theme uses green-on-black terminal colors (variables defined in `theme-cli.css`)
- Support both light and dark via `body[data-theme="cli"]` selectors
- Mobile breakpoint at 768px

### General Guidelines

1. **Year in Footer**: Always include `<span id="currentYear"></span>` populated by JS
2. **Input Validation**: Always validate user input before processing
3. **Responsive Design**: Mobile-first, test at 768px
4. **Accessibility**: Semantic HTML, proper labels
5. **Comments**: Use Chinese comments

## Working with This Codebase

- **No TypeScript/ESLint/Prettier**: Plain JavaScript only
- **No Testing Framework**: Manual browser testing
- **Single File per Feature**: Each tool in its own JS/CSS/HTML files
- **No External Dependencies**: Pure vanilla JS
