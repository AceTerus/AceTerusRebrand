-- =============================================================================
-- OMC Demo Data Migration
-- Seeds demo content from DemoSeeder.php and DemoUserSeeder.php.
-- Uses pgcrypto for password hashing (available in Supabase by default).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user1_id          BIGINT;
    v_user2_id          BIGINT;

    v_subject1_id       BIGINT;
    v_module1_id        BIGINT;
    v_deck1_id          BIGINT;

    v_subject2_id       BIGINT;
    v_module2_id        BIGINT;
    v_deck2_id          BIGINT;

    v_question_id       BIGINT;
    v_answer_id         BIGINT;
    v_image_id          BIGINT;
BEGIN

    -- -------------------------------------------------------------------------
    -- Demo Users (from DemoUserSeeder.php)
    -- -------------------------------------------------------------------------

    INSERT INTO omc_users (name, email, password, email_verified_at, is_admin, is_enabled)
    VALUES ('demo', 'demo@example.com', extensions.crypt('demo', extensions.gen_salt('bf', 10)), NOW(), false, true)
    RETURNING id INTO v_user1_id;

    INSERT INTO omc_users (name, email, password, email_verified_at, is_admin, is_enabled)
    VALUES ('demoadmin', 'demoadmin@example.com', extensions.crypt('demoadmin', extensions.gen_salt('bf', 10)), NOW(), true, true)
    RETURNING id INTO v_user2_id;

    -- -------------------------------------------------------------------------
    -- Info records (from DemoSeeder.php)
    -- -------------------------------------------------------------------------

    INSERT INTO omc_info (title, text, is_pinned) VALUES
        ('Please note: demo resets happen without notice', 'All test data will be destroyed.', true),
        ('Welcome!', 'This is the OpenMultipleChoice demo instance. OpenMultipleChoice is a work in progress (and comes with stubs and bugs).', true);

    -- =========================================================================
    -- Demo Deck 1: OpenMultipleChoice Demo Deck
    -- =========================================================================

    INSERT INTO omc_subjects (name) VALUES ('Demo') RETURNING id INTO v_subject1_id;

    INSERT INTO omc_modules (name, subject_id) VALUES ('Demo', v_subject1_id) RETURNING id INTO v_module1_id;

    INSERT INTO omc_decks (name, description, module_id, access)
    VALUES (
        'OpenMultipleChoice Demo Deck',
        'You can use the demo deck to get an idea about how OMC works and looks like.',
        v_module1_id,
        'public-rw-listed'
    ) RETURNING id INTO v_deck1_id;

    -- Question 1: What is OpenMultipleChoice?
    INSERT INTO omc_questions (text, hint, comment)
    VALUES (
        'What is OpenMultipleChoice?',
        'It''s software ...',
        'This is a comment that has no purpose other than showing you that questions can have a comment for relevant administrative information.'
    ) RETURNING id INTO v_question_id;

    INSERT INTO omc_answers (text, question_id) VALUES ('A car model.', v_question_id);
    INSERT INTO omc_answers (text, hint, question_id)
        VALUES ('An open source web application for multiple choice exam exercises.', 'That is correct!', v_question_id)
        RETURNING id INTO v_answer_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('An ideology.', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('The title of the latest book by Siri Hustvedt.', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('A fruit.', v_question_id);
    UPDATE omc_questions SET correct_answer_id = v_answer_id WHERE id = v_question_id;

    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck1_id, v_question_id);

    INSERT INTO omc_images (path, comment, question_id)
    VALUES (
        'images/jF408jdMPdrgt1lNfC7Ubh6kYrE7X31dEHphUqWp.jpg',
        'Image CC BY-SA 3.0 Wikimedia Author "Jsfouche" https://commons.wikimedia.org/wiki/File:2_toed_sloth.jpg',
        v_question_id
    );

    -- Question 2: What is the license of OpenMultipleChoice?
    INSERT INTO omc_questions (text, hint)
    VALUES ('What is the license of OpenMultipleChoice?', 'GNU Affero General Public License')
    RETURNING id INTO v_question_id;

    INSERT INTO omc_answers (text, question_id) VALUES ('Beerware', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Apache 2.0', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('BSD', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('MIT', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('AGPL v3', v_question_id) RETURNING id INTO v_answer_id;
    UPDATE omc_questions SET correct_answer_id = v_answer_id WHERE id = v_question_id;

    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck1_id, v_question_id);

    -- Question 3: What programming language is OpenMultipleChoice written in?
    INSERT INTO omc_questions (text)
    VALUES ('What programming language is OpenMultipleChoice written in?')
    RETURNING id INTO v_question_id;

    INSERT INTO omc_answers (text, question_id) VALUES ('C', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Swift', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Go', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Python', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('PHP', v_question_id) RETURNING id INTO v_answer_id;
    UPDATE omc_questions SET correct_answer_id = v_answer_id WHERE id = v_question_id;

    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck1_id, v_question_id);

    -- Question 4: Which backend framework is used in OpenMultipleChoice?
    INSERT INTO omc_questions (text)
    VALUES ('Which backend framework is used in OpenMultipleChoice?')
    RETURNING id INTO v_question_id;

    INSERT INTO omc_answers (text, question_id) VALUES ('No framework.', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('CakePHP', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Laravel', v_question_id) RETURNING id INTO v_answer_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Symfony', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Laminas', v_question_id);
    UPDATE omc_questions SET correct_answer_id = v_answer_id WHERE id = v_question_id;

    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck1_id, v_question_id);

    -- Question 5: Which frontend framework is used in OpenMultipleChoice?
    INSERT INTO omc_questions (text)
    VALUES ('Which frontend framework is used in OpenMultipleChoice?')
    RETURNING id INTO v_question_id;

    INSERT INTO omc_answers (text, question_id) VALUES ('No framework.', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('React', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Vue', v_question_id);
    INSERT INTO omc_answers (text, question_id) VALUES ('Svelte', v_question_id) RETURNING id INTO v_answer_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Preact', v_question_id);
    UPDATE omc_questions SET correct_answer_id = v_answer_id WHERE id = v_question_id;

    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck1_id, v_question_id);

    -- =========================================================================
    -- Demo Deck 2: Sugars (Biochemistry)
    -- =========================================================================

    INSERT INTO omc_subjects (name) VALUES ('Biochemistry') RETURNING id INTO v_subject2_id;

    INSERT INTO omc_modules (name, subject_id) VALUES ('Biochemistry', v_subject2_id) RETURNING id INTO v_module2_id;

    INSERT INTO omc_decks (name, module_id, access)
    VALUES ('Sugars', v_module2_id, 'public-rw-listed')
    RETURNING id INTO v_deck2_id;

    -- Question 1: Glucose (card type)
    INSERT INTO omc_questions (type) VALUES ('card') RETURNING id INTO v_question_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Glucose', v_question_id);
    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck2_id, v_question_id);
    INSERT INTO omc_images (path, question_id)
    VALUES ('images/RFS3lDzW8ta1Ndm5NGSICy2BbmNbYDkkjXRCJNlf.png', v_question_id);

    -- Question 2: Galactose (card type)
    INSERT INTO omc_questions (type) VALUES ('card') RETURNING id INTO v_question_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Galactose', v_question_id);
    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck2_id, v_question_id);
    INSERT INTO omc_images (path, question_id)
    VALUES ('images/keIHhJWnbRyli3Kgq0c8pXQMhJmKmsb5MbySWR5P.png', v_question_id);

    -- Question 3: Mannose (card type)
    INSERT INTO omc_questions (type) VALUES ('card') RETURNING id INTO v_question_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Mannose', v_question_id);
    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck2_id, v_question_id);
    INSERT INTO omc_images (path, question_id)
    VALUES ('images/yiOgHY9jH2duPa5C0hxV1WDA1tWjP43u24Yr4Rbp.png', v_question_id);

    -- Question 4: Isomaltose (card type)
    INSERT INTO omc_questions (type) VALUES ('card') RETURNING id INTO v_question_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Isomaltose', v_question_id);
    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck2_id, v_question_id);
    INSERT INTO omc_images (path, question_id)
    VALUES ('images/HpkN0HppaRSkqIXlNCKa1Mv7jMUI66i4qktZz01n.png', v_question_id);

    -- Question 5: Lactose (card type)
    INSERT INTO omc_questions (type) VALUES ('card') RETURNING id INTO v_question_id;
    INSERT INTO omc_answers (text, question_id) VALUES ('Lactose', v_question_id);
    INSERT INTO omc_deck_question (deck_id, question_id) VALUES (v_deck2_id, v_question_id);
    INSERT INTO omc_images (path, question_id)
    VALUES ('images/WbZxVnP9fbmHdWZJGRtzinGExI90zqO3ygS469ft.png', v_question_id);

END;
$$;
