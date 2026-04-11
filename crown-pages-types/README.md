# CrownPages Types

Shared TypeScript type definitions for CrownPages web and mobile applications.

## Overview

This package contains the shared type definitions used across CrownPages applications, including:
- Section definitions
- Field types
- Style configurations
- Rendering hints
- And more

## Installation

This package is used as a Git submodule in the CrownPages web and mobile applications.

### Adding as a submodule

```bash
git submodule add <repository-url> packages/types
```

### Updating the submodule

```bash
git submodule update --remote
```

## Usage

```typescript
import { SectionDefinition, getSectionDefinition } from '@crown-pages/types';

// Get a specific section definition
const heroSection = getSectionDefinition('hero');

// Use the types in your code
const section: SectionDefinition = {
  // ... section configuration
};
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Build the package:
```bash
npm run build
```

## License

Private - All rights reserved 