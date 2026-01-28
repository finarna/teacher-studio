/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPREHENSIVE PHYSICS NOTATION REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for Physics-specific notation and LaTeX formatting
 *
 * Used by:
 * - BoardMastermind.tsx: For AI extraction instruction prompts
 * - SketchGenerators.ts: For diagram notation (already has Physics rules)
 * - ExamAnalysis.tsx: For solution rendering
 *
 * NOTE: This complements existing Physics rules, does not replace them
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Generate comprehensive Physics notation extraction instructions
 * These are injected into AI prompts to ensure proper LaTeX conversion
 */
export function generatePhysicsExtractionInstructions(): string {
  return `
══════════════════════════════════════════════════════════════════════════
CRITICAL PHYSICS NOTATION - Convert Visual Symbols to Proper LaTeX
══════════════════════════════════════════════════════════════════════════

YOU ARE EXTRACTING FROM A PRINTED/PDF PHYSICS PAPER. Physical quantities,
units, and symbols MUST be converted to proper LaTeX format.

═══════════════════════════════════════════════════════════════════════════

1. VECTORS (CRITICAL - Bold notation or arrow notation)
   ────────────────────────────────────────────────────────────────────────
   Visual: **F**, **v**, **a** (bold letters)     → LaTeX: $\\mathbf{F}$, $\\mathbf{v}$, $\\mathbf{a}$
   Visual: →F, F→, F⃗ (arrow notation)             → LaTeX: $\\vec{F}$ or $\\mathbf{F}$
   Visual: F̂, v̂ (unit vectors)                   → LaTeX: $\\hat{F}$, $\\hat{v}$

   COMMON PHYSICS VECTORS:
   - Force: **F** → $\\mathbf{F}$ or $\\vec{F}$
   - Velocity: **v** → $\\mathbf{v}$ or $\\vec{v}$
   - Acceleration: **a** → $\\mathbf{a}$ or $\\vec{a}$
   - Electric Field: **E** → $\\mathbf{E}$ or $\\vec{E}$
   - Magnetic Field: **B** → $\\mathbf{B}$ or $\\vec{B}$
   - Displacement: **r** → $\\mathbf{r}$ or $\\vec{r}$
   - Momentum: **p** → $\\mathbf{p}$ or $\\vec{p}$

   EXAMPLE CONVERSIONS:
   - "Net force F = ma" → "Net force $\\mathbf{F} = m\\mathbf{a}$"
   - "Electric field E at point P" → "Electric field $\\mathbf{E}$ at point P"

═══════════════════════════════════════════════════════════════════════════

2. SUBSCRIPTS & SUPERSCRIPTS (CRITICAL for Physics quantities)
   ────────────────────────────────────────────────────────────────────────
   Visual: v₀, v₁, v₂ (initial/final velocity)   → LaTeX: $v_0$, $v_1$, $v_2$
   Visual: Eₖ, Eₚ (kinetic/potential energy)     → LaTeX: $E_k$, $E_p$ or $E_{\\text{k}}$, $E_{\\text{p}}$
   Visual: T₁, T₂ (temperatures/tensions)        → LaTeX: $T_1$, $T_2$
   Visual: R₁, R₂ (resistances)                  → LaTeX: $R_1$, $R_2$
   Visual: aₓ, aᵧ (components)                   → LaTeX: $a_x$, $a_y$
   Visual: m², cm³ (squared/cubed units)         → LaTeX: $\\text{m}^2$, $\\text{cm}^3$

   EXAMPLE CONVERSIONS:
   - "v0 = 10 m/s" → "$v_0 = 10\\,\\text{m/s}$" (initial velocity)
   - "Ek = 1/2 mv²" → "$E_k = \\frac{1}{2}mv^2$" (kinetic energy)
   - "Resistance R1 = 5Ω" → "Resistance $R_1 = 5\\,\\Omega$"

═══════════════════════════════════════════════════════════════════════════

3. UNITS (CRITICAL - Always use \\text{} and proper spacing)
   ────────────────────────────────────────────────────────────────────────
   RULE: Units must have thin space (\\,) before them, wrapped in \\text{}

   Visual: 10 m/s                → LaTeX: $10\\,\\text{m/s}$
   Visual: 9.8 m/s²              → LaTeX: $9.8\\,\\text{m/s}^2$
   Visual: 100 N                 → LaTeX: $100\\,\\text{N}$
   Visual: 5 kg                  → LaTeX: $5\\,\\text{kg}$
   Visual: 20°C                  → LaTeX: $20\\,^\\circ\\text{C}$
   Visual: 3 × 10⁸ m/s           → LaTeX: $3 \\times 10^8\\,\\text{m/s}$
   Visual: 5Ω (ohms)             → LaTeX: $5\\,\\Omega$
   Visual: 10μF (microfarads)    → LaTeX: $10\\,\\mu\\text{F}$
   Visual: 2mA (milliamperes)    → LaTeX: $2\\,\\text{mA}$

   WRONG: "10m/s" or "$10 m/s$" (no spacing or missing \\text{})
   RIGHT: "$10\\,\\text{m/s}$"

   COMMON UNITS:
   - m, cm, km (length)          → $\\text{m}$, $\\text{cm}$, $\\text{km}$
   - s, ms, min (time)           → $\\text{s}$, $\\text{ms}$, $\\text{min}$
   - kg, g (mass)                → $\\text{kg}$, $\\text{g}$
   - N (force)                   → $\\text{N}$
   - J (energy)                  → $\\text{J}$
   - W (power)                   → $\\text{W}$
   - V (voltage)                 → $\\text{V}$
   - A, mA (current)             → $\\text{A}$, $\\text{mA}$
   - Ω (resistance)              → $\\Omega$
   - C, °C, K (temperature)      → $^\\circ\\text{C}$, $\\text{K}$
   - Hz (frequency)              → $\\text{Hz}$
   - T (magnetic field)          → $\\text{T}$

═══════════════════════════════════════════════════════════════════════════

4. SCIENTIFIC NOTATION (CRITICAL - Use \\times, not x)
   ────────────────────────────────────────────────────────────────────────
   Visual: 3 × 10⁸              → LaTeX: $3 \\times 10^8$
   Visual: 6.626 × 10⁻³⁴        → LaTeX: $6.626 \\times 10^{-34}$
   Visual: 1.6 × 10⁻¹⁹ C        → LaTeX: $1.6 \\times 10^{-19}\\,\\text{C}$

   WRONG: "3 x 10^8" or "3*10^8"
   RIGHT: "$3 \\times 10^8$"

   COMMON PHYSICS CONSTANTS:
   - Speed of light: $c = 3 \\times 10^8\\,\\text{m/s}$
   - Planck's constant: $h = 6.626 \\times 10^{-34}\\,\\text{J·s}$
   - Elementary charge: $e = 1.6 \\times 10^{-19}\\,\\text{C}$
   - Gravitational constant: $G = 6.674 \\times 10^{-11}\\,\\text{N·m}^2/\\text{kg}^2$
   - Avogadro's number: $N_A = 6.022 \\times 10^{23}\\,\\text{mol}^{-1}$

═══════════════════════════════════════════════════════════════════════════

5. GREEK LETTERS (Common in Physics formulas)
   ────────────────────────────────────────────────────────────────────────
   α (alpha) - angle, angular acceleration     → $\\alpha$
   β (beta) - angle, velocity ratio            → $\\beta$
   γ (gamma) - Lorentz factor, gamma rays      → $\\gamma$
   δ (delta) - small change                    → $\\delta$
   Δ (Delta) - change, difference              → $\\Delta$
   ε (epsilon) - permittivity, emf             → $\\epsilon$ or $\\varepsilon$
   θ (theta) - angle                           → $\\theta$
   λ (lambda) - wavelength                     → $\\lambda$
   μ (mu) - coefficient of friction, permeability → $\\mu$
   ν (nu) - frequency                          → $\\nu$
   ρ (rho) - density, resistivity              → $\\rho$
   σ (sigma) - surface charge density, stress  → $\\sigma$
   τ (tau) - torque, time constant             → $\\tau$
   φ (phi) - angle, magnetic flux              → $\\phi$ or $\\varphi$
   Φ (Phi) - flux                              → $\\Phi$
   ω (omega) - angular velocity                → $\\omega$
   Ω (Omega) - ohm (unit)                      → $\\Omega$

   EXAMPLE CONVERSIONS:
   - "angular velocity ω = 2πf" → "angular velocity $\\omega = 2\\pi f$"
   - "wavelength λ = 500nm" → "wavelength $\\lambda = 500\\,\\text{nm}$"
   - "coefficient of friction μ = 0.3" → "coefficient of friction $\\mu = 0.3$"

═══════════════════════════════════════════════════════════════════════════

6. FRACTIONS & EQUATIONS (CRITICAL - Use \\frac{}{})
   ────────────────────────────────────────────────────────────────────────
   Visual: 1/2 mv²              → LaTeX: $\\frac{1}{2}mv^2$
   Visual: F = ma               → LaTeX: $F = ma$
   Visual: v² = u² + 2as        → LaTeX: $v^2 = u^2 + 2as$
   Visual: PV = nRT             → LaTeX: $PV = nRT$
   Visual: E = mc²              → LaTeX: $E = mc^2$
   Visual: F = GMm/r²           → LaTeX: $F = \\frac{GMm}{r^2}$

   EXAMPLE CONVERSIONS:
   - "Kinetic energy = 1/2mv²" → "Kinetic energy = $\\frac{1}{2}mv^2$"
   - "Ohm's law: V=IR" → "Ohm's law: $V = IR$"

═══════════════════════════════════════════════════════════════════════════

7. SPECIAL PHYSICS SYMBOLS
   ────────────────────────────────────────────────────────────────────────
   Visual: ∝ (proportional to)          → LaTeX: $\\propto$
   Visual: ≈ (approximately)            → LaTeX: $\\approx$
   Visual: ∞ (infinity)                 → LaTeX: $\\infty$
   Visual: ∫ (integral)                 → LaTeX: $\\int$
   Visual: ∂ (partial derivative)       → LaTeX: $\\partial$
   Visual: ∇ (del/gradient)             → LaTeX: $\\nabla$
   Visual: · (dot product)              → LaTeX: $\\cdot$
   Visual: × (cross product)            → LaTeX: $\\times$
   Visual: ≠ (not equal)                → LaTeX: $\\neq$
   Visual: ≤, ≥ (inequalities)          → LaTeX: $\\leq$, $\\geq$

═══════════════════════════════════════════════════════════════════════════

8. CHEMICAL FORMULAS (in Physics context - Atomic/Nuclear Physics)
   ────────────────────────────────────────────────────────────────────────
   Visual: H₂O                  → LaTeX: $\\text{H}_2\\text{O}$
   Visual: CO₂                  → LaTeX: $\\text{CO}_2$
   Visual: ²³⁸U₉₂ (uranium)     → LaTeX: $^{238}_{92}\\text{U}$ or $^{238}\\text{U}$
   Visual: ⁴He₂ (helium)        → LaTeX: $^4_2\\text{He}$ or $^4\\text{He}$

   EXAMPLE CONVERSIONS:
   - "Uranium-238 (²³⁸U) decay" → "Uranium-238 ($^{238}\\text{U}$) decay"

═══════════════════════════════════════════════════════════════════════════

WRAPPING RULES - MANDATORY!
────────────────────────────────────────────────────────────────────────────
✓ Inline math (within sentence):     Use $...$
✓ Display math (standalone equation): Use $$...$$
✗ NEVER leave physical quantities, formulas, or units unwrapped!

═══════════════════════════════════════════════════════════════════════════

COMPLETE REAL-WORLD EXAMPLES:
────────────────────────────────────────────────────────────────────────────

WRONG: "A body of mass 2kg moving with velocity 10m/s has kinetic energy Ek = 1/2mv²"
RIGHT: "A body of mass $2\\,\\text{kg}$ moving with velocity $10\\,\\text{m/s}$ has kinetic energy $E_k = \\frac{1}{2}mv^2$"

WRONG: "The force F = 20N acts at angle θ = 30° with displacement 5m"
RIGHT: "The force $F = 20\\,\\text{N}$ acts at angle $\\theta = 30^\\circ$ with displacement $5\\,\\text{m}$"

WRONG: "Resistance R1 = 10Ω and R2 = 20Ω connected in series. Total R = R1 + R2"
RIGHT: "Resistance $R_1 = 10\\,\\Omega$ and $R_2 = 20\\,\\Omega$ connected in series. Total $R = R_1 + R_2$"

WRONG: "Speed of light c = 3 x 10^8 m/s"
RIGHT: "Speed of light $c = 3 \\times 10^8\\,\\text{m/s}$"

WRONG: "Wavelength λ = 500nm, frequency f = 6 x 10^14 Hz"
RIGHT: "Wavelength $\\lambda = 500\\,\\text{nm}$, frequency $f = 6 \\times 10^{14}\\,\\text{Hz}$"

══════════════════════════════════════════════════════════════════════════
END OF PHYSICS NOTATION GUIDE
══════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Get compact Physics notation examples for quick reference
 */
export function getPhysicsNotationExamples(): string {
  return `
KEY PHYSICS NOTATION CONVERSIONS (Quick Reference):
**F** → $\\mathbf{F}$ | v₀ → $v_0$ | 10 m/s → $10\\,\\text{m/s}$ | 3×10⁸ → $3 \\times 10^8$ | θ → $\\theta$ | λ → $\\lambda$ | μ → $\\mu$ | ω → $\\omega$ | Ω → $\\Omega$ | 1/2mv² → $\\frac{1}{2}mv^2$
`;
}
