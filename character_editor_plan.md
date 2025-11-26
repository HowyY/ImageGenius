
# Character Editor Plan

## Overview
This document outlines different approaches for implementing a character management system for consistent character generation across multiple scenes in the storyboard.

---

## Plan A: Pre-Generated Character Combination Sheets

### Concept
Pre-generate character combination images (1-person, 2-person, 3-person, etc.) and use a single sheet as the reference image for generation.

### Advantages
✅ **Concentrated weight**: Single image contains all needed character information  
✅ **Simplified API calls**: Only 1 reference image needed  
✅ **Better control**: Pre-designed character layouts and compositions  
✅ **Version management**: Easy to iterate and manage character designs  

### Challenges
⚠️ **Combinatorial explosion**: For 5 characters:
- Single: 5 sheets
- Pairs: C(5,2) = 10 sheets  
- Triples: C(5,3) = 10 sheets
- Quads: C(5,4) = 5 sheets
- All five: C(5,5) = 1 sheet
- **Total: 31 pre-generated sheets**

⚠️ **Model interpretation**: Unclear if the model can:
- Understand "use only character A and C from this sheet"
- Separate individual characters from a multi-character reference
- Requires prompt engineering to specify which characters to use

⚠️ **Sheet layout design**:
- Need clear visual separation between characters
- Character labels might interfere with style consistency
- Scale and positioning affects recognition

### Feasibility Assessment

**HIGH feasibility if:**
- Fixed combinations (e.g., script defines specific character pairings)
- Small scale (< 10 actual combinations used)
- Unified style across all characters

**Implementation Strategy:**
```typescript
// Only generate actually needed combinations
const characterSheets = {
  "A_B": "/sheets/A_B.png",  // Scene 1, 3, 5
  "A_C": "/sheets/A_C.png",  // Scene 2, 7
  "B_D": "/sheets/B_D.png",  // Scene 4, 6
  // Total: 3 sheets instead of 31
}

// Usage
if (characterSheets[`${char1}_${char2}`]) {
  userReferenceImages = [characterSheets[`${char1}_${char2}`]]
}
```

**MEDIUM feasibility if:**
- Dynamic character combinations needed
- Precise control of individual character poses/expressions required

**Recommendation:**
```typescript
// Hybrid approach
1. Core characters: high-quality individual reference images (1-3 per character)
2. Detailed prompts describing character features and positions
3. Leverage userReferenceImages priority ordering
```

**LOW feasibility if:**
- Many characters (> 5)
- Frequently changing combinations
- Need precise control of each character's pose/expression

---

## Plan B: Individual Character References + Token System

### Concept
Store one high-quality reference image per character, assign each character a unique token/ID, and dynamically compose prompts with character descriptions.

### Architecture
```typescript
// Character database schema
interface Character {
  id: string;              // e.g., "char_001"
  name: string;            // e.g., "protagonist"
  token: string;           // e.g., "[CHAR_A]"
  referenceImage: string;  // URL to character reference image
  description: {
    appearance: string;    // "short brown hair, blue jacket"
    features: string;      // "round glasses, friendly smile"
    style: string;         // "casual modern clothing"
  };
  createdAt: Date;
}

// Scene usage
interface SceneCharacter {
  characterId: string;
  pose?: string;           // "standing", "sitting"
  expression?: string;     // "happy", "worried"
  position?: string;       // "left side", "background"
}
```

### Implementation Strategy

**Database Integration:**
```sql
-- Characters table
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  reference_image_url TEXT NOT NULL,
  appearance_description TEXT,
  feature_description TEXT,
  style_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scene-Character mapping
CREATE TABLE scene_characters (
  scene_id INTEGER REFERENCES storyboard_scenes(id),
  character_id TEXT REFERENCES characters(id),
  pose TEXT,
  expression TEXT,
  position TEXT,
  PRIMARY KEY (scene_id, character_id)
);
```

**Prompt Generation:**
```typescript
function buildCharacterPrompt(
  sceneDescription: string,
  characters: SceneCharacter[]
): string {
  const characterDescriptions = characters.map(sc => {
    const char = getCharacter(sc.characterId);
    return `${char.token} (${char.description.appearance}, ${sc.pose || 'natural pose'}, ${sc.expression || 'neutral expression'})`;
  }).join(" and ");
  
  return `${sceneDescription}. Characters: ${characterDescriptions}`;
}

// Example output:
// "Two people chatting in a coffee shop. Characters: [CHAR_A] (short brown hair, blue jacket, sitting, happy expression) and [CHAR_C] (long red hair, white dress, standing, thoughtful expression)"
```

**Reference Image Handling:**
```typescript
// For a scene with characters A and C
const userReferenceImages = [
  characters["A"].referenceImage,
  characters["C"].referenceImage
];

// Priority order maintained:
// 1. User-selected references (character images)
// 2. Template references (style guides)
// 3. Style preset images
```

### Advantages
✅ **Scalability**: Linear growth (N characters = N reference images)  
✅ **Flexibility**: Mix and match any character combination  
✅ **Precise control**: Specify individual poses, expressions, positions  
✅ **Maintainability**: Update one character affects all scenes  
✅ **Storage efficiency**: Reuse same references across scenes  

### Challenges
⚠️ **Prompt complexity**: Need careful prompt engineering  
⚠️ **Reference weight dilution**: Multiple character refs may reduce individual clarity  
⚠️ **Consistency**: Requires testing to ensure character recognition  

---

## Plan C: Hybrid Approach (Recommended for MVP)

### Level 1: MVP (Minimum Viable Product)
```typescript
// Simple character storage
const characters = [
  { 
    id: "A", 
    name: "Protagonist", 
    refImage: "/chars/A.png",
    description: "Short brown hair, blue jacket"
  },
  { 
    id: "B", 
    name: "Sidekick", 
    refImage: "/chars/B.png",
    description: "Tall, red shirt, glasses"
  }
];

// Usage in scene
userReferenceImages = [
  characters[0].refImage,  // Character A
  characters[1].refImage   // Character B
];
```

### Level 2: Optimized (Pre-Generated Common Combinations)
```typescript
// Pre-define frequently used combinations
const characterSheets = {
  "A_B": "/sheets/A_B.png",
  "A_C": "/sheets/A_C.png",
  // Only 5-10 actual combinations
};

// Smart selection
if (characterSheets[`${char1}_${char2}`]) {
  // Use pre-generated sheet for common combinations
  userReferenceImages = [characterSheets[`${char1}_${char2}`]];
} else {
  // Fall back to individual character references
  userReferenceImages = [char1.refImage, char2.refImage];
}
```

### Level 3: Advanced (AI-Powered Character System)
- Individual character references
- Token-based character identification
- Fine-grained control over poses/expressions
- Character consistency verification
- Advanced prompt engineering

---

## Alternative Approaches

### Plan D: LoRA/Fine-Tuning (Future)
Train custom models on character datasets for guaranteed consistency.

**Pros:**
- Highest consistency
- No reference images needed at inference

**Cons:**
- Requires model training infrastructure
- Longer iteration cycles
- May not be supported by current APIs

### Plan E: ControlNet Integration (If Available)
Use pose/layout control alongside character references.

**Pros:**
- Precise spatial control
- Better multi-character compositions

**Cons:**
- Requires ControlNet-enabled models
- Additional complexity

---

## Recommended Implementation Path

### Phase 1: Foundation (Week 1)
1. Implement basic Character database schema
2. Create Character management UI (CRUD operations)
3. Single character reference image upload
4. Basic character selection in scene editor

### Phase 2: Integration (Week 2)
1. Integrate character references with storyboard scenes
2. Multi-character selection UI
3. Reference image priority handling
4. Character description prompt enhancement

### Phase 3: Optimization (Week 3)
1. Test character consistency across scenes
2. Implement pre-generated sheets for common combinations
3. Add character pose/expression controls
4. Version control for character designs

### Phase 4: Polish (Week 4)
1. Character preview in scene cards
2. Batch character updates
3. Character usage analytics
4. Export/import character library

---

## Technical Considerations

### Reference Image Limits by Engine
| Engine | Max References | Strategy |
|--------|----------------|----------|
| NanoBanana | 3 | Prioritize: 1-2 characters + 1 style |
| SeeDream | 10 | More flexible: multiple characters + style refs |
| Nano Pro | 8 | Balanced approach |

### Storage Strategy
```typescript
// Character reference images
/reference-images/
  /characters/
    /char_001/
      reference.png
      variations/
        pose_A.png
        pose_B.png
    /char_002/
      reference.png
  /sheets/
    char_001_002.png
    char_001_003.png
```

### API Integration Points
- `/api/characters` - CRUD operations
- `/api/characters/:id/upload` - Reference image upload
- `/api/scenes/:id/characters` - Scene-character mapping
- `/api/generate` - Enhanced with character tokens

---

## Next Steps

1. **Validate Approach**: Test Plan B (individual refs + tokens) with 2-3 characters
2. **Measure Consistency**: Generate 10 scenes with same characters, evaluate quality
3. **Document Findings**: Record which approach yields best results
4. **Iterate**: Adjust based on real-world testing

---

## Questions to Resolve

- [ ] How well does NanoBanana recognize individual characters from multi-character reference images?
- [ ] What prompt structure yields most consistent character representation?
- [ ] How many reference images can we use before quality degrades?
- [ ] Should character tokens be embedded in prompts or handled separately?
- [ ] What's the optimal balance between reference images and text descriptions?

---

*Last Updated: 2025-01-26*
*Status: Planning Phase*
*Next Review: After MVP Testing*
