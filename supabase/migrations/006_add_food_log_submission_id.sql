-- A client submission may be retried by the browser or tapped twice. Keep one
-- copy of each row within a single food-log submission while preserving all
-- existing historical logs.
alter table public.food_logs
  add column submission_id uuid,
  add column submission_item_index smallint;

alter table public.food_logs
  add constraint food_logs_user_submission_item_key
  unique (user_id, submission_id, submission_item_index);
