# Design Guidelines: AI Image Generation Web App

## Design Approach
**Reference-Based**: Inspired by modern AI generation tools (Midjourney Discord interface, DALL-E, Stability AI) - emphasizing clean utility with creative polish. This is a productivity tool where clarity and efficiency drive the design.

## Layout System

**Single-Page Tool Layout**
- Centered content container: `max-w-4xl mx-auto px-4 py-8`
- Two-column desktop split (form left, results right) using `grid grid-cols-1 lg:grid-cols-2 gap-8`
- Mobile stacks vertically
- Spacing primitives: Use Tailwind units of 2, 4, 6, and 8 consistently (p-4, gap-6, mb-8, etc.)

**Viewport**: Natural height based on content - no forced 100vh constraints

## Typography

**Font Stack**: 
- Primary: 'Inter' or 'DM Sans' from Google Fonts
- Monospace: 'JetBrains Mono' for any technical elements

**Hierarchy**:
- Page title: `text-3xl font-bold` (32px)
- Section headers: `text-xl font-semibold` (20px)
- Form labels: `text-sm font-medium` (14px)
- Body text: `text-base` (16px)
- Helper text: `text-sm text-gray-600` (14px)

## Component Library

### Header Section
- Simple page title "AI Image Generator"
- Optional subtitle explaining the tool's purpose
- Minimal top navigation or logo area

### Generation Form (Left Panel)
**Form Container**: Subtle border with rounded corners (`border rounded-lg p-6`)

**Components**:
1. **Textarea for Prompt**
   - Large, prominent textarea (`min-h-32`)
   - Placeholder: "Describe the image you want to generate..."
   - Character counter below (optional)

2. **Style Preset Dropdown**
   - Custom-styled select with icon
   - Show style description below selected option
   - Use chevron-down icon from Heroicons

3. **Engine Selection**
   - Radio buttons or segmented control (more modern than dropdown)
   - Horizontal layout on desktop

4. **Generate Button**
   - Full-width on mobile, auto-width on desktop
   - Primary action styling with subtle shadow
   - Icon: sparkles or wand from Heroicons

### Results Panel (Right Panel)
**Image Display Area**:
- Aspect ratio container (16:9 or 4:3) with `aspect-video` or `aspect-[4/3]`
- Placeholder state: Dashed border with centered icon and text
- Loading state: Skeleton or spinner animation
- Generated image: Full-width with rounded corners

**Status Messages**:
- Alert-style component above or below image
- Success: subtle green background
- Error: subtle red background
- Processing: subtle blue background with animated pulse

### Style Preset Cards (Optional Enhancement)
Instead of just a dropdown, show visual cards for each style preset with:
- Small preview/icon representing the style
- Style name and brief description
- Selected state with border highlight

## Visual Treatment

**Borders & Shadows**:
- Form inputs: `border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`
- Cards/containers: `border border-gray-200 shadow-sm`
- Generated image: `shadow-lg` for emphasis

**Spacing**:
- Form field spacing: `space-y-4`
- Section spacing: `space-y-8`
- Container padding: `p-6` or `p-8`

**Corners**: Consistent `rounded-lg` (8px) throughout, `rounded-xl` (12px) for larger containers

## Accessibility
- Clear labels for all form inputs with `for` attributes
- Focus states on all interactive elements
- High contrast text (minimum WCAG AA)
- Alt text for generated images
- Status messages announced to screen readers

## Images
**No hero image needed** - this is a functional tool page. The generated images ARE the visual focal point.

**Icon Usage**: Heroicons CDN for:
- Sparkles icon for generate button
- Photo icon for empty image state
- Chevron-down for dropdowns
- Alert/info icons for status messages

## Animations
**Minimal, purposeful only**:
- Fade-in for generated images (`transition-opacity duration-300`)
- Pulse animation during generation (`animate-pulse`)
- Smooth focus ring transitions on inputs

## Key Design Principles
1. **Clarity First**: Every element serves a clear purpose
2. **Generous Spacing**: Don't crowd the form - let it breathe
3. **Immediate Feedback**: Visual response to all user actions
4. **Results Emphasis**: Generated image is the hero of the page
5. **Progressive Disclosure**: Show style descriptions only when relevant

This design creates a polished, modern image generation tool that feels professional while remaining approachable and easy to use.