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

## System Architecture

### Frontend Architecture

The frontend is a single-page application built with **React 18+** and **TypeScript**, using **Vite** for development and building. It utilizes **shadcn/ui** (based on Radix UI primitives) and **Tailwind CSS** for a "new-york" themed design system. State management is handled by **React Hook Form** with **Zod** for form validation, and **TanStack Query** for server state. **Wouter** manages client-side routing. The UI design follows a two-column layout, adapting to a single column on mobile, inspired by modern AI generative tools.

### Backend Architecture

The backend is an **Express.js** application running on **Node.js** with **TypeScript**. It provides a RESTful API with endpoints for retrieving style presets (`GET /api/styles`), generating images (`POST /api/generate`), and fetching generation history (`GET /api/history`). All incoming requests are validated using **Zod schemas**. It supports custom request logging and serves static files in production. A robust **Style Preset System** centrally defines visual styles, compatible AI engines, and associated reference images.

### Data Storage Solutions

-   **Active Database**: **PostgreSQL** (Neon) stores generation history, defined by Drizzle ORM schemas.
-   **Client-Side Persistence**: **localStorage** is used for user preferences like style lock status, user-selected reference images, and the last generated image URL.
-   **Reference Image Storage**: The **KIE File Upload API** is used to store reference images, uploading them from `client/public/reference-images/` at server startup and providing temporary URLs.

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