# AI Image Generator - Development Log

## Project Overview

**Project Name:** AI Image Generator for ORAMA Storyboard  
**Tech Stack:** React + TypeScript + Express + PostgreSQL + KIE AI APIs  
**Start Date:** November 19, 2025  
**Current Status:** Active Development

### Purpose
Build an AI-powered image generation tool for ORAMA's storyboard feature, supporting multiple AI engines (NanoBanana Edit, SeeDream V4, Nano Pro), customizable prompt templates, style management, and visual storyboarding with version control.

---

## Development Timeline

### Phase 1: Foundation (Nov 19-20, 2025)

#### Nov 19 - Project Initialization
- Initial project setup
- Added reference images for "Cool Cyan" style

#### Nov 20 - Core Image Generation
- **Image Upload & Generation**: Integrated KIE API for AI image generation with reference image support
- **History Tracking**: Added generation history storage in PostgreSQL
- **History Page**: Created dedicated page for viewing past generations
- **Style Lock**: Implemented style locking to maintain character consistency across generations
- **Reference Image System**:
  - Select and reorder up to 3 reference images
  - Add generated images from history as references
  - Drag-and-drop reordering functionality
  - Batch clearing of references
- **Session Persistence**: Save and restore last generated image
- **UI Improvements**: 
  - Added tooltips to buttons
  - Translated interface to English
  - Renamed style to "Cyan Sketchline Vector"

---

### Phase 2: Multi-Engine Support (Nov 23, 2025)

#### Nov 23 - SeeDream Integration
- **SeeDream V4 Edit API**: Integrated ByteDance's SeeDream engine for advanced image generation
- **Improved Reliability**: Increased timeout and added detailed logging for better debugging

---

### Phase 3: Template System (Nov 24, 2025)

#### Nov 24 - Database-Driven Templates
- **Database Migration**: Moved template storage from localStorage to PostgreSQL for cross-domain synchronization
- **On-Demand Upload**: Implemented lazy loading and caching for reference images
- **History Details**: Added ability to view full generation request parameters (prompt, style, engine, references)
- **Color Palette**: Improved color prompt generation with more descriptive language
- **Session Restore**: Save and restore generation settings between sessions
- **UI Polish**: Added clear button for image description input

---

### Phase 4: Advanced Template Architecture (Nov 25, 2025)

#### Nov 25 - Universal Template System
- **Simple Template**: Added lightweight template option for faster generation
- **Universal Template (V2)**: New simplified architecture with:
  - `styleKeywords`: Core visual descriptors
  - `defaultPalette`: Default color arrays
  - `rules`: Universal style constraints
  - `negativePrompt`: Elements to avoid
- **Dual Color Mode**: Support for both single-color and multi-color palette modes
- **Template A/B Testing**: Switch between different templates to compare results
- **Nano Pro Engine**: Added high-quality 2K/4K image generation support
- **Style Management**: 
  - Create new styles from scratch
  - Clone existing styles
  - Delete custom styles
  - Full CRUD operations for style presets

---

### Phase 5: Storyboard Feature (Nov 26, 2025)

#### Nov 26 - Visual Storyboarding
- **Storyboard Page**: New dedicated page for story-based image generation
  - 3-column grid layout for scene cards
  - Scene description fields (combined voice-over and visual)
  - Style and engine selection per session
  - In-scene image generation and editing
- **Multiple Storyboards**: 
  - Create, switch, rename, and delete storyboard projects
  - Each storyboard isolated with its own scenes
  - Persisted selection in localStorage
- **Version Control**:
  - Save named versions (snapshots) of storyboard state
  - Restore any previous version
  - Captures complete scene state including images, descriptions, and settings
- **Scene History**:
  - View all generated images for each scene
  - Full-size image preview modal with metadata
  - Rollback to any previous image version
- **Bug Fixes**:
  - Fixed reference image uploads for custom (cloned) styles
  - Improved localStorage validation for storyboard IDs

---

## Architecture Highlights

### API Engines Comparison

| Feature | NanoBanana Edit | SeeDream V4 | Nano Pro |
|---------|-----------------|-------------|----------|
| Max References | 3 | 3 | 8 |
| Image Parameter | `image_urls` | `image_urls` | `image_input` |
| Size Parameter | `image_size` | `image_size` | `aspect_ratio` |
| Resolution | Standard | Standard | 1K/2K/4K |

### Template Types

1. **Structured Templates**: Complex multi-section prompts with Camera, Environment, Character, Style sections
2. **Simple Templates**: Basic concatenation with suffix
3. **Universal Templates (V2)**: Standardized format with keywords, palette, rules, and negative prompts

### Data Storage

- **PostgreSQL**: Generation history, prompt templates, storyboards, versions, scenes
- **localStorage**: User preferences (style lock, selected references, current storyboard ID)
- **KIE File API**: Reference image uploads with temporary URLs

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/storyboard.tsx` | Storyboard UI and scene management |
| `server/routes.ts` | API endpoints for all features |
| `server/storage.ts` | Database operations interface |
| `shared/schema.ts` | Drizzle ORM schemas and types |
| `client/src/lib/generationState.ts` | Client-side state persistence |
| `server/default-templates.ts` | Built-in template definitions |
| `server/services/fileUpload.ts` | KIE file upload integration |

---

## TODO List

### High Priority
- [ ] **Style Editor Redesign**: Redesign the Prompt Editor interface to become a comprehensive Style Editor
  - Rename and restructure the editor page
  - Better organization for style configuration
  - Improved UX for template editing

- [ ] **Character System**: Add character creation and editing interface
  - Design character definition schema
  - Build character creation UI
  - Figure out efficient character reference system for maintaining consistency across storyboard scenes
  - _Note: Still exploring the best approach for character persistence and invocation_

### Medium Priority
- [ ] **New Styles**: Continue debugging and adding new visual styles
  - Test and refine existing templates
  - Create additional style presets
  - Validate style consistency across different prompts

- [ ] **UI/UX Optimization**: Continue improving interface usability
  - Streamline common workflows
  - Enhance visual feedback
  - Mobile responsiveness improvements

### Future Ideas / Backlog
- [ ] Batch image generation for multiple scenes
- [ ] Export storyboard as PDF/image sequence
- [ ] AI-assisted prompt suggestions
- [ ] Collaborative editing features

---

## Notes

**Character System Design Considerations:**
- Need to determine how characters are stored (database vs. reference images)
- Consider character "tokens" or IDs that can be embedded in prompts
- Explore using consistent reference images per character across scenes
- Balance between flexibility and consistency

_Add any additional notes, learnings, or decisions here._

---

*Last Updated: November 26, 2025*
