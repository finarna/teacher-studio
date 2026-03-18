-- RPC: get_scan_mapping_counts
-- Returns mapped question count per scan, bypassing PostgREST max_rows limit.
-- Used by AdminScanApproval to display mapped/unmapped stats.
CREATE OR REPLACE FUNCTION get_scan_mapping_counts(p_scan_ids uuid[])
RETURNS TABLE(scan_id uuid, mapped_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT q.scan_id, COUNT(DISTINCT tqm.question_id)::bigint AS mapped_count
  FROM questions q
  INNER JOIN topic_question_mapping tqm ON tqm.question_id = q.id
  WHERE q.scan_id = ANY(p_scan_ids)
  GROUP BY q.scan_id;
$$;
