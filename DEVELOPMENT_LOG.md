# AI Image Generator - Development Log

## Project Overview

**Project Name:** AI Image Generator for ORAMA Storyboard  
**Tech Stack:** React + TypeScript + Express + PostgreSQL + KIE AI APIs  
**Start Date:** November 19, 2025  
**Current Status:** Active Development

### Purpose
Build an AI-powered image generation tool for ORAMA's storyboard feature, supporting multiple AI engines (NanoBanana Edit, SeeDream V4, Nano Pro, T2I), customizable prompt templates (Structured, Simple, Universal, Cinematic), style management, character card generation with proportion control, and visual storyboarding with version control.

---

## Development Timeline

### Phase 1: Foundation (Nov 19-20, 2025)

#### Nov 19 - Project Initialization
- Initial project setup with React + TypeScript + Express + PostgreSQL
- Added reference images for "Cool Cyan" style

#### Nov 20 - Core Image Generation
- **Image Upload & Generation**: Integrated KIE NanoBanana Edit API for AI image generation with reference image support
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
- **Engine Selection**: Added UI toggle between NanoBanana and SeeDream engines

---

### Phase 3: Template System (Nov 24, 2025)

#### Nov 24 - Database-Driven Templates
- **Prompt Editor Page**: Created dedicated page for customizing prompt templates
- **Database Migration**: Moved template storage from localStorage to PostgreSQL for cross-domain synchronization
- **Per-Style Templates**: Each style can have its own custom template configuration
- **Reference Images Editor**: Upload and manage reference images per style in the editor
- **On-Demand Upload**: Implemented lazy loading and caching for reference images (uploaded only when used)
- **History Details**: Added ability to view full generation request parameters (prompt, style, engine, references)
- **Color Palette**: Added custom color palettes to style presets and prompt generation
- **Mobile Support**: 
  - Touch-based drag and drop reordering for mobile users
  - Responsive layout adjustments
- **Performance**:
  - Lazy loading for images with debouncing
  - Increased file upload size limit for larger images
  - Animation/GIF support for image handling
- **API Improvements**: Added detailed logging for validation failures

---

### Phase 4: Advanced Template Architecture (Nov 25, 2025)

#### Nov 25 - Universal Template System
- **Simple Template**: Added lightweight template option for faster generation (basic suffix concatenation)
- **Universal Template (V2)**: New simplified architecture with:
  - `styleKeywords`: Core visual descriptors
  - `defaultPalette`: Default color arrays
  - `loosePalette`: Descriptive color text for more natural prompts
  - `rules`: Universal style constraints
  - `negativePrompt`: Elements to avoid
  - `referenceImages`: Style reference images
- **Dual Color Mode**: Support for both "loose" (descriptive) and "strict" (HEX) palette modes
- **Template A/B Testing**: Switch between different templates to compare results
- **Template Reset**: Reset to default template functionality
- **Settings Persistence**: Save and restore generation settings (style, engine, prompt) between sessions
- **Nano Pro Engine**: Added high-quality 2K/4K image generation support with different parameter mapping
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
  - In-scene image generation
- **Scene Editing**: 
  - Edit dialog for regenerating scene images with modified prompts
  - Full-size image preview modal with metadata display
  - Rollback to any previous image version
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
  - Image preview with revert functionality
- **Style Thumbnails**: Display first reference image as style preview
- **Responsive Layout**: Mobile and tablet layout improvements
- **Bug Fixes**:
  - Fixed reference image uploads for custom (cloned) styles
  - Improved localStorage validation for storyboard IDs

---

### Phase 6: Character Editor Foundation (Nov 26, 2025)

#### Nov 26 - Character Database & UI
- **Character Database Schema**:
  - Created `characters` table in PostgreSQL
  - Fields: id, name, visualPrompt, characterCards (JSONB array), selectedCardId, avatarProfiles (JSONB), tags, createdAt, updatedAt
- **Character Editor UI**:
  - Full-featured character management interface
  - Character list with thumbnail previews
  - Create, edit, delete operations
- **Style Editor Rename**: Renamed Prompt Editor to Style Editor for clarity
- **Navigation**: Added Character Editor to main navigation
- **API Endpoints**:
  - `GET /api/characters` - Fetch all characters
  - `POST /api/characters` - Create new character
  - `PATCH /api/characters/:id` - Update character
  - `DELETE /api/characters/:id` - Delete character

---

### Phase 7: Character Card Generation System (Nov 27, 2025)

#### Nov 27 - AI-Powered Character Cards
- **Character Card Generation**: Generate character reference cards using AI with style-specific templates
- **Angle Selection**: Front, Three-Quarter, Side (Profile), Back views
- **Pose Selection**: Standing, Sitting, Walking, Action, Portrait (Upper Body)
- **Expression Selection**: Neutral, Happy, Sad, Angry, Surprised, Excited, Serious, Tired
- **Character Sheet Mode**: 
  - Generate multi-angle turnaround sheets (front, 3/4, side, back in one image)
  - Unified scale rules for consistent proportions across all views
  - Automatic neutral expression for all angles
- **Clean Background Option**: Toggle for solid white background vs contextual background
- **Card Management**:
  - Store generated cards in character's cards array
  - Select primary card for display
  - Delete unwanted cards
- **Edit Mode**: Regenerate existing cards with modified settings
- **Style Integration**:
  - Cards use the selected style's template and reference images
  - Visual prompt embedded in [SCENE] section of generated prompt
- **Template Reordering**: Drag-and-drop to reorder style templates
- **Style Visibility**: Toggle styles hidden/visible for organization
- **URL Parameters**: Deep linking support for character and style selection
- **Mobile Responsive**: Character editor adapted for mobile viewing

---

### Phase 8: Avatar System (Nov 27-28, 2025)

#### Nov 27 - Per-Style Avatar Profiles
- **Avatar Profile System**: Each character can have different avatars per style
- **Avatar Cropping**: 
  - AvatarCropDialog component with interactive pan and zoom
  - Crop coordinates stored as percentages for responsive display
  - Support for non-square source images
- **avatarProfiles Schema**: JSONB field storing `{ [styleId]: { cardId, crop: { x, y, width, height } } }`
- **Display Priority Fallback**:
  1. Per-style avatarProfile (if current style has avatar set)
  2. Any style avatarProfile (first available)
  3. selectedCard (without cropping)
  4. First card in cards array
  5. First letter fallback

#### Nov 28 - Avatar Polish & Mobile Navigation
- **CroppedAvatar Component**: CSS background-based avatar display using stored crop coordinates
- **Backward Compatibility**: Support for legacy zoom-based format alongside new width/height format
- **Mobile Navigation**: Hamburger menu using Sheet component (slide-in drawer)
- **Storyboard Improvements**: Auto-growing textareas for scene descriptions

---

### Phase 9: Style Editor Enhancements (Dec 1, 2025)

#### Dec 1 - Reference Image Management
- **Mobile Reference Images**: Improved display and interaction on mobile devices
- **Natural Aspect Ratio**: Reference images display at natural proportions
- **Style Editor Layout**: Better mobile responsiveness
- **Image Upload Validation**: Fixed reference image saving to templates
- **Pro Engine Default**: New styles created with Pro engine enabled

---

### Phase 10: Global Generation Tracking (Dec 2, 2025)

#### Dec 2 - Generation Context System
- **GenerationContext**: Global React context for generation tasks across all pages
- **GenerationStatusPanel**: Floating panel showing generation progress with real-time state updates
- **Task Tracking**: Track active generation with elapsed time, status, and error messages
- **Edit Mode Flag**: Distinct handling for edit vs new generation requests
- **Multi-Page Support**: Track generations started from any page (Home, Storyboard, Character Editor)

#### Dec 2 - Storyboard Character Integration
- **Character Selection UI**: Select characters for each storyboard scene
- **Visual Prompt Integration**: Character descriptions included in scene generation
- **Copy Assignments**: Copy character assignments across multiple scenes
- **Multi-Character References**: Use character cards as reference images in scene generation
- **Per-Scene Engine Selection**: Override default engine per scene

#### Dec 2 - Additional Features
- **Image Preview Zoom**: Improved zooming functionality in preview dialogs
- **Style Rename**: Ability to rename existing styles in the editor

---

### Phase 11: Cinematic Templates & T2I Engine (Dec 3, 2025)

#### Dec 3 - Cinematic Template Type
- **Cinematic Templates**: Professional cinematography-focused template structure
  - `cameraFraming`: Camera angle, shot type, composition with weights (e.g., `medium shot:1.2`)
  - `visualAnchors`: Key visual elements that define the scene
  - `colorRender`: Color grading, lighting style, rendering quality
  - `technicalSpecs`: Resolution, quality settings, technical parameters
  - `negativePrompt`: Elements to avoid
- **Prompt Format**: [SCENE ACTION][CAMERA & FRAMING][VISUAL ANCHORS][COLOR & RENDER][TECHNICAL SPECS][NEGATIVE]
- **Template Editor**: UI for editing cinematic template fields

#### Dec 3 - Text-to-Image (T2I) Engine
- **T2I Mode**: Pure text-to-image generation without reference images
- **Nano Banana T2I**: New engine option for reference-free generation
- **Engine Selection**: Added T2I option to engine selector (shows "No Ref" indicator)
- **Style Support**: T2I engine enabled on appropriate styles

#### Dec 3 - Character Proportion Control
- **Canvas Height Constraint**: Characters occupy 85-90% of canvas height
- **Baseline Alignment**: Feet aligned to consistent baseline at bottom of frame
- **Head Margin**: Head kept within consistent top margin
- **Proportion Rules**: Added to [FRAMING] section of character card prompts
- **Negative Prompts**: Added proportion-related negatives (oversized head, chibi, extreme perspective)
- **Multiple Character Guard**: "multiple characters, group shot" in negative prompt

#### Dec 3 - Generation Progress Improvements
- **Real Elapsed Time**: Progress tracking with 1-second interval updates
- **Single-Stage Processing**: Honest progress display without fake stages
- **Accurate Duration**: Shows actual time elapsed since generation started

#### Dec 3 - Style Reordering
- **Drag-and-Drop Styles**: Reorder styles in Style Editor with dnd-kit
- **Optimistic Updates**: Immediate UI feedback with rollback on failure
- **Persist Order**: Style order saved to database via `orderIndex` field

#### Dec 3 - Reference Image Cleanup
- **File Deletion**: Server-side endpoint to physically delete reference image files
- **Secure Removal**: Prevent path traversal attacks in file deletion
- **No Extra References**: Stop including filesystem reference images not in template

---

### Phase 12: Debug & Polish (Dec 3-4, 2025)

#### Dec 3 - KIE API Request Details
- **Debug Dialog**: View complete API request details after character card generation
- **Generation Info Display**: Engine, Style, Mode, Angle, Pose, Expression, Clean Background
- **Reference Images**: Show thumbnails and URLs of images sent to KIE API
- **Full Prompt**: Display complete prompt structure ([SCENE], [FRAMING], [STYLE], etc.)
- **Generated Result**: Show final image with URL
- **State Management**: Debug info cleared on character/style change and on failure

#### Dec 4 - Character Sheet Angle Update
- **Right-Side Specific**: Updated character sheet to specify right-side direction
  - Front view (facing forward)
  - Three-quarter right view (turned slightly to the right)
  - Right side view (full profile facing right)
  - Back view (facing away, symmetric)

#### Dec 4 - UI Polish & Accessibility
- **Dialog Accessibility**: Added proper DialogDescription to all Dialog instances
- **Image Loading States**: Enhanced ImageWithFallback with better transitions
- **Letter Fallback Avatars**: Show first letter when images fail to load
- **History Loading**: Show generations immediately while fetching more

---

## Architecture Highlights

### API Engines Comparison

| Feature | NanoBanana Edit | SeeDream V4 | Nano Pro | T2I |
|---------|-----------------|-------------|----------|-----|
| Max References | 3 | 3 | 8 | 0 |
| Image Parameter | `image_urls` | `image_urls` | `image_input` | N/A |
| Size Parameter | `image_size` | `image_size` | `aspect_ratio` | `image_size` |
| Resolution | Standard | Standard | 1K/2K/4K | Standard |
| Use Case | Style transfer | Style transfer | High quality | Pure text |

### Template Types

1. **Structured Templates**: Complex multi-section prompts with Camera, Environment, Character, Style sections
2. **Simple Templates**: Basic prompt with suffix concatenation
3. **Universal Templates (V2)**: Standardized format with keywords, palette (loose/strict), rules, and negative prompts
4. **Cinematic Templates**: Professional cinematography with weighted parameters (cameraFraming, visualAnchors, colorRender, technicalSpecs)

### Character Card Prompt Structure
```
[SCENE]
{visualPrompt} - character description

[FRAMING]
{angleText}, {poseText}, {expressionText}
Full-body character centered in frame.
Character height: 85-90% canvas height.
Feet aligned to baseline. Head within top margin.
{backgroundInstruction}

[STYLE]
In {styleName} style:
{styleKeywords}

[COLORS]
{palette - loose or strict mode}

[RULES]
{style rules}
- Single character only
- Consistent head-to-body ratio
- No perspective distortion

[NEGATIVE]
{negativePrompt}, oversized head, chibi proportions, multiple characters...
```

### Data Storage

- **PostgreSQL**: Generation history, prompt templates, storyboards, versions, scenes, characters
- **localStorage**: User preferences (style lock, selected references, current storyboard ID)
- **KIE File API**: Reference image uploads with temporary URLs (on-demand upload when used in generation)

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/pages/home.tsx` | Main generation interface |
| `client/src/pages/storyboard.tsx` | Storyboard UI and scene management |
| `client/src/pages/character-editor.tsx` | Character and card management |
| `client/src/pages/style-editor.tsx` | Style template configuration |
| `client/src/pages/history.tsx` | Generation history viewer |
| `client/src/contexts/GenerationContext.tsx` | Global generation state management |
| `client/src/components/GenerationStatusPanel.tsx` | Floating progress indicator |
| `client/src/components/navigation.tsx` | Mobile-responsive navigation |
| `server/routes.ts` | API endpoints for all features |
| `server/storage.ts` | Database operations interface |
| `shared/schema.ts` | Drizzle ORM schemas and types |
| `server/default-templates.ts` | Built-in template definitions |

---

## TODO List

### Completed
- [x] **Style Editor Redesign** ✅ (Nov 26)
- [x] **Character System** ✅ (Nov 26-27)
- [x] **Character Card Generation** ✅ (Nov 27)
- [x] **Avatar Profile System** ✅ (Nov 27-28)
- [x] **Character Integration in Style Editor** ✅ (Nov 27)
- [x] **Character Integration in Storyboard** ✅ (Dec 2)
- [x] **Global Generation Tracking** ✅ (Dec 2)
- [x] **Cinematic Template Type** ✅ (Dec 3)
- [x] **T2I Engine** ✅ (Dec 3)
- [x] **Character Proportion Control** ✅ (Dec 3)
- [x] **KIE API Request Details** ✅ (Dec 3)
- [x] **Style Reordering** ✅ (Dec 3)

### Medium Priority
- [ ] **Storyboard Edit Dialog Improvements**: Add image comparison feature (before/after)
- [ ] **Character Card Organization**: Group cards by style/angle, favoriting system
- [ ] **New Styles**: Continue adding and refining visual styles

### Lower Priority
- [ ] **Style Editor Preview Hints**: Visual hint for double-click to enlarge
- [ ] **Save Test Generation**: Save test results directly as character cards
- [ ] **Card Version Management**: Mark outdated cards when templates change

### Future Ideas / Backlog
- Character combination sheets (multi-character references)
- Character pose/expression library
- Card metadata and tagging system
- Batch card generation (multiple angles at once)
- Card quality rating system
- Batch scene image generation
- Export storyboard as PDF/image sequence
- AI-assisted prompt suggestions
- Collaborative editing features

---

## Recent Sessions

### Session: Dec 3, 2025 (Morning)
**Cinematic Templates & Generation Progress**
- Implemented Cinematic template type with weighted parameters
- Added real-time elapsed time display for generation progress
- Improved character proportion control with canvas height constraints

### Session: Dec 3, 2025 (Afternoon)
**T2I Engine & Style Management**
- Added Text-to-Image engine (no reference images required)
- Implemented drag-and-drop style reordering
- Added reference image file deletion with secure path handling
- Implemented KIE API Request Details dialog for debugging

### Session: Dec 4, 2025 (Morning)
**Storyboard & History Improvements**
- Improved character selection responsiveness in storyboard
- History loading shows generations immediately
- Updated character sheet angles to specify right-side direction

### Session: Dec 4, 2025 (Current)
**Development Log Update**
- Comprehensive update of DEVELOPMENT_LOG.md
- Added missing features from Nov 27 - Dec 4
- Reorganized into clear phases
- Updated architecture documentation

---

*Last Updated: December 4, 2025 - Development Log Comprehensive Update*
