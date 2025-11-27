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

### Phase 6: Character Management System (Nov 26, 2025)

#### Nov 26 - Character Editor Implementation
- **Character Database Schema**:
  - Created `characters` table in PostgreSQL
  - Fields: id, name, description, primary variation URL, created timestamp
  - Support for multiple character variations per character
- **Character Editor UI**:
  - Full-featured character management interface
  - Character list with thumbnail previews
  - Search and filter functionality
  - Create, edit, delete, and clone operations
- **Character Variations**:
  - Upload primary character variation (main reference image)
  - Add multiple additional variations (different poses, expressions, angles)
  - Drag-and-drop file upload with visual feedback
  - Variation preview and deletion
- **Integration**:
  - Added Character Editor to main navigation
  - Renamed Prompt Editor to Style Editor for clarity
  - Established foundation for character usage in storyboard scenes
- **API Endpoints**:
  - `GET /api/characters` - Fetch all characters
  - `POST /api/characters` - Create new character
  - `PUT /api/characters/:id` - Update character
  - `DELETE /api/characters/:id` - Delete character
  - `POST /api/characters/:id/upload-variation` - Upload character variation

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
- [x] **Style Editor Redesign**: Redesign the Prompt Editor interface to become a comprehensive Style Editor
  - Renamed Prompt Editor to Style Editor
  - Restructured editor page with better navigation
  - Improved organization for style configuration
  - Enhanced UX for template editing

- [x] **Character System**: Add character creation and editing interface ✅ (Nov 26, 2025)
  - ✅ Designed character definition schema (supports name, multiple variations, descriptions)
  - ✅ Built character creation UI with drag-and-drop variation upload
  - ✅ Implemented character CRUD operations (create, edit, delete, clone)
  - ✅ Added character variation management (primary + additional variations)
  - ✅ Integrated character editor into main navigation
  - ✅ Database schema for characters table with reference URLs
  - _Implementation: Individual character references with multiple variations approach (Plan B from character_editor_plan.md)_

### Medium Priority
- [ ] **Character Integration in Style Editor**: Enable character card selection as references
  - Add backend functionality to attach selected character cards as reference images
  - Update generation API to include character card images in reference list
  - Test character consistency across different styles

- [ ] **Character Integration in Storyboard**: Connect characters to scene generation
  - Add character selection UI in storyboard scenes
  - Integrate character variations as reference images
  - Implement character-aware prompt building
  - Test multi-character scene generation

- [ ] **Storyboard Edit Dialog Improvements**: Add image comparison feature
  - Show side-by-side comparison of original vs edited image
  - Add before/after toggle view in edit dialog
  - Display edit prompt alongside comparison

- [ ] **Character Card Organization**: Improve card management and discovery
  - Group cards by style (show style-specific cards together)
  - Group cards by angle/pose (front, three-quarter, side, etc.)
  - Add card favoriting/bookmarking system
  - Quick filter to show only favorite cards
  - Sort cards by creation date or custom order

- [ ] **New Styles**: Continue debugging and adding new visual styles
  - Test and refine existing templates
  - Create additional style presets
  - Validate style consistency across different prompts

- [ ] **UI/UX Optimization**: Continue improving interface usability
  - Streamline common workflows
  - Enhance visual feedback
  - Mobile responsiveness improvements

### Lower Priority
1. **风格编辑器预览交互改进**
   - 添加双击预览的视觉提示（hover 时显示"双击预览大图"）
   - 或添加放大图标按钮作为替代

2. **测试生成结果保存功能**
   - 在风格编辑器的测试生成区域添加"保存到角色"按钮
   - 允许用户将满意的测试结果直接保存为角色卡

3. **角色卡版本管理**
   - 当风格模板设置更改后，标记旧卡片（显示警告图标）
   - 提供批量重新生成选项，更新所有该风格的角色卡

4. **多角色选择支持**
   - 在风格编辑器和故事板中支持同时选择多个角色
   - 利用 API 的多图参考能力生成包含多角色的场景

## Future Ideas / Backlog
- 角色组合表（预生成的多角色参考）
- 角色姿势/表情库
- 卡片元数据和标签系统（添加自定义标签）
- 批量卡片生成（一次生成多个角度/姿势）
- 卡片质量评分系统（1-5星评分）
- 批量场景图片生成
- 导出故事板为 PDF/图片序列
- AI 辅助提示词建议
- 协作编辑功能

---

## Notes

**Character System Design Considerations:**
- Need to determine how characters are stored (database vs. reference images)
- Consider character "tokens" or IDs that can be embedded in prompts
- Explore using consistent reference images per character across scenes
- Balance between flexibility and consistency

_Add any additional notes, learnings, or decisions here._

---

*Last Updated: November 26, 2025 - Character System Completed*