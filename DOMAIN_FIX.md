# Domain Categorization Fix

## Problem
All 188 questions were being categorized as "Core Foundations" instead of being distributed across proper Physics domains (Mechanics, Electrodynamics, Modern Physics, Optics, Thermodynamics, Waves, Semiconductors).

This caused:
- Overview tab: Shows only 1 category with 188 marks
- Intelligence tab: Chart shows only 43 marks (incomplete data)
- Vault tab: Only shows "Core Foundations" domain

## Root Cause
The domain matching logic was too strict and used limited keywords. For example:
- AI might label a question as "Electrostatics" but we only had "Electrostatic" in keywords
- AI might use "Electricity" but we only had "Electric"
- Simple `includes()` check missed many valid matches

## Solution Applied

### 1. Expanded Keyword Lists
Added comprehensive variations for each domain:

**Mechanics**: Added "Gravity", "Energy", "Power", "Momentum", "Force", "Newton", "Projectile", "Velocity", "Acceleration", "Mass", "Density", "Pressure"

**Electrodynamics**: Added "Electric", "Resistance", "Ohm", "Voltage", "Battery", "Conductor", "Insulator", "Dielectric", "Flux", "Gauss", "Coulomb"

**Modern Physics**: Added "Atom", "Nuclear", "Photon", "Electron", "Proton", "Neutron", "Isotope", "Fission", "Fusion", "Planck", "Einstein", "Compton"

**Optics**: Added "Refraction", "Reflection", "Light", "Spectrum", "Dispersion", "Focal", "Image", "Magnification", "Telescope", "Microscope"

**Thermodynamics**: Added "Gas", "Temperature", "Convection", "Radiation", "Calorimetry", "Expansion", "Ideal Gas", "Carnot", "Kelvin", "Celsius"

**Waves**: Added "Oscillation", "Resonance", "Frequency", "Amplitude", "Period", "Pendulum", "Vibration"

**Semiconductors**: Added "LED", "Amplifier", "Oscillator", "Digital", "Analog"

### 2. Scoring-Based Matching
Instead of taking the first match, the algorithm now:
- Scores each domain based on keyword matches
- Strong match (exact or contains): +10 points
- Partial word match (word stems): +5 points
- Selects the domain with the highest score

### 3. Flexible Word Matching
Handles variations like:
- "Electric" matches "Electricity", "Electrical", "Electrostatic"
- "Optic" matches "Optics", "Optical"
- "Gas" matches "Gases", "Gaseous"

## Expected Results
After this fix:
- **Overview tab**: Should show 6-7 categories instead of just 1
- **Intelligence tab**: Chart should show proper distribution across all domains
- **Vault tab**: Questions organized into proper Physics domains
- **Total marks**: Should add up correctly across all categories (188 total)

## Testing
Refresh the page and check:
1. Overview → Strategic Analysis Matrix should show multiple categories
2. Intelligence → Domain Weightage chart should show multiple lines
3. Vault → Should show questions grouped by domain (Mechanics, Electrodynamics, etc.)
