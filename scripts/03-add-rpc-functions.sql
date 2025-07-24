-- Add RPC function to update category question count
CREATE OR REPLACE FUNCTION update_category_question_count(category_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE categories 
  SET total_questions = (
    SELECT COUNT(q.id)
    FROM questions q
    JOIN question_sets qs ON q.question_set_id = qs.id
    WHERE qs.category_id = update_category_question_count.category_id
  ),
  updated_at = NOW()
  WHERE id = update_category_question_count.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_category_question_count(UUID) TO authenticated;
