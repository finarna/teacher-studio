# Visual Notes Diagram Enhancement

## Problem
The current SVG diagrams generated for Visual Notes are too basic and simplistic:
- Simple circles and basic shapes
- Minimal annotations
- No educational depth
- Not suitable for exam preparation
- Lack of textbook-quality presentation

## Solution: Professional Textbook-Quality Diagrams

### Enhanced Prompt Features

#### 1. **Realistic 3D Representations**
- Proper perspective and depth
- Gradients for cylindrical/spherical objects
- Shadows (10% opacity) for realism
- Hidden lines shown as dashed
- Realistic textures (metal, glass, wood)

#### 2. **Comprehensive Annotations**
- ALL components labeled
- Leader lines (arrows) pointing to labels
- Dimensions with measurement lines
- Mathematical expressions on diagram
- Vector notation with proper symbols

#### 3. **Professional Color Coding**
- **Forces**: RED (#ef4444) - thick arrows
- **Velocities**: BLUE (#3b82f6) - medium arrows
- **Accelerations**: ORANGE (#f97316) - dashed arrows
- **Electric fields**: INDIGO (#6366f1) - field lines
- **Magnetic fields**: PURPLE (#a855f7) - ⊗/⊙ symbols
- **Positive charges**: RED circles
- **Negative charges**: BLUE circles
- **Axes**: BLACK (#0f172a) - thin lines
- **Grid**: LIGHT GRAY (#e2e8f0) - dotted

#### 4. **Subject-Specific Guidelines**

**MECHANICS:**
- Free body diagrams (separate from main)
- Force vectors from center of mass
- Coordinate systems (x, y, z)
- Trajectory paths (dashed curves)
- Velocity/acceleration vectors at key points

**ELECTROMAGNETISM:**
- Field lines (curved, smooth)
- Equipotential surfaces
- ⊗ for field into page, ⊙ for out of page
- Realistic circuit components
- Current direction arrows

**OPTICS:**
- Light rays with directional arrows
- Normal lines (dashed perpendicular)
- Angle measurements (θi, θr, θc)
- Lenses with proper curvature
- Focal points and principal axis

**MODERN PHYSICS:**
- Atomic structure with electron shells
- Energy level diagrams
- Wavelength representations
- Particle tracks and decay schemes

**THERMODYNAMICS:**
- P-V diagrams with labeled processes
- Heat engines with reservoirs
- Temperature gradients (color-coded)
- Molecular motion arrows

#### 5. **Layout Specifications**
- **ViewBox**: 1000x700 (wider for complex diagrams)
- **Main diagram**: Center, 70% of space
- **Annotations**: Around edges, 20% of space
- **Legend**: Bottom right if needed
- **Font**: Arial/Helvetica, 14-16px
- **Line weights**: 
  - 2px for main objects
  - 1px for details
  - 3px for vectors
- **Arrow heads**: Proper triangular heads

#### 6. **Quality Standards**
1. **Accuracy First**: Physical laws must be correct
2. **Clarity**: Every element clearly visible
3. **Completeness**: All relevant information included
4. **Professionalism**: Textbook quality (Resnick Halliday, HC Verma, NCERT level)
5. **Educational Value**: Should teach concept visually

### Examples of What Will Be Generated

**Before (Old Prompt):**
- Simple circle with basic labels
- Minimal detail
- No context or depth

**After (New Prompt):**
- Detailed 3D representation
- Multiple views (side, top, cross-section)
- Comprehensive force/velocity vectors
- Proper annotations with mathematical expressions
- Color-coded elements
- Educational clarity

### Testing the Enhancement

1. Go to **Sketch Gallery**
2. Select a question without a diagram
3. Click **"Sync Sketch"** or **"Generate All"**
4. Wait for AI generation (may take 10-20 seconds per diagram)
5. Review the generated SVG

**Expected Quality:**
- Professional, textbook-grade visualization
- Clear enough to understand the concept without reading the question
- Suitable for exam preparation and revision
- Includes all relevant physics elements (forces, fields, measurements)

### Notes
- Generation may take longer due to increased complexity
- Some diagrams may need regeneration if AI doesn't follow all guidelines
- The prompt emphasizes accuracy and educational value over speed
- Diagrams are optimized for both digital viewing and printing
