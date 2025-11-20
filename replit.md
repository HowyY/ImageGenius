# AI Image Generator

## Overview

This is a web application that allows users to generate AI images from text prompts using different style presets and AI engines. The application features a React frontend with shadcn/ui components and an Express backend that manages style presets and image generation requests.

The core functionality allows users to:
- Enter a text prompt describing the desired image
- Select from predefined visual style presets (e.g., "Cool Cyan Vector Line Art", "Warm Orange Flat Illustration")
- Choose between different AI engines ("nanobanana" or "seedream")
- **Lock a style** to maintain consistent visual style across multiple generations
- **Set character reference** from generated images to maintain character consistency across different scenes
- Generate images based on the combined prompt and style
- View generation history with all past creations

**NEW: Style Locking & Character Consistency Features** (November 2025):
- **Style Lock**: Users can lock their selected visual style, preventing accidental changes. The locked style is saved in localStorage and persists across page reloads.
- **Character Reference**: Users can designate any generated image as a "character reference." Subsequent generations will prioritize maintaining that character's appearance (face, hairstyle, clothing) while applying the scene description.
- **Image Priority System**: When a character reference is set, it's placed first in the API's image_urls array (highest priority), followed by style reference images.
- **Smart Prompting**: The system automatically adds character consistency instructions to prompts when a character reference is active.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- `POST /api/generate` - Accepts prompt, styleId, engine, and optional characterReference; generates image using Nano Banana API with proper image URL priority and saves to history
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
- Stores: prompt, styleId, styleLabel, engine, finalPrompt, referenceImageUrl, generatedImageUrl, characterReferenceUrl (optional), createdAt
- Storage interface in `server/storage.ts` with graceful fallback when DATABASE_URL is not set

**Client-Side Persistence**: localStorage for user preferences and session state:
- Style lock status and locked style ID
- Character reference image URL
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
- `GenerateRequest` type (includes optional characterReference URL)
- `GenerateResponse` type (includes optional historyId)
- `generationHistory` database table schema (includes optional characterReferenceUrl)
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
  - **Character Consistency**: Character reference images are placed first in image_urls array to prioritize character appearance
  - **Style Reference**: ALL style preset reference images are sent (not just the first one), appended after character references to ensure comprehensive style understanding
  - Custom prompts include character consistency instructions when applicable
  - Output format configuration (PNG, 16:9 aspect ratio)
  - Maximum 10 polling attempts with 3-second delays
- **File Upload API**: Uploads local reference images to KIE storage
  - Endpoint: `POST https://kieai.redpandaai.co/api/file-stream-upload`
  - Returns temporary URLs with 3-day retention
  - Supports FormData multipart uploads

**Seedream Engine**: Prepared but not yet implemented (throws error when selected)

**API Key Management**: 
- `KIE_API_KEY` environment variable required for both services
- Set via Replit Secrets for secure storage