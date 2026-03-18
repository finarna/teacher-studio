-- Run this in Supabase SQL Editor to check if you have any quiz data

-- Check quiz_attempts table
SELECT
    'quiz_attempts' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as latest_quiz
FROM quiz_attempts;

-- Check test_attempts table
SELECT
    'test_attempts' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as latest_test,
    COUNT(CASE WHEN test_type = 'topic_quiz' THEN 1 END) as topic_quizzes,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests
FROM test_attempts;

-- Check your user's specific data
-- Replace YOUR_USER_ID with your actual user ID
SELECT
    id,
    test_type,
    test_name,
    subject,
    topic_id,
    total_questions,
    percentage,
    status,
    created_at
FROM test_attempts
WHERE user_id = 'YOUR_USER_ID'  -- Replace this
  AND test_type = 'topic_quiz'
ORDER BY created_at DESC
LIMIT 10;
