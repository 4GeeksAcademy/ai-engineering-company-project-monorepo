# Component Generator Skill

Generate accessible React/Next.js components following WCAG 2.1 AA standards and best practices.

## Quick Start

### Using the Script

```bash
# Generate a server component (default)
./skills/component-generator/scripts/generate-component.sh MyComponent

# Generate a client component (with hooks/interactivity)
./skills/component-generator/scripts/generate-component.sh MyForm --client

# Generate in a custom location
./skills/component-generator/scripts/generate-component.sh MyWidget --path ./src/components
```

### Manual Creation

1. Create directory: `components/MyComponent/`
2. Create `index.tsx` with barrel export
3. Create `MyComponent.tsx` with the component implementation
4. Follow the patterns in `SKILL.md`

## Component Structure

```
components/
└── MyComponent/
    ├── index.tsx           # Export { default } from "./MyComponent"
    └── MyComponent.tsx     # Component implementation
```

## Examples

See the `examples/` directory for complete, accessible components:

- **Button** - Multi-variant button with loading states
- **Accordion** - Expandable content with keyboard navigation
- **Card** - Versatile content container

## Accessibility Features

All generated components include:

- ✅ Semantic HTML elements
- ✅ ARIA attributes where needed
- ✅ Keyboard navigation support
- ✅ Visible focus indicators (`focus-visible`)
- ✅ Screen reader friendly
- ✅ Color contrast compliance

## Resources

- `resources/accessibility-checklist.md` - WCAG 2.1 AA checklist
- `SKILL.md` - Detailed patterns and conventions

## Best Practices

1. **Server Components by default** - Only add `"use client"` when needed
2. **TypeScript** - Always define proper interfaces
3. **Composition** - Prefer composition over props drilling
4. **Performance** - Use dynamic imports for heavy components
5. **Testing** - Test with keyboard and screen reader

## Next.js Specific

- Use `async` components for data fetching
- Prefer Server Components for static content
- Use `"use client"` only for interactivity
- Implement proper loading states
- Add error boundaries for error handling

## Contributing

When adding new component examples:
1. Follow the file structure pattern
2. Include JSDoc with `@accessibility` section
3. Add TypeScript interfaces
4. Test with keyboard navigation
5. Verify with screen reader
