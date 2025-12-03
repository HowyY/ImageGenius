# AI Image Generator

## Overview

This web application enables users to generate AI-driven images from text prompts, offering various style presets and AI engine choices. It features a React frontend with shadcn/ui and an Express backend managing presets and generation requests. Key capabilities include text-to-image generation, style selection and locking, integration of up to three reference images for consistency, a generation history, and a visual storyboard for iterating on images. The project aims to be a user-friendly and powerful tool for creative AI image generation.

## User Preferences

-   **Communication**: Simple, everyday language in Chinese
-   **Code Standards**: All code, comments, UI text, and error messages must be in English only

## System Architecture

### Frontend Architecture

The frontend is a React 18+ and TypeScript single-page application, built with Vite. It uses shadcn/ui (Radix UI primitives) and Tailwind CSS for a "new-york" themed design. State management is handled by React Hook Form with Zod for validation, and TanStack Query for server state. Wouter manages client-side routing. The UI features a two-column layout, adapting to a single column on mobile.

### Mobile-Responsive Navigation

-   **Desktop (md+ screens)**: Horizontal navigation bar with icon+text links
-   **Mobile (< md screens)**: Hamburger menu using shadcn Sheet component (slide-in drawer)
-   **Component**: `Navigation` in `client/src/components/navigation.tsx`
-   **Breakpoint**: `md` (768px) for switching between desktop and mobile layouts

### Backend Architecture

The backend is an Express.js application on Node.js with TypeScript, providing a RESTful API for styles, image generation, and history. All incoming requests are validated using Zod schemas. It supports custom request logging and serves static files. A robust Style Preset System centrally defines visual styles, AI engines, and associated reference images.

### Style Visibility System

Styles can be hidden from regular users while remaining accessible to admins in the Style Editor:
-   **Database**: `styles.isHidden` boolean field (defaults to false)
-   **API**: `GET /api/styles?includeHidden=1` returns all styles including hidden ones
-   **API**: `PATCH /api/styles/:id` updates style properties including visibility
-   **Style Editor**: Fetches with `includeHidden=1` to show all styles with visibility toggle buttons
-   **User-facing views**: Filter out hidden styles automatically

### Per-Style Character Avatar System

Characters support style-specific avatars with crop functionality to ensure consistent, style-matched avatar display:
-   **Database**: `characters.avatarProfiles` JSONB field with structure:
    ```
    { [styleId]: { cardId: string, crop: { x: number, y: number, width: number, height: number } } }
    ```
    - `x, y`: Crop position as percentage of image dimensions (0-100)
    - `width, height`: Crop area size as percentage of image dimensions (properly handles non-square source images)
    - Legacy format with `zoom` field is supported for backward compatibility
-   **Avatar Crop Dialog**: When clicking the crop icon on a character card, the AvatarCropDialog opens with:
    - Pan controls (drag to reposition)
    - Zoom slider (adjust magnification, 1x-3x)
    - Reset button to restore defaults
    - Round preview showing final avatar appearance
-   **Components**:
    - `AvatarCropDialog`: Modal dialog with react-easy-crop integration for setting crop parameters. Saves `croppedAreaPercentages` (x, y, width, height) directly for accurate rendering of non-square images.
    - `CroppedAvatar`: CSS background-based avatar display using stored crop coordinates. Normalizes legacy (zoom) and new (width/height) formats automatically.
-   **Display Priority**: Multi-tier fallback for avatar display:
    1. Per-style avatarProfile: If current style has an avatar profile set, use that card with crop
    2. Any style avatarProfile: Fallback to first available style avatar
    3. selectedCard: Use the reference card without cropping
    4. First card: Use first available character card
    5. First letter fallback: Display first letter of character name
-   **Use Case**: Different art styles produce vastly different character representations. Per-style avatars ensure the displayed avatar always matches the current visual style context.

### Template System Architecture

The application supports four template types for flexible prompt generation:

1. **Structured Templates** (Default): Complex multi-section templates with Camera & Composition, Environment, Main Character, Secondary Objects, Style Enforcement sections.

2. **Simple Templates**: Basic concatenation templates with a suffix string.

3. **Universal Templates** (V2): Simplified architecture with standardized format:
   - `styleKeywords`: Core visual descriptors
   - `defaultPalette`: Default color array
   - `rules`: Universal style constraints
   - `negativePrompt`: Elements to avoid
   - `referenceImages`: Style reference images

4. **Cinematic Templates**: Professional cinematography-focused templates with weighted parameters:
   - `sceneAction`: Main action or event (supports `{userPrompt}` placeholder)
   - `cameraFraming`: Camera angle, shot type, composition with weights (e.g., `medium shot:1.2`)
   - `visualAnchors`: Key visual elements that define the scene
   - `colorRender`: Color grading, lighting style, rendering quality
   - `technicalSpecs`: Resolution, quality settings, technical parameters
   - `negativePrompt`: Elements to avoid

The Universal prompt format follows: [SCENE][FRAMING][STYLE][COLORS][RULES][NEGATIVE]

The Cinematic prompt format follows: [SCENE ACTION][CAMERA & FRAMING][VISUAL ANCHORS][COLOR & RENDER][TECHNICAL SPECS][NEGATIVE]

Palette fallback hierarchy: User override → Template default → Style default colors

### Data Storage Solutions

-   **Active Database**: PostgreSQL (Neon) stores generation history (images, prompts, reference URLs), prompt templates, storyboards, storyboard versions, and storyboard scenes. All data is defined by Drizzle ORM schemas.
-   **Multiple Storyboards**: Users can create, switch between, rename, and delete different storyboard projects. Each storyboard is isolated with its own scenes. The currently selected storyboard ID is persisted in localStorage for cross-session continuity.
-   **Version Control**: Each storyboard supports named versions (snapshots) that can be saved and restored. Versions capture the complete scene state including descriptions, generated images, style settings, and engine choices.
-   **Storyboard Scenes**: Script-driven scene cards in a 3-column grid layout. Each scene has:
    - Image area (clickable to generate) with amber placeholder for empty scenes
    - Status line showing "Generated Images (1)" or "No images generated yet"
    - Scene Description textarea with 120px minimum height and auto-grow on typing
    - Generate and Edit buttons for inline image generation
    Scenes belong to a specific storyboard via `storyboardId` foreign key. Grid uses `items-start` alignment to allow cards with different heights based on content.
-   **Client-Side Persistence**: localStorage is used for user preferences like style lock status, selected reference images, and current storyboard ID. Template data and last generated image are fetched from PostgreSQL for cross-domain consistency.
-   **Reference Image Storage**: The KIE File Upload API stores reference images, uploading them on-demand with temporary URLs and promise-based caching to prevent duplicate uploads.
-   **Migration Logic**: On server startup, orphan scenes (without a storyboard) are automatically migrated to a "Default Storyboard" for backward compatibility.

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