# CBSE Board Mastermind

## AI-Powered Train-the-Trainer & Visual Learning Intelligence Platform

---

## 1) VIBE-CODING READY PRD (Implementation-Grade)

### 1.1 Product Goal

Enable teachers to think like CBSE examiners and train students using visual-first, picture-based learning that maximizes marks.

### 1.2 Primary Users

* **Teachers (Class 11–12)** – Physics, Chemistry, Maths, Biology, English, CS
* **Academic Heads** – Curriculum planning & performance tracking
* **Students (Optional View)** – Visual recall & answer-writing

### 1.3 Success Metrics

* +20% average board score improvement
* 2× reduction in syllabus completion time
* > 70% adoption of visual-first answers

---

### 1.4 Core Modules & Acceptance Criteria

#### A. Multimodal Ingestion Engine

**Inputs:** PDFs, Images (scanned papers), Trend Scan (no upload)

* Converts to Base64
* Gemini Vision/Text analysis
* Detects diagrams, graphs, numericals, case studies
  **Acceptance:** 95% extraction accuracy; no UI failure on malformed files

#### B. Examiner Intelligence Engine

* Bloom’s taxonomy tagging
* Examiner intent explanation
* Minimum-answer logic for full marks
  **Acceptance:** Each question outputs intent + scoring logic

#### C. Visual Analytics Dashboard

* Topic heatmaps
* Diagram dependency index
* Trend evolution timeline
  **Acceptance:** Interactive, filterable, exportable

#### D. God-Mode Content Synthesizer

* Visual Concept Genome
* Formula cards, comparison tables
* High-yield questions + marking schemes
* Student pitfalls
  **Acceptance:** Auto-generated within 30s; printable

#### E. Train-the-Trainer AI

* Lesson playbooks (40-min / 2-day / 1-week)
* Teaching order & visuals
* Skill gap analysis
  **Acceptance:** One-click lesson generation

#### F. Simulation & Fallback Layer

* Mock data on API failure
* Graceful degradation
  **Acceptance:** Zero blank screens

---

### 1.5 Tech Stack (Suggested)

* **Frontend:** React + Tailwind + D3/Recharts
* **Backend:** Node/FastAPI
* **AI:** Gemini Vision + Text
* **State:** JSON-driven UI
* **Export:** Browser print to PDF

---

## 2) USER JOURNEY MAPS

### 2.1 Teacher Journey – Daily Use

1. Upload paper / select trend scan
2. View examiner insights
3. Identify high-weight topics
4. Generate visual mastery kit
5. Download lesson materials

**Emotional State:** Confident → Strategic → In control

---

### 2.2 Teacher Journey – Exam Prep Sprint

1. Select subject + chapter
2. Heatmap-guided prioritization
3. Diagram-first teaching plan
4. Common mistake simulations
5. Final revision visuals

---

### 2.3 Student Journey (Optional Mode)

1. Visual concept board
2. Diagram-based flashcards
3. Explain-with-picture answers
4. Exam-hall recall sheets

---

## 4) AI PROMPT ARCHITECTURE

### 4.1 Prompt Layers

#### Layer 1: Vision Analysis Prompt

"Analyze this CBSE question paper. Identify chapters, marks, diagram dependency, Bloom level, and examiner intent. Output clean JSON."

#### Layer 2: Examiner Intelligence Prompt

"For each question, explain why CBSE asked it, expected student mistake, and minimum answer for full marks."

#### Layer 3: Visual Content Generator Prompt

"Generate a visual-first mastery guide for the highest-weight topic including diagrams, formula cards, comparison tables, pitfalls, and marking schemes."

#### Layer 4: Teaching Strategy Prompt

"Create a 40-minute classroom playbook using board drawings, student questions, and exit assessment."

#### Layer 5: Error Handling Prompt

"If input is incomplete or truncated, infer realistic CBSE-style data and continue without failure."

---

### 4.2 Output Contracts

* Strict JSON
* No markdown
* Size-limited chunks
* UI-safe strings

---

## FINAL NOTE

This document is **Vibe-Coding ready**: feed directly to AI builders to generate a full working application with visuals, analytics, and pedagogy intelligence.
