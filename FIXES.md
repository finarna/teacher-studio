# Issues to Fix

## 1. Sketch Notes - Add Selection UI
- Add subject/class/vault selector at the top
- Show sketch notes organized by module/category
- Generate comprehensive visual notes covering all questions

## 2. Domain Weightage Calculation
- Fix the topicDistribution calculation in portfolioStats
- Ensure each domain gets proper marks aggregation
- The chart should show different values for different domains

## 3. SYNTHESIS_CLEAN_FAIL Error
- The AI response doesn't match the expected schema
- Need to handle array responses properly
- Add better error handling and schema validation

## 4. Newly Generated Scan Not in Vault
- Check if scan is being added to state immediately
- Verify Redis sync is not blocking UI updates
- Ensure vault list refreshes after scan completion

## Priority Order:
1. Fix Domain Weightage (most visible bug)
2. Fix SYNTHESIS error (blocking functionality)
3. Add Sketch Notes selection
4. Fix vault real-time updates
