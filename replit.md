# AI Image Generator

## Overview

This is a web application that allows users to generate AI images from text prompts using different style presets and AI engines. The application features a React frontend with shadcn/ui components and an Express backend that manages style presets and image generation requests.

The core functionality allows users to:
- Enter a text prompt describing the desired image
- Select from predefined visual style presets (e.g., "Cool Cyan Vector Line Art", "Warm Orange Flat Illustration")
- Choose between different AI engines ("nanobanana" or "seedream")
- **Lock a style** to maintain consistent visual style across multiple generations
- **Select reference images** (up to 3) from generated images to guide future generations
- Generate images based on the combined prompt and style
- View generation history with all past creations

**NEW: Style Locking & Reference Image Features** (November 2025):
- **Style Lock**: Users can lock their selected visual style, preventing accidental changes. The locked style is saved in localStorage and persists across page reloads.
- **User Reference Images**: Users can select up to 3 generated images as references with customizable priority order:
  - Add any generated image as a reference from the main page or history page
  - **Drag-and-drop reordering**: Intuitive interface to change priority order by dragging cards (higher position = higher priority)
  - Remove individual reference images or clear all at once with "Clear All" button
  - Reference images are placed first in the API's image_urls array (highest priority)
  - Followed by style preset reference images
  - All reference data persists in localStorage across page reloads
  - Drag state managed with useRef to survive component re-renders
- **Image Priority System**: Priority order for API calls: 1) User reference images (in user-defined order), 2) Style preset reference images (all images, not just first one)
- **Smart Prompting**: The system automatically adds character consistency instructions to prompts when user references are active.

## Recent Code Quality Improvements (November 24, 2025)

**Critical Bug Fix - Reference Image Loading (November 24, 2025)**:
- **Fixed False Positive Image Detection**: Resolved critical bug where `loadLocalReferenceImages` was loading 50 fake image cards instead of 3 real images
  - **Root Cause**: Vite dev server returns `200 OK` with `Content-Type: text/html` for non-existent files instead of `404 Not Found`
  - **Solution**: Added strict validation in HEAD request check:
    1. Verify `Content-Type` header starts with `image/`
    2. Verify `Content-Length` header exists and is greater than 0
    3. Only accept path if both conditions are met along with `response.ok`
  - **Result**: Console now correctly shows "Loaded 3 local reference images" instead of 50
  - **Impact**: UI displays only actual image files, preventing user confusion with empty/broken cards

**Prompt Editor Performance & React Best Practices**:
- **Fixed React Hook Dependencies**: Added missing `selectedStyleId` dependency to initial style-loading useEffect (line 137), eliminating React warnings and preventing closure bugs
- **Optimized Preview Generation**: Wrapped `generatePreview` function in `useCallback` with proper `template` dependency, preventing unnecessary re-renders and improving performance
- **Parallel Reference Image Loading**: Refactored `loadLocalReferenceImages` from serial fetch to parallel `Promise.all` execution:
  - Before: ~50 sequential HEAD requests (slow)
  - After: Single parallel batch request (fast)
  - Maintains deterministic numerical sorting of reference images

**Technical Details**:
- All changes passed verification with zero security concerns
- No breaking changes to existing functionality
- Improved code follows React best practices and performance patterns

## User Preferences

- **Communication**: Simple, everyday language in Chinese
- **Code Standards**: All code, comments, UI text, and error messages must be in English only

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript, using Vite as the build tool and development server.

**UI Component Library**: shadcn/ui (Radix UI primitives) with Tailwind CSS for styling. The design system follows a "new-york" style with extensive use of CSS variables for theming.

**State Management**: 
- React Hook Form with Zod validation for form state
- TanStack Query (React Query) for server state management and API calls
- Local component state for UI interactions

**Routing**: Wouter for lightweight client-side routing

**Form Validation**: Zod schemas defined in shared directory, ensuring type safety between frontend and backend

**Design Approach**: Single-page application with a two-column layout (form on left, results on right) that stacks vertically on mobile. Follows modern AI tool design patterns inspired by Midjourney, DALL-E, and Stability AI.

### Backend Architecture

**Framework**: Express.js running on Node.js with TypeScript

**API Structure**: RESTful API with three main endpoints:
- `GET /api/styles` - Returns available style presets for the UI
- `POST /api/generate` - Accepts prompt, styleId, engine; generates image using Nano Banana API with proper image URL priority and saves to history
- `GET /api/history` - Returns generation history from database (limit parameter optional, defaults to 50)

**Request Validation**: Zod schemas validate incoming requests with detailed error messages

**Development Features**:
- Custom request logging middleware
- Vite integration in development mode with HMR
- Static file serving in production

**Style Preset System**: Centralized style definitions with properties for:
- Visual style descriptions (basePrompt)
- Compatible AI engines
- User-facing labels and descriptions
- Reference images uploaded to KIE at server startup (from `client/public/reference-images/`)

### Data Storage Solutions

**Active Database**: PostgreSQL database (Neon) for generation history:
- Schema definitions in `shared/schema.ts` with `generationHistory` table
- Migration managed via `drizzle-kit push`
- Stores: prompt, styleId, styleLabel, engine, finalPrompt, referenceImageUrl, generatedImageUrl, createdAt
- Storage interface in `server/storage.ts` with graceful fallback when DATABASE_URL is not set

**Client-Side Persistence**: localStorage for user preferences and session state:
- Style lock status and locked style ID
- User reference images array (up to 3 images with priority order)
- Last generated image URL (persists across page navigation)
- Managed via `client/src/lib/generationState.ts` utility functions

**Reference Image Storage**: KIE File Upload API (https://kieai.redpandaai.co):
- Automatically uploads all images from `client/public/reference-images/` at server startup
- Images organized by style directories (e.g., cool_cyan_lineart/)
- Uploaded files stored on KIE temporary storage (3-day retention)
- File upload service in `server/services/fileUpload.ts`

### Authentication and Authorization

**Current State**: Basic user storage interface defined but not actively used. Authentication system is scaffolded but not implemented in the current image generation flow.

**Prepared Infrastructure**:
- User schema with id, username fields
- Storage interface methods for user CRUD operations
- Session management dependencies installed (connect-pg-simple)

### Type Safety and Code Sharing

**Shared Schema Approach**: Type definitions and Zod validation schemas are centralized in the `shared/` directory and used by both frontend and backend, ensuring consistency:
- `StylePreset` type
- `GenerateRequest` type
- `GenerateResponse` type (includes optional historyId)
- `generationHistory` database table schema
- `InsertGenerationHistory` and `SelectGenerationHistory` types

**Path Aliases**: Configured in both TypeScript and Vite for clean imports:
- `@/*` for client components
- `@shared/*` for shared schemas
- `@assets/*` for attached assets

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives (@radix-ui/* packages)
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **shadcn/ui**: Pre-built component system based on Radix UI
- **Lucide React**: Icon library for consistent iconography

### State and Data Management
- **TanStack Query v5**: Server state synchronization and caching
- **React Hook Form**: Form state management with performance optimization
- **Zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

### Database and ORM
- **Drizzle ORM**: Type-safe SQL query builder
- **@neondatabase/serverless**: PostgreSQL driver for Neon Database (serverless)
- **drizzle-kit**: CLI tool for database migrations

### Build Tools and Development
- **Vite**: Fast build tool and development server
- **esbuild**: JavaScript bundler for production builds
- **TypeScript**: Type safety across the entire stack
- **Replit Plugins**: Development banner, error overlay, and cartographer for Replit environment

### Utility Libraries
- **date-fns**: Date manipulation
- **clsx + tailwind-merge**: Conditional CSS class composition
- **class-variance-authority**: Type-safe component variants
- **nanoid**: Unique ID generation

### External API Integration

**KIE AI Services** (https://api.kie.ai):
- **Nano Banana Edit API**: Fully integrated for AI image generation with multi-image support
  - Model: `google/nano-banana-edit`
  - Creates tasks via `POST /api/v1/jobs/createTask`
  - Polls for results via `GET /api/v1/jobs/recordInfo?taskId={id}`
  - Supports multiple reference images with priority ordering (first image = highest priority)
  - **User References**: User-selected reference images are placed first in image_urls array (in user-defined priority order)
  - **Style Reference**: ALL style preset reference images are sent (not just the first one), appended after user references to ensure comprehensive style understanding
  - Custom prompts include consistency instructions when user references are active
  - Output format configuration (PNG, 16:9 aspect ratio)
  - Maximum 10 polling attempts with 3-second delays
- **Seedream V4 Edit API**: Fully integrated for AI image generation with performance optimizations (November 2025)
  - Model: `bytedance/seedream-v4-edit`
  - Creates tasks via `POST /api/v1/jobs/createTask`
  - Polls for results via `GET /api/v1/jobs/recordInfo?taskId={id}`
  - **Reference Image Optimization**: Caps total reference images at 4 for optimal performance
    - User reference images: up to 3 (prioritized first)
    - Style preset images: dynamically calculated (4 - user reference count)
    - Example: 2 user refs → 2 style preset refs (total: 4)
    - Uses Math.max(0, limit) guard for backend resilience
  - Image configuration: landscape_16_9 aspect ratio, 2K resolution, max_images: 1
  - **Extended Polling**: Maximum 30 polling attempts with 3-second delays (90 seconds total)
    - Increased from 60s to accommodate 70-90s typical processing times
  - No output_format parameter (different from Nano Banana API)
- **File Upload API**: Uploads local reference images to KIE storage
  - Endpoint: `POST https://kieai.redpandaai.co/api/file-stream-upload`
  - Returns temporary URLs with 3-day retention
  - Supports FormData multipart uploads

**API Key Management**: 
- `KIE_API_KEY` environment variable required for all KIE services
- Set via Replit Secrets for secure storage