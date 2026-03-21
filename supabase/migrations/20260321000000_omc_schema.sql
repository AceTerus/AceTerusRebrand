-- =============================================================================
-- OMC Schema Migration
-- Translates all openmultiplechoice Laravel migrations into omc_* prefixed
-- PostgreSQL tables for Supabase. Circular FKs are resolved via ALTER TABLE.
-- =============================================================================

-- omc_users
CREATE TABLE omc_users (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at   TIMESTAMPTZ NULL,
    password            VARCHAR(255) NULL,
    remember_token      VARCHAR(100) NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    -- from omc_initial
    is_admin            BOOLEAN NOT NULL DEFAULT false,
    is_moderator        BOOLEAN NOT NULL DEFAULT false,
    -- from users_legacy_id_column (despite the mis-name, maps to users table)
    legacy_question_id  BIGINT NULL,
    -- from users_public_name_column
    public_name         VARCHAR(255) UNIQUE NULL,
    -- from user_is_enabled_column
    is_enabled          BOOLEAN NOT NULL DEFAULT true,
    -- from user_last_login_column
    last_login_at       TIMESTAMPTZ NULL
);

-- omc_subjects
CREATE TABLE omc_subjects (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    name        VARCHAR(500) NOT NULL UNIQUE
);

-- omc_modules
CREATE TABLE omc_modules (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    name        VARCHAR(500) NOT NULL UNIQUE,
    subject_id  BIGINT NULL REFERENCES omc_subjects(id)
);

-- omc_cases (needed before omc_questions for the case_id column)
CREATE TABLE omc_cases (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    text            VARCHAR(4000) NULL,
    legacy_case_id  BIGINT NULL
);

-- omc_decks (parent_session_id FK added later after omc_sessions is created)
CREATE TABLE omc_decks (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    name                VARCHAR(500) NOT NULL,
    exam_at             DATE NULL,
    description         VARCHAR(5000) NULL,
    module_id           BIGINT NULL REFERENCES omc_modules(id),
    user_id             BIGINT NULL REFERENCES omc_users(id),
    -- from decks_access_column; default changed to 'private' per deck_make_access_default_private
    access              VARCHAR(100) NULL DEFAULT 'private',
    -- from decks_is_ephemeral_column
    is_ephemeral        BOOLEAN NOT NULL DEFAULT false,
    -- from decks_is_archived_column
    is_archived         BOOLEAN NOT NULL DEFAULT false
    -- parent_session_id added via ALTER TABLE below
);

-- omc_questions (correct_answer_id FK added later after omc_answers is created)
CREATE TABLE omc_questions (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    text                VARCHAR(6000) NULL,
    hint                VARCHAR(2000) NULL,
    comment             VARCHAR(2000) NULL,
    type                VARCHAR(255) NULL DEFAULT 'mc',
    correct_answer_id   BIGINT NULL,  -- FK to omc_answers added below
    -- from questions_add_legacy_id
    legacy_question_id  BIGINT NULL,
    -- from questions_is_invalid_column
    is_invalid          BOOLEAN NOT NULL DEFAULT false,
    -- from questions_needs_review_column
    needs_review        BOOLEAN NOT NULL DEFAULT false,
    -- from create_cases_table_and_mapping (no FK constraint in original)
    case_id             BIGINT NULL
);

-- omc_answers
CREATE TABLE omc_answers (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    text                VARCHAR(4000) NULL,
    hint                VARCHAR(2000) NULL,
    question_id         BIGINT NOT NULL REFERENCES omc_questions(id) ON DELETE CASCADE,
    -- from answers_answer_percentage
    answer_percentage   INTEGER NULL
);

-- Now add the deferred FK from omc_questions.correct_answer_id → omc_answers
ALTER TABLE omc_questions
    ADD CONSTRAINT fk_omc_questions_correct_answer
    FOREIGN KEY (correct_answer_id) REFERENCES omc_answers(id) ON DELETE SET NULL;

-- omc_images
CREATE TABLE omc_images (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ NULL,
    path        VARCHAR(250) NOT NULL,
    comment     VARCHAR(500) NULL,
    question_id BIGINT NULL REFERENCES omc_questions(id) ON DELETE SET NULL
);

-- omc_deck_question
CREATE TABLE omc_deck_question (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deck_id     BIGINT NOT NULL REFERENCES omc_decks(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES omc_questions(id)
);

-- omc_sessions (parent_session_id self-FK added below)
CREATE TABLE omc_sessions (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    name                VARCHAR(500) NOT NULL,
    public              BOOLEAN NOT NULL DEFAULT false,
    deck_id             BIGINT NOT NULL REFERENCES omc_decks(id) ON DELETE CASCADE,
    current_question_id BIGINT NULL REFERENCES omc_questions(id) ON DELETE SET NULL,
    user_id             BIGINT NULL REFERENCES omc_users(id),
    -- parent_session_id self-FK added below
    parent_session_id   BIGINT NULL
);

-- Self-referential FK for omc_sessions
ALTER TABLE omc_sessions
    ADD CONSTRAINT fk_omc_sessions_parent
    FOREIGN KEY (parent_session_id) REFERENCES omc_sessions(id);

-- Now add parent_session_id column + FK to omc_decks
ALTER TABLE omc_decks
    ADD COLUMN parent_session_id BIGINT NULL;
ALTER TABLE omc_decks
    ADD CONSTRAINT fk_omc_decks_parent_session
    FOREIGN KEY (parent_session_id) REFERENCES omc_sessions(id);

-- omc_info (renamed from 'news' in original)
CREATE TABLE omc_info (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    title       VARCHAR(200) NOT NULL,
    text        TEXT NOT NULL,
    -- from info_is_pinned_column
    is_pinned   BOOLEAN NOT NULL DEFAULT false
);

-- omc_answer_choices
CREATE TABLE omc_answer_choices (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    help_used   BOOLEAN NOT NULL DEFAULT false,
    question_id BIGINT NOT NULL REFERENCES omc_questions(id) ON DELETE CASCADE,
    answer_id   BIGINT NULL REFERENCES omc_answers(id) ON DELETE CASCADE,
    is_correct  BOOLEAN NOT NULL DEFAULT false,
    session_id  BIGINT NOT NULL REFERENCES omc_sessions(id) ON DELETE CASCADE
);

-- omc_messages
CREATE TABLE omc_messages (
    id                          BIGSERIAL PRIMARY KEY,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    text                        TEXT NULL,
    question_id                 BIGINT NOT NULL REFERENCES omc_questions(id) ON DELETE CASCADE,
    author_id                   BIGINT NULL REFERENCES omc_users(id),
    parent_message_id           BIGINT NULL REFERENCES omc_messages(id),
    legacy_message_id           BIGINT NULL,
    legacy_parent_message_id    BIGINT NULL,
    legacy_author_name          VARCHAR(500) NULL,
    -- from messages_is_anonymous_column
    is_anonymous                BOOLEAN NOT NULL DEFAULT true,
    -- from message_is_deleted_column
    is_deleted                  BOOLEAN NOT NULL DEFAULT false
);

-- omc_user_settings
CREATE TABLE omc_user_settings (
    id                              BIGSERIAL PRIMARY KEY,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ DEFAULT NOW(),
    last_subject_id                 BIGINT NOT NULL DEFAULT 0,
    last_module_id                  BIGINT NOT NULL DEFAULT 0,
    user_id                         BIGINT NOT NULL REFERENCES omc_users(id),
    -- from user_settings_session_show_sidebar_column
    session_show_sidebar            BOOLEAN NOT NULL DEFAULT true,
    -- from user_settings_session_exam_mode_column
    session_exam_mode               BOOLEAN NOT NULL DEFAULT false,
    -- from user_settings_session_shuffle_answers_column
    session_shuffle_answers         BOOLEAN NOT NULL DEFAULT false,
    -- from user_settings_session_multiple_attempts_column
    session_multiple_answer_tries   BOOLEAN NOT NULL DEFAULT true,
    -- from user_settings_session_show_answer_stats
    session_show_answer_stats       BOOLEAN NOT NULL DEFAULT true,
    -- from user_settings_session_show_progress_bar
    session_show_progress_bar       BOOLEAN NOT NULL DEFAULT true,
    -- from user_settings_last_new_session_deck_kind
    last_new_session_deck_kind      VARCHAR(255) NOT NULL DEFAULT 'public-rw-listed'
);

-- omc_deck_submissions
CREATE TABLE omc_deck_submissions (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deck_id     BIGINT NOT NULL REFERENCES omc_decks(id),
    user_id     BIGINT NOT NULL REFERENCES omc_users(id)
);

-- omc_thumbs (morphs('thumbable') → thumbable_id + thumbable_type)
CREATE TABLE omc_thumbs (
    id              BIGSERIAL PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    type            VARCHAR(10) NOT NULL,
    user_id         BIGINT NOT NULL REFERENCES omc_users(id),
    thumbable_id    BIGINT NOT NULL,
    thumbable_type  VARCHAR(255) NOT NULL
);

-- omc_magic_gifs
CREATE TABLE omc_magic_gifs (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ NULL,
    path        VARCHAR(250) NOT NULL,
    name        VARCHAR(250) NOT NULL
);

-- omc_admin_settings_signup
CREATE TABLE omc_admin_settings_signup (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    settings    JSONB NOT NULL
);

-- omc_registration_tokens
CREATE TABLE omc_registration_tokens (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    token       VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ DEFAULT NOW()
);

-- omc_deck_case
CREATE TABLE omc_deck_case (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deck_id     BIGINT NOT NULL REFERENCES omc_decks(id) ON DELETE CASCADE,
    case_id     BIGINT NOT NULL REFERENCES omc_cases(id)
);

-- omc_deck_bookmark (composite PK, no surrogate id)
CREATE TABLE omc_deck_bookmark (
    deck_id     BIGINT NOT NULL REFERENCES omc_decks(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES omc_users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (deck_id, user_id)
);
