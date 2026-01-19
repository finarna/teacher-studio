# ExamAnalysis & RapidRecall Enhancement Plan

## Issues Identified:

### 1. Rapid Recall - Flash Cards Generation
**Problem**: Currently generates generic cards, not based on vault/analysis data
**Solution**: 
- Add vault item selector to RapidRecall
- Generate cards from specific analysis categories
- Allow user to select card count (10/20/50)
- Extract key concepts from question derivations and mastery materials

### 2. Intelligence Traits Graphs
**Problem**: Graphs may show incorrect or duplicate data
**Sub-issues**:
- Cognitive Balance Index: Using wrong data keys or showing flat lines
- Rigor Segmentation: May not be displaying correctly
- Longitudinal Cognitive Drift: Needs verification

### 3. Overview Tab - Paper Cards
**Problem**: All papers showing same Complexity Index, Depth, and Density
**Root Cause**: portfolioStats calculation issue - not properly differentiating per-source metrics

### 4. Strategic Analysis Matrix
**Problem**: Showing only one category or duplicate categories
**Root Cause**: Domain aggregation logic may be filtering incorrectly

### 5. Domain Weightage Drift Graph
**Problem**: Graph showing incorrect data or not rendering properly
**Root Cause**: topicTrendData structure or domain mapping issue

## Implementation Order:

1. Fix portfolioStats calculation (affects issues #2, #3, #5)
2. Fix Strategic Analysis Matrix display (issue #4)
3. Fix Domain Weightage graph data structure (issue #5)
4. Enhance RapidRecall with vault integration (issue #1)
5. Verify all graph rendering logic (issue #2)
