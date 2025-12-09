# AI Image Generator (ImageGenius)

## Overview

This web application provides an AI-driven image generation platform integrated with Orama's storyboard workflow system. It demonstrates Orama's project hierarchy (projects → videos → versions → scenes → media) with role-based access control. Key functionalities include text-to-image generation, style selection, reference image integration (up to three), generation history, and a visual storyboard for iterative design. The UI follows Orama's design system with dual theme support (light/dark mode).

### Orama UI Integration (December 2024)

**New Features:**
- **Dual Theme System**: Light/dark mode toggle with Orama color scheme (deep blue-black background, blue accents)
- **Projects Page**: 4-column card grid layout showing all storyboards with status filtering
- **Stage Navigation**: Bottom navigation bar showing workflow progress (Manage → Outline → Script → Storyboard → Audio → Video)
- **Role-Based Access**: Viewer (read-only) and Designer (full access) roles with route protection

**Role Permissions:**
- **Viewer**: Can access Projects and Storyboard pages in read-only mode (no editing, generating, or deleting)
- **Designer**: Full access to all pages including Generate, History, Style Editor, Character Editor, Asset Editor, and Node Editor

**Navigation Architecture:**
- **TopToolbar** (top, fixed): Logo, Tools menu (Designer only), Role switcher, Theme toggle
- **StageNavigation** (bottom, fixed): Workflow stage page selector (Manage → Outline → Script → Storyboard → Audio → Video)

**Page Structure:**
- All pages have `pt-14` (top toolbar) and `pb-20` (bottom nav) padding
- Root "/" redirects to Projects page
- Designer tools (Generate, History, Style/Character/Asset/Node editors) accessible via top Tools menu

**StoryboardSetup Wizard (December 2024):**
- **Trigger**: Shows automatically when designer enters a storyboard with setupCompleted=false
- **3-Step Flow**: Style → Characters → Start Creating
- **Step 1 (Style)**: Shows client's preset style with preview, "Adjust Style" navigates to style editor, "Confirm" marks step done
- **Step 2 (Characters)**: Shows available characters count, "Create Characters" navigates to character editor, or "Skip" option
- **Step 3 (Start)**: "Start Creating Storyboard" button sets setupCompleted=true and shows normal interface
- **Re-access**: "Project Settings" in storyboard menu reopens the wizard

**SceneInspector (December 2024):**
- **Contextual workflow**: Click scene card to select, right panel shows that scene's properties
- **Per-scene properties**: Description (editable), Style (persisted per scene), Characters (toggle selection)
- **Role-aware**: Designers can edit, Viewers see read-only view
- **Position**: Fixed right sidebar between TopToolbar (top-14) and StageNavigation (bottom-20)
- **State management**: selectedSceneId tracks which scene is being edited, clears on storyboard change or scene deletion

**Key Files:**
- `client/src/contexts/RoleContext.tsx` - Role state management with localStorage persistence
- `client/src/components/ProtectedRoute.tsx` - Route guard for designer-only pages
- `client/src/components/TopToolbar.tsx` - Top navigation with tools menu and role/theme controls
- `client/src/components/StageNavigation.tsx` - Bottom workflow page navigator
- `client/src/components/StoryboardSetup.tsx` - Designer onboarding wizard for new storyboards
- `client/src/components/SceneInspector.tsx` - Contextual scene property inspector (replaced ResourcePanel)
- `client/src/pages/projects.tsx` - Orama-style project list with grid layout

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

### Orama Schema Alignment (Migration in Progress)

The schema is being migrated to align with Orama's project hierarchy for future integration:

**New Tables Added (Phase 1):**
- `projects`: Top-level container for videos/storyboards with title, objective, and style
- `media`: Unified storage for all media (images, audio, video) with status tracking
- `scene_media`: Join table linking scenes to media with roles (image, voice, video, music)
- `comments`: Scene-level feedback with threading support

**Bridge Fields Added (Phase 2):**
- `storyboards`: Added `projectId`, `objective`, `currentStage`, `stageStatus` for workflow tracking
- `storyboard_scenes`: Added `selectedImageId`, `selectedVoiceId`, `selectedVideoId`, `selectedMusicId`, `taskId`, `imagePrompt` for media references

**Foreign Key Constraints:**
- `storyboards.project_id` → `projects.id` (ON DELETE SET NULL)
- `storyboard_scenes.selected_image_id` → `media.id` (ON DELETE SET NULL)
- `storyboard_scenes.selected_voice_id` → `media.id` (ON DELETE SET NULL)
- `storyboard_scenes.selected_video_id` → `media.id` (ON DELETE SET NULL)
- `storyboard_scenes.selected_music_id` → `media.id` (ON DELETE SET NULL)
- `scene_media.scene_id` → `storyboard_scenes.id` (ON DELETE CASCADE)
- `scene_media.media_id` → `media.id` (ON DELETE CASCADE)
- `comments.scene_id` → `storyboard_scenes.id` (ON DELETE CASCADE)

**Design Decision:** Media table and related Orama tables (projects, media) are defined early in schema.ts to enable proper FK references. The media bridge fields on storyboard_scenes use SET NULL on delete to allow gradual migration while maintaining referential integrity.

**Schema Mapping (ImageGenius → Orama):**
- `storyboards` → `videos` (with project_id FK)
- `storyboard_versions` → `versions`  
- `storyboard_scenes` → `scenes` (with version_id FK)
- `generation_history` → `media` (via generationHistoryId reference)

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

- **SettingsBar** (`client/src/components/SettingsBar.tsx`): Collapsible settings bar for style and engine configuration. Shows compact preview (style thumbnail, name, engine) when collapsed; expands to show full style selector, engine selector, multiple reference images with click-to-enlarge lightbox, "Edit Style" button (navigates to /styles), and optional "Project Settings" button (reopens setup wizard). Supports `disabled` prop for viewer role-based access control. Exports `EngineType` type for use across the application.

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