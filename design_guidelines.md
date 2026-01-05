# Memory Garden Design Guidelines

## Design Approach
**Reference-Based**: Inspired by intimate, emotional products like Day One journal and Timehop, combined with the warmth of Pinterest's memory boards. This is a deeply personal app focused on emotional resonance and gentle, thoughtful interactions.

## Core Design Principles
1. **Intimate & Personal**: Design feels like a handwritten journal, not a social media feed
2. **Gentle & Calming**: Soft colors, generous spacing, minimal cognitive load
3. **Mobile-First**: Optimized for 430px viewport (typical phone screen)
4. **Timeless**: Classic typography and patterns that won't feel dated

---

## Typography

**Primary Font**: Georgia (serif family)
- Headers: 32px weight 400 (main titles), 24px weight 400 (section headers)
- Body: 16px for parent view, 18px for child view (larger for easier reading)
- Secondary text: 14-15px for metadata, timestamps, labels
- Small text: 13px for hints and tertiary information

**Hierarchy**:
- App title: 32px, letter-spacing -0.5px
- Card titles: 18px
- Body text: 16px, line-height 1.7 for readability
- Timestamps/metadata: 14px
- Use italic for quoted content and emotional emphasis

---

## Layout System

**Spacing Scale**: Use consistent units of 8, 12, 16, 20, 24, 32, 40, 60

**Container**:
- Max-width: 430px (mobile-optimized)
- Centered with auto margins
- Box-shadow: 0 0 40px rgba(0,0,0,0.1) for depth

**Padding**:
- Screen edges: 24-32px horizontal
- Vertical sections: 40-60px
- Cards: 20px internal padding
- Card gaps: 16px between cards

**Border Radius**:
- Cards: 16px
- Buttons: 12px
- Small elements (badges, pills): 8px
- Circular elements (play buttons): 50%

---

## Color System

**Primary Palette**:
- Sage: #7C9A82 (primary actions, accents)
- Sage Light: #E8F0E9 (subtle backgrounds)
- Sage Dark: #5A7A60 (hover states)
- Cream: #FDFBF7 (main background)
- Soft Black: #2D2D2D (primary text)
- Warm Gray: #6B6B6B (secondary text)
- Border: #E5E5E5 (subtle dividers)
- White: #FFFFFF (card backgrounds)

**Memory Type Colors**:
- Voice Memos: Coral (#FAE8E8 bg, #D4847A accent) with 🎙️
- From Others: Peach (#FDF2E9 bg, #E8B898 accent) with 💬
- Keepsakes: Lavender (#F3F0FA bg, #A89BBF accent) with 🎨
- Moments: Sage Light (#E8F0E9 bg, #7C9A82 accent) with 💚

---

## Component Library

### Buttons
**Primary Button**:
- Background: Sage, text: White
- Padding: 16px vertical, 32px horizontal
- Full width in mobile context
- Border-radius: 12px
- Hover: Sage Dark background
- Font: 16px, weight 500

**Secondary Button**:
- Transparent background, 2px Sage border
- Same dimensions as primary
- Hover: Sage background with white text transition

### Cards
- White background
- Border-radius: 16px
- Padding: 20px
- Shadow: 0 2px 8px rgba(0,0,0,0.04)
- Border: 1px solid #E5E5E5
- 16px margin-bottom for stacking

### Voice Memo Player
- Colored background matching memory type
- 56px circular play button with accent color
- Waveform: 20 bars, 4px width, 3px gap, heights 20-45px
- Duration display: 14px, aligned right
- Transcript in collapsible details element
- Shadow on play button: 0 4px 12px with type-specific opacity

### Input Fields
- Padding: 16px
- Border: 1px solid #E5E5E5
- Border-radius: 12px
- Background: White
- Font: 16px Georgia
- Focus: Sage border color

### Navigation Header
- Height: ~60px with 20px vertical padding
- Border-bottom: 1px solid #E5E5E5
- Space-between layout for title and actions
- Sticky positioning for scroll contexts

### Memory Type Badges
- Small rounded pills with emoji
- Background matches type color (light version)
- Text color matches accent
- 14px font size, 500 weight

---

## Interaction Patterns

**Minimal Animation**: Only use where meaningful
- Button hover: Subtle background color transition (0.2s ease)
- Card interactions: Slight shadow increase on tap/hover
- Voice playback: Waveform bars animate with 0.2s transition
- NO page transitions, NO loading spinners unless necessary

**Feedback**:
- Button states clear (hover, active, disabled)
- Form validation uses gentle color shifts
- Success states use soft sage glow
- Error states use warm coral (not harsh red)

---

## Images

**No hero image required** - this app uses emoji and gentle color backgrounds for emotional warmth rather than photography.

**Photo Integration**:
- Memory cards may include photos (aspect ratio 4:3 or 1:1)
- Photos appear within cards, never full-bleed
- Border-radius: 12px for photos
- Max height: 240px to maintain scroll flow

---

## Key Layout Screens

### Welcome Screen
- Centered vertical layout
- Large emoji at top (48px)
- Title and subtitle centered
- Buttons pushed to bottom with margin-top: auto
- Demo link at absolute bottom

### Main Feed (Parent View)
- Header with title and add button
- Scrollable card stack
- Each card type visually distinct via color
- Consistent 16px gaps
- Bottom padding: 40px for comfortable scroll end

### Child View
- Simplified navigation
- Larger text (18px body)
- Same gentle colors but more generous spacing
- Hide complexity (settings, edit functions)