# AI Image Generator

## Overview

This web application empowers users to generate AI-driven images from text prompts, leveraging various style presets and AI engines. It features a React frontend built with shadcn/ui and an Express backend managing style presets and image generation requests. Key capabilities include:

-   **Text-to-Image Generation**: Users input text prompts to describe desired images.
-   **Style Selection**: Choose from predefined visual style presets (e.g., "Cool Cyan Vector Line Art", "Warm Orange Flat Illustration").
-   **AI Engine Choice**: Select between "nanobanana" and "seedream" AI engines.
-   **Style Locking**: Users can lock a selected visual style to maintain consistency across generations.
-   **Reference Image Integration**: Users can select up to 3 previously generated images as references, reorder them by priority, and use them to guide future generations, ensuring character consistency.
-   **Generation History**: View and manage a history of all generated images.

The project's ambition is to provide a user-friendly and powerful tool for creative image generation, inspired by leading AI art platforms.

## User Preferences

-   **Communication**: Simple, everyday language in Chinese
-   **Code Standards**: All code, comments, UI text, and error messages must be in English only

## Recent Changes

### November 24, 2025 - Cross-Domain State Consistency Fix
-   **Issue**: Dev webview and browser showed different data due to localStorage domain isolation
    -   Style Preset not auto-selecting in dev webview
    -   Last generated image showing different images between dev webview and external browser
-   **Root Cause**: localStorage is domain-specific (replit.dev vs external URL)
-   **Solution**: 
    -   Replaced localStorage-based `lastGeneratedImageUrl` with database query
    -   Added useQuery for `/api/history` to get latest generated image
    -   Added auto-selection logic for first style when not locked and no style is currently selected
-   **Result**: Both dev webview and browser now show consistent data
    -   Same generated image displayed regardless of access URL
    -   Style Preset auto-selects first option on load

### November 24, 2025 - Template Storage Migration to PostgreSQL Database
-   **Issue**: Template data stored in browser localStorage caused cross-domain sync issues
    -   Templates saved on replit.dev domain couldn't be accessed from external URLs
    -   Different browser sessions had isolated template storage
    -   No centralized template management for admin users
-   **Root Cause**: localStorage is domain-specific and browser-specific, preventing cross-domain template sharing
-   **Solution**: Migrated template storage from localStorage to PostgreSQL database
    -   Created `prompt_templates` table with jsonb storage for template configurations
    -   Added `getTemplate(styleId)` and `saveTemplate(styleId, data)` methods to storage interface
    -   Implemented API endpoints: GET/POST `/api/templates/:styleId`
    -   Updated Prompt Editor frontend to use React Query (useQuery/useMutation) instead of localStorage
    -   Created seed script (`server/seed-templates.ts`) to populate default templates
    -   Added template merging logic to ensure all required fields exist when loading from database
    -   Added loading state to prevent rendering before template data is loaded
-   **Result**: Templates now persist across domains and browser sessions
    -   All users see the same templates regardless of access URL
    -   Template changes sync immediately across all sessions
    -   Admin can manage templates centrally via database
    -   Backward compatible: defaults to DEFAULT_TEMPLATE if no saved template exists

### November 24, 2025 - On-Demand Reference Image Upload
-   **Issue**: All images in `client/public/reference-images/` were uploaded to KIE at server startup, including deleted images
    -   User deleted images in Prompt Editor but files remained in file system
    -   Deleted images were still uploaded to KIE on every server restart
    -   Wasted KIE API quota and storage
-   **Root Cause**: `initializeReferenceImages` automatically uploaded all files in reference-images folders at startup
-   **Solution**: Implemented on-demand upload system with Promise-based caching
    -   Created `uploadImageOnDemand(path, styleId)` with in-memory Promise cache
    -   Created `getStyleReferenceImagePaths(styleId)` to scan file system on each generation
    -   Updated `/api/generate` to upload template and style preset images only when needed
    -   Promise cache prevents duplicate uploads during concurrent requests
    -   Failed uploads clear cache to allow retry
    -   Path normalization removes leading slash before joining
-   **Result**: Images only uploaded when actually used in generation
    -   Server startup: No uploads, faster boot time
    -   Deleted images: Never uploaded to KIE
    -   Cached images: Reused across requests
    -   Concurrent requests: Share same upload Promise, no duplicates

### November 24, 2025 - Duplicate Reference Images Fix
-   **Issue**: Same reference images were sent twice to KIE API (8 for nanobanana, 4 for seedream)
    -   Template reference images: 1.png, 2.png, 3.png
    -   Style preset duplicates: 1.png, 2.png, 3.png (again)
    -   Result: Total 6 duplicates instead of 5 unique images
-   **Root Cause**: String-based URL comparison failed when imageUrls contained mixed formats (relative paths vs absolute URLs)
-   **Solution**: Implemented filename-based deduplication in `/api/generate` handler
    -   Extract filenames from all existing imageUrls into a Set
    -   Filter style preset URLs by checking if filename already exists
    -   Works regardless of path format (relative or absolute)
    -   Added logging to show which duplicates were skipped
-   **Result**: No duplicate images sent to KIE API
    -   nanobanana: 5 unique images (3 template + 2 style preset)
    -   seedream: 4 unique images (capped by MAX_SEEDREAM_REFS)

### November 24, 2025 - Color Palette Validation Fix
-   **Issue**: Templates with empty `customColors` arrays causing validation errors
-   **Root Cause**: localStorage templates contained `referenceImages` field not in `promptTemplateSchema`
-   **Solution**: Created `normalizeTemplateColors` utility in `client/src/lib/templateUtils.ts`
    -   Removes non-schema fields (like `referenceImages`) from templates
    -   Cleans up empty `customColors` arrays by resetting to "default" mode
    -   Applied at persistence boundaries: template load, save, and generation
-   **Result**: All color modes (default and custom) now work without validation errors

## System Architecture

### Frontend Architecture

The frontend is a single-page application built with **React 18+** and **TypeScript**, using **Vite** for development and building. It utilizes **shadcn/ui** (based on Radix UI primitives) and **Tailwind CSS** for a "new-york" themed design system. State management is handled by **React Hook Form** with **Zod** for form validation, and **TanStack Query** for server state. **Wouter** manages client-side routing. The UI design follows a two-column layout, adapting to a single column on mobile, inspired by modern AI generative tools.

### Backend Architecture

The backend is an **Express.js** application running on **Node.js** with **TypeScript**. It provides a RESTful API with endpoints for retrieving style presets (`GET /api/styles`), generating images (`POST /api/generate`), and fetching generation history (`GET /api/history`). All incoming requests are validated using **Zod schemas**. It supports custom request logging and serves static files in production. A robust **Style Preset System** centrally defines visual styles, compatible AI engines, and associated reference images.

### Data Storage Solutions

-   **Active Database**: **PostgreSQL** (Neon) stores:
    -   Generation history (images, prompts, reference URLs)
    -   Prompt templates (template configurations and reference image paths)
    -   All data defined by Drizzle ORM schemas in `shared/schema.ts`
-   **Client-Side Persistence**: **localStorage** is used for user preferences like:
    -   Style lock status
    -   User-selected reference images for generation
    -   Note: Template data and last generated image are now fetched from PostgreSQL instead of localStorage for cross-domain consistency
-   **Reference Image Storage**: The **KIE File Upload API** is used to store reference images:
    -   Images uploaded on-demand only when used in generation
    -   Provides temporary URLs for API requests
    -   Promise-based caching prevents duplicate uploads

### Authentication and Authorization

While basic user storage and session management interfaces are scaffolded, a full authentication system is currently not actively implemented in the image generation flow.

### Type Safety and Code Sharing

**Shared Zod schemas and TypeScript types** are centralized in the `shared/` directory, ensuring type safety and consistency between the frontend and backend for API contracts and database structures. Path aliases (`@/*`, `@shared/*`, `@assets/*`) are configured for clean imports.

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

### Build Tools and Development

-   **Vite**: Fast build tool and dev server.
-   **TypeScript**: Static type checking.
-   **Replit Plugins**: Development enhancements for the Replit environment.

### Utility Libraries

-   **date-fns**: Date manipulation.
-   **clsx + tailwind-merge**: CSS class utility.
-   **class-variance-authority**: Type-safe component variants.
-   **nanoid**: Unique ID generation.

### External API Integration

**KIE AI Services** (https://api.kie.ai):

-   **Nano Banana Edit API**: Integrated for AI image generation, supporting multi-image references, custom prompts, and specific output configurations (PNG, 16:9). User-selected reference images are prioritized, followed by style preset references.
-   **Seedream V4 Edit API**: Integrated for AI image generation with optimized reference image handling (caps total references at 4, prioritizing user images) and extended polling for results.
-   **File Upload API**: Used for uploading local reference images and obtaining temporary URLs.

**API Key Management**: `KIE_API_KEY` environment variable (stored securely in Replit Secrets) is required for all KIE services.