# AI Image Generator

## Overview

This web application enables users to generate AI-driven images from text prompts, offering various style presets and AI engine choices. It features a React frontend with shadcn/ui and an Express backend managing presets and generation requests. Key capabilities include text-to-image generation, style selection and locking, integration of up to three reference images for consistency, a generation history, and a visual storyboard for iterating on images. The project aims to be a user-friendly and powerful tool for creative AI image generation.

## User Preferences

-   **Communication**: Simple, everyday language in Chinese
-   **Code Standards**: All code, comments, UI text, and error messages must be in English only

## System Architecture

### Frontend Architecture

The frontend is a React 18+ and TypeScript single-page application, built with Vite. It uses shadcn/ui (Radix UI primitives) and Tailwind CSS for a "new-york" themed design. State management is handled by React Hook Form with Zod for validation, and TanStack Query for server state. Wouter manages client-side routing. The UI features a two-column layout, adapting to a single column on mobile.

### Backend Architecture

The backend is an Express.js application on Node.js with TypeScript, providing a RESTful API for styles, image generation, and history. All incoming requests are validated using Zod schemas. It supports custom request logging and serves static files. A robust Style Preset System centrally defines visual styles, AI engines, and associated reference images.

### Template System Architecture

The application supports three template types for flexible prompt generation:

1. **Structured Templates** (Default): Complex multi-section templates with Camera & Composition, Environment, Main Character, Secondary Objects, Style Enforcement sections.

2. **Simple Templates**: Basic concatenation templates with a suffix string.

3. **Universal Templates** (V2): Simplified architecture with standardized format:
   - `styleKeywords`: Core visual descriptors
   - `defaultPalette`: Default color array
   - `rules`: Universal style constraints
   - `negativePrompt`: Elements to avoid
   - `referenceImages`: Style reference images

The Universal prompt format follows: [SCENE][FRAMING][STYLE][COLORS][RULES][NEGATIVE]

Palette fallback hierarchy: User override → Template default → Style default colors

### Data Storage Solutions

-   **Active Database**: PostgreSQL (Neon) stores generation history (images, prompts, reference URLs) and prompt templates. All data is defined by Drizzle ORM schemas.
-   **Client-Side Persistence**: localStorage is used for user preferences like style lock status and selected reference images. Template data and last generated image are fetched from PostgreSQL for cross-domain consistency.
-   **Reference Image Storage**: The KIE File Upload API stores reference images, uploading them on-demand with temporary URLs and promise-based caching to prevent duplicate uploads.

### Type Safety and Code Sharing

Shared Zod schemas and TypeScript types are centralized in the `shared/` directory, ensuring type safety and consistency between frontend and backend for API contracts and database structures. Path aliases are configured for clean imports.

## External Dependencies

### Third-Party UI Libraries

-   **Radix UI**: Accessible, unstyled UI primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **shadcn/ui**: Pre-built components leveraging Radix UI and Tailwind CSS.
-   **Lucide React**: Icon library.

### State and Data Management

-   **TanStack Query v5**: Server state management and caching.
-   **React Hook Form**: Form state management.
-   **Zod**: Runtime type validation.
-   **drizzle-zod**: Drizzle ORM and Zod schema integration.

### Database and ORM

-   **Drizzle ORM**: Type-safe SQL query builder.
-   **@neondatabase/serverless**: PostgreSQL driver for Neon.
-   **drizzle-kit**: Database migration tool.

### Utility Libraries

-   **date-fns**: Date manipulation.
-   **clsx + tailwind-merge**: CSS class utility.
-   **class-variance-authority**: Type-safe component variants.
-   **nanoid**: Unique ID generation.

### External API Integration

**KIE AI Services** (https://api.kie.ai):

-   **Nano Banana Edit API** (`google/nano-banana-edit`): Integrated for AI image generation, supporting multi-image references (via `image_urls`), custom prompts, and specific output configurations.
-   **Seedream V4 Edit API** (`bytedance/seedream-v4-edit`): Integrated for AI image generation with optimized reference image handling and extended polling.
-   **Nano Pro API** (`nano-banana-pro`): High-quality 2K/4K image generation with different parameter mapping (`image_input` instead of `image_urls`, `aspect_ratio` instead of `image_size`, supports `resolution` setting).
-   **File Upload API**: Used for uploading local reference images and obtaining temporary URLs.

**Engine Parameter Differences**:
| Parameter | NanoBanana/SeeDream | Nano Pro |
|-----------|---------------------|----------|
| Image refs | `image_urls` array | `image_input` array |
| Size | `image_size` (e.g., "1024x1024") | `aspect_ratio` (e.g., "1:1") |
| Resolution | N/A | `resolution` ("1K", "2K", "4K") |
| Max images | 3 | 8 |

API Key Management is handled via the `KIE_API_KEY` environment variable.