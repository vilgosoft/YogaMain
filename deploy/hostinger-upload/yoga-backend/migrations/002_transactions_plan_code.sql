-- Optional: record which pricing option was purchased
ALTER TABLE transactions
    ADD COLUMN plan_code VARCHAR(40) NULL AFTER course_id;
