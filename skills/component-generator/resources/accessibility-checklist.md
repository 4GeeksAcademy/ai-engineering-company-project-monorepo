# Accessibility Checklist (WCAG 2.1 AA)

## Perceivable

### 1.1.1 Non-text Content
- [ ] All images have `alt` text
- [ ] Decorative images use `alt=""`
- [ ] Icons have accessible labels or are hidden with `aria-hidden="true"`
- [ ] CAPTCHAs have alternatives

### 1.3.1 Info and Relationships
- [ ] Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`)
- [ ] Headings follow logical hierarchy (h1 → h2 → h3)
- [ ] Lists use `<ul>`, `<ol>`, `<dl>`
- [ ] Tables have proper headers with `<th>` and `scope`
- [ ] Form groups use `<fieldset>` and `<legend>`

### 1.4.1 Use of Color
- [ ] Color is not the only visual means of conveying information
- [ ] Add text labels, patterns, or icons alongside color

### 1.4.3 Contrast (Minimum)
- [ ] Normal text: 4.5:1 contrast ratio
- [ ] Large text (18pt or 14pt bold): 3:1 contrast ratio

### 1.4.11 Non-text Contrast
- [ ] UI components: 3:1 contrast ratio
- [ ] Focus indicators: 3:1 contrast ratio

## Operable

### 2.1.1 Keyboard
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Skip navigation link provided

### 2.1.2 No Keyboard Trap
- [ ] Focus can be moved away from any component
- [ ] Modal dialogs trap focus correctly

### 2.4.1 Bypass Blocks
- [ ] Skip link to main content
- [ ] Landmark regions properly defined

### 2.4.3 Focus Order
- [ ] Tab order follows logical reading order
- [ ] Focus moves through interactive elements in sequence

### 2.4.4 Link Purpose
- [ ] Links have descriptive text
- [ ] Links are distinguishable from surrounding text

### 2.4.6 Headings and Labels
- [ ] Headings describe topic or purpose
- [ ] Labels describe input purpose

### 2.4.7 Focus Visible
- [ ] Custom focus styles using `focus-visible`
- [ ] Focus indicator has sufficient contrast

## Understandable

### 3.1.1 Language of Page
- [ ] `<html>` has `lang` attribute
- [ ] Language changes marked with `lang` attribute

### 3.2.1 On Focus
- [ ] No unexpected context changes on focus

### 3.3.1 Error Identification
- [ ] Errors clearly identified
- [ ] Error messages descriptive

### 3.3.2 Labels or Instructions
- [ ] Form inputs have visible labels
- [ ] Required fields indicated
- [ ] Format requirements provided

## Robust

### 4.1.1 Parsing
- [ ] Valid HTML
- [ ] Unique IDs

### 4.1.2 Name, Role, Value
- [ ] Custom components have appropriate ARIA roles
- [ ] State changes announced via ARIA
- [ ] Custom widgets follow WAI-ARIA patterns

## Quick Reference: Common ARIA Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `aria-label` | Provides accessible name | `<button aria-label="Close">✕</button>` |
| `aria-labelledby` | References element with label | `<section aria-labelledby="heading-id">` |
| `aria-describedby` | References description | `<input aria-describedby="hint-text">` |
| `aria-expanded` | Indicates expandable state | `<button aria-expanded="false">` |
| `aria-hidden` | Hides from screen readers | `<span aria-hidden="true">✓</span>` |
| `aria-live` | Announces dynamic changes | `<div aria-live="polite">` |
| `aria-required` | Indicates required field | `<input aria-required="true">` |
| `aria-invalid` | Indicates validation error | `<input aria-invalid="true">` |
| `role` | Defines element purpose | `<div role="alert">` |

## Testing Tools

1. **Keyboard Testing**: Tab through all interactive elements
2. **Screen Reader Testing**: Use NVDA (Windows), VoiceOver (Mac), or Orca (Linux)
3. **axe DevTools**: Browser extension for automated testing
4. **Lighthouse**: Built into Chrome DevTools
5. **WAVE**: Web accessibility evaluation tool

## Common Patterns

### Skip Link
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white"
>
  Skip to main content
</a>
```

### Focus Management
```tsx
// Move focus to element
const element = document.getElementById("target");
element?.focus();

// Trap focus in modal
useEffect(() => {
  if (isOpen) {
    firstFocusableRef.current?.focus();
  }
}, [isOpen]);
```

### Live Regions
```tsx
// Announce status changes
<div aria-live="polite" aria-atomic="true">
  {status && <p>{status}</p>}
</div>

// Announce errors immediately
<div role="alert">
  {error && <p>{error}</p>}
</div>
```
