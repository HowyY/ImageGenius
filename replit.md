# AI Image Generator

## Overview

This is a web application that allows users to generate AI images from text prompts using different style presets and AI engines. The application features a React frontend with shadcn/ui components and an Express backend that manages style presets and image generation requests.

The core functionality allows users to:
- Enter a text prompt describing the desired image
- Select from predefined visual style presets (e.g., "Cool Cyan Vector Line Art", "Warm Orange Flat Illustration")
- Choose between different AI engines ("nanobanana" or "seeddream")
- Generate images based on the combined prompt and style

Currently, the backend returns placeholder images while the actual AI image generation API integration is pending.

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

**API Structure**: RESTful API with two main endpoints:
- `GET /api/styles` - Returns available style presets for the UI
- `POST /api/generate` - Accepts prompt, styleId, and engine; combines user prompt with style-specific base prompt

**Request Validation**: Zod schemas validate incoming requests with detailed error messages

**Development Features**:
- Custom request logging middleware
- Vite integration in development mode with HMR
- Static file serving in production

**Style Preset System**: Centralized style definitions with properties for:
- Visual style descriptions (basePrompt)
- Compatible AI engines
- User-facing labels and descriptions

### Data Storage Solutions

**Current Implementation**: In-memory storage using a `MemStorage` class for user data (prepared for future authentication)

**Database Ready**: Drizzle ORM configured with PostgreSQL support:
- Schema definitions in `shared/schema.ts`
- Migration configuration in `drizzle.config.ts`
- Neon Database serverless driver included
- Database currently not active but infrastructure is prepared

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
- `GenerateResponse` type

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

### Pending External API Integration
The application is structured to integrate with AI image generation services (referenced as "nanobanana" and "seeddream" engines) but currently returns placeholder images. The architecture supports adding actual API calls without significant refactoring.