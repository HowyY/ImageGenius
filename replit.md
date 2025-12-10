# AI Image Generator (ImageGenius)

## Overview

ImageGenius is an AI-driven web application for image generation, deeply integrated with Orama's storyboard workflow system. It demonstrates Orama's project hierarchy (projects → videos → versions → scenes → media) and incorporates role-based access control. The platform offers text-to-image generation, style selection, multi-reference image support, generation history, and a visual storyboard for iterative design. The UI adheres to Orama's design system, including dual theme support (light/dark mode). The project aims to streamline content creation for video production by leveraging AI for visual asset generation within a structured workflow.

## User Preferences

-   **Communication**: Simple, everyday language in Chinese
-   **Code Standards**: All code, comments, UI text, and error messages must be in English only

## System Architecture

### Frontend Architecture

The frontend is a React 18+ and TypeScript SPA, built with Vite, utilizing shadcn/ui (Radix UI primitives) and Tailwind CSS for a "new-york" themed design. State management uses React Hook Form with Zod for validation, TanStack Query for server state, and Wouter for client-side routing. The UI features a responsive two-column layout and Orama UI integration including dual themes, a Projects page with a 4-column card grid, a bottom StageNavigation bar, and role-based access control (Viewer/Designer). Designer-specific tools like Generate, History, and editors are accessible via a TopToolbar. A StoryboardSetup wizard guides designers through initial configuration, and a SceneInspector provides contextual editing for scene properties. A Multi-Region Selection System allows for targeted AI editing of image areas using rectangle and brush tools, integrated with the edit dialog.

### Backend Architecture

The backend is an Express.js application with Node.js and TypeScript, providing a RESTful API for styles, image generation, and history. All requests are validated using Zod. It includes a robust Style Preset System to define visual styles and AI engines, and a Per-Style Character Avatar System for consistent character representation.

### Template System Architecture

The application supports four prompt template types: Structured, Simple, Universal (V2), and Cinematic, with a palette fallback hierarchy for user overrides.

### Data Storage Solutions

PostgreSQL (Neon) serves as the primary database, storing generation history, prompt templates, storyboards, assets, and node workflows, all defined by Drizzle ORM schemas. localStorage handles client-side persistence for user preferences and current storyboard ID. Reference images are stored via the KIE File Upload API. Storyboards include version control for scene state management. The schema is undergoing migration to align with Orama's project hierarchy, introducing `projects`, `media`, `scene_media`, and `comments` tables, and bridge fields in existing tables to support `projectId` and media references.

### Asset System

A dedicated Asset Editor allows CRUD operations for reusable visual assets (backgrounds, props) with reference image management and a tag system.

### Node-Based Composition Workflow

An experimental node-based editor, built with React Flow, enables visual composition using Character, Background, Prop, Style, Angle, Pose, and Output nodes. Individual nodes can generate images, and the OutputNode combines elements to create composed scenes.

### Type Safety and Code Sharing

Shared Zod schemas and TypeScript types in the `shared/` directory ensure type safety and consistency across frontend and backend, using path aliases.

### Error Handling and Recovery

Comprehensive error handling with toast notifications, retry mechanisms, and loading guards is implemented for all data queries, clearing stale client-side IDs for proper recovery.

### Reusable Components

A `SettingsBar` component provides a collapsible interface for style and engine configuration, including style selection, engine selection, multiple reference images, and navigation to editors.

## External Dependencies

### Third-Party UI Libraries

-   **Radix UI**: Accessible UI primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **shadcn/ui**: Pre-built components.
-   **Lucide React**: Icon library.

### State and Data Management

-   **TanStack Query v5**: Server state management.
-   **React Hook Form**: Form state management.
-   **Zod**: Runtime type validation.
-   **drizzle-zod**: Drizzle ORM and Zod integration.

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
-   **Nano Banana Edit API** (`google/nano-banana-edit`): AI image generation with multi-image references.
-   **Seedream V4 Edit API** (`bytedance/seedream-v4-edit`): AI image generation with optimized reference image handling.
-   **Nano Pro API** (`nano-banana-pro`): High-quality 2K/4K image generation.
-   **File Upload API**: For uploading local reference images and obtaining temporary URLs.

API Key Management is handled via the `KIE_API_KEY` environment variable.