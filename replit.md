# AI Image Generator

## Overview

This web application provides an AI-driven image generation platform, allowing users to create images from text prompts with various styles and AI engine options. It features a React frontend and an Express backend, managing presets and generation requests. Key functionalities include text-to-image generation, style selection, reference image integration (up to three), generation history, and a visual storyboard for iterative design. The project aims to be a user-friendly and powerful tool for creative AI image generation, with a focus on business vision, market potential, and ambitious project growth.

## User Preferences

-   **Communication**: Simple, everyday language in Chinese
-   **Code Standards**: All code, comments, UI text, and error messages must be in English only

## System Architecture

### Frontend Architecture

The frontend is a React 18+ and TypeScript single-page application built with Vite, utilizing shadcn/ui (Radix UI primitives) and Tailwind CSS for a "new-york" themed design. State management is handled by React Hook Form with Zod for validation, TanStack Query for server state, and Wouter for client-side routing. The UI features a responsive two-column layout.

### Backend Architecture

The backend is an Express.js application with Node.js and TypeScript, providing a RESTful API for styles, image generation, and history. All incoming requests are validated using Zod. It includes a robust Style Preset System to define visual styles, AI engines, and associated reference images, supporting style visibility controls.

### Per-Style Character Avatar System

The system supports style-specific character avatars with cropping functionality to ensure visual consistency across different art styles. Avatar profiles store crop data (position, width, height) to render avatars correctly regardless of source image dimensions. A multi-tier fallback mechanism ensures an avatar is always displayed.

### Template System Architecture

The application supports four template types for prompt generation: Structured, Simple, Universal (V2), and Cinematic, each with specific formats for organizing visual descriptors, color palettes, rules, and negative prompts. A palette fallback hierarchy prioritizes user overrides over template and style defaults.

### Data Storage Solutions

PostgreSQL (Neon) is the active database, storing generation history, prompt templates, storyboards, assets, and node workflows, all defined by Drizzle ORM schemas. localStorage is used for client-side persistence of user preferences and current storyboard ID. Reference images are stored via the KIE File Upload API. Storyboards support version control, allowing users to save and restore complete scene states.

### Asset System

A dedicated Asset Editor (`/assets`) allows management of reusable visual assets (backgrounds, props) with CRUD operations, reference image management, and a tag system. Assets are stored in a database table with unique IDs, types, names, visual prompts, and reference images.

### Node-Based Composition Workflow

An experimental node-based editor, built with React Flow, enables visual composition of elements. It features 7 node types (Character, Background, Prop, Style, Angle, Pose, Output) for building scenes. Individual nodes can generate images, with results saved to their respective database records. The OutputNode combines elements from connected nodes to generate a final composed scene, using generated element images as reference for consistency.

### Type Safety and Code Sharing

Shared Zod schemas and TypeScript types in the `shared/` directory ensure type safety and consistency between frontend and backend API contracts and database structures, using path aliases for clean imports.

### Error Handling and Recovery

The application implements comprehensive error handling for all data queries:
- Storyboard page: Queries for storyboards, scenes, and versions include error states with toast notifications and retry functionality
- Character Editor: Query error states with loading guards prevent broken UI when data is still loading
- Retry mechanisms clear stale localStorage IDs (e.g., currentStoryboardId) before refetching to ensure proper recovery from failures
- Error messages display actual API error details for better user guidance

### Reusable Components

- **GenerationSettings** (`client/src/components/GenerationSettings.tsx`): Encapsulated style and engine selector card with proper TypeScript typing (EngineType, StylePreset)

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

-   **Nano Banana Edit API** (`google/nano-banana-edit`): Used for AI image generation, supporting multi-image references and custom prompts.
-   **Seedream V4 Edit API** (`bytedance/seedream-v4-edit`): Used for AI image generation with optimized reference image handling.
-   **Nano Pro API** (`nano-banana-pro`): Utilized for high-quality 2K/4K image generation with specific parameter mapping for image references, aspect ratio, and resolution.
-   **File Upload API**: For uploading local reference images and obtaining temporary URLs.

API Key Management is handled via the `KIE_API_KEY` environment variable.