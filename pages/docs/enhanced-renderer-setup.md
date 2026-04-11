# Enhanced Page Renderer Setup Guide

## Overview

The Enhanced Page Renderer system provides a unified schema-driven approach to building and rendering pages across both mobile and web platforms. This system ensures that pages created in the mobile app render perfectly on the web.

## Key Components

### 1. Section Definitions (`@crown-pages/types` package)

The single source of truth for all page sections is now maintained in the `@crown-pages/types` package. This package defines:

- **Field schemas** with validation rules
- **Default data** for new sections
- **Platform-specific rendering hints**
- **Icon mappings** between mobile (Ionicons) and web (Lucide)

### 2. Enhanced Page Renderer (`components/enhanced-page-renderer.tsx`)

Replaces the old hardcoded renderer with:

- **Dynamic section loading** based on schema
- **Data validation** with helpful error messages
- **Consistent theming** across all sections
- **Development debugging** features

### 3. Type Synchronization

Keep types in sync with the shared package:

- **Automatic updates** from the crown-pages-types repository
- **Version control** for type definitions
- **Cross-platform consistency**

## Setup Instructions

### 1. Update Types Package

To sync with the latest type definitions:

```bash
npm run update:types
```

### 2. Verify Integration

The system is now active. You can verify by:

- Checking for the blue banner in development mode
- Looking at browser console for validation messages
- Testing with existing pages

## Architecture Benefits

### ✅ **Schema-Driven Development**

- Add new section types in one place
- Automatic validation across platforms
- Consistent field definitions

### ✅ **Cross-Platform Sync**

- Mobile creates, web renders perfectly
- Shared validation rules
- Platform-specific optimizations

### ✅ **Developer Experience**

- Clear error messages for invalid data
- Debug utilities for troubleshooting
- Hot-reload friendly development

### ✅ **Maintainability**

- Single source of truth
- Type safety across platforms
- Easy to extend with new sections

## Section Types

The system currently supports 9 section types:

| Type           | Description      | Mobile Editor | Web Renderer |
| -------------- | ---------------- | ------------- | ------------ |
| `hero`         | Header with CTA  | ✅            | ✅           |
| `about`        | Text + image     | ✅            | ✅           |
| `contact`      | Contact info     | ✅            | ✅           |
| `features`     | Feature grid     | ✅            | ✅           |
| `gallery`      | Image gallery    | ✅            | ✅           |
| `testimonials` | Customer reviews | ✅            | ✅           |
| `faq`          | Q&A accordion    | ✅            | ✅           |
| `documents`    | File downloads   | ✅            | ✅           |
| `cta`          | Call-to-action   | ✅            | ✅           |

## Adding New Section Types

### 1. Define in Schema

Add to `SECTION_DEFINITIONS` in the `@crown-pages/types` package:

```typescript
newSection: {
  type: 'newSection',
  name: 'New Section',
  description: 'Description of what this section does',
  category: 'content',
  icon: {
    mobile: 'ionicon-name',
    web: 'lucide-icon-name'
  },
  fields: {
    title: {
      type: 'text',
      required: true,
      label: 'Section Title',
      maxLength: 80
    }
    // ... more fields
  },
  defaultData: {
    title: 'Default Title'
  },
  // ... styling and rendering hints
}
```

### 2. Create Web Component

Create `components/sections/new-section.tsx`:

```typescript
export function NewSection({
  data,
  business,
  pageId,
  sectionId,
  styles,
}: NewSectionProps) {
  const { title } = data;
  const theme = useTheme();

  return (
    <section className="py-16 px-4">
      <h2 style={{ color: theme.text.primary }}>{title}</h2>
    </section>
  );
}
```

### 3. Register Component

Add to `getSectionComponent` in `enhanced-page-renderer.tsx`:

```typescript
const getSectionComponent = (sectionType: string) => {
  const componentMap: Record<string, React.ComponentType<any>> = {
    // ... existing components
    newSection: NewSection,
  };
  return componentMap[sectionType];
};
```

### 4. Create Mobile Editor

Add editing component in mobile app:

- `components/page-editor/sections/NewSectionEditor.tsx`
- Register in mobile app's section editor

### 5. Update Types & Test

```bash
npm run update:types
```

## Validation & Debugging

### Field Validation

The system validates:

- **Required fields** are present
- **Text length** limits
- **Array size** constraints
- **Field types** match schema

### Debug Utilities

```typescript
import { debugSectionValidation } from "@/components/enhanced-page-renderer";

// In your component or console
debugSectionValidation(pageContent);
```

### Error Handling

- **Unknown sections** show yellow warning
- **Missing components** show red error
- **Invalid data** logs to console
- **Schema mismatches** prevent crashes

## Migration from Old System

The old `PageRenderer` is still available but deprecated. The enhanced system:

1. **Maintains compatibility** with existing data
2. **Adds validation** without breaking changes
3. **Provides better errors** for troubleshooting
4. **Enables new features** like dynamic sections

## Production Considerations

### Performance

- **Lazy loading** of section components
- **Minimal bundle impact** with tree shaking
- **Cached validation** results

### Monitoring

- **Error boundaries** catch render failures
- **Analytics integration** tracks section usage
- **Performance metrics** for optimization

### Deployment

- **Schema versioning** for compatibility
- **Gradual rollout** capabilities
- **Rollback safety** with old renderer

## Troubleshooting

### Common Issues

**Q: Section not rendering?**
A: Check component is registered in `getSectionComponent`

**Q: Validation errors?**
A: Use `debugSectionValidation` to see specific issues

**Q: Mobile changes not reflected?**
A: Run `npm run update:types` to update type definitions

**Q: TypeScript errors?**
A: Ensure all imports use `enhanced-page-renderer` not `page-renderer`

### Getting Help

1. Check browser console for validation messages
2. Enable development banner for schema version
3. Use debug utilities for detailed analysis
4. Review section definitions for field requirements

## Future Enhancements

- **Visual section editor** for web platform
- **A/B testing** for section variations
- **Performance analytics** per section type
- **Custom CSS injection** per section
- **Section templates** and presets
