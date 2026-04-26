# AceTerus Flutter App — Claude Context

This is the Flutter mobile app for **AceTerus**, a production AI-powered education platform for Malaysian students. The web app is live at `https://aceterus.com`. This Flutter app shares the **exact same Supabase backend** — no backend changes are needed.

---

## 1. Supabase Backend

```
URL:      https://lsqkfzuymgkmvnudkktv.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcWtmenV5bWdrbXZudWRra3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDYzODUsImV4cCI6MjA3MTYyMjM4NX0.80RIsG8hhppe-BryKt7e3jGh40lS4FNHWkSaXvtPZmM
```

Initialise once in `main.dart`:
```dart
await Supabase.initialize(
  url: 'https://lsqkfzuymgkmvnudkktv.supabase.co',
  anonKey: '<anon key above>',
);
```

---

## 2. Database Schema

### `profiles`
| Column | Type | Notes |
|---|---|---|
| user_id | UUID PK | References auth.users |
| username | TEXT | Unique display name |
| avatar_url | TEXT | Public URL from `profile-images` bucket |
| cover_url | TEXT | Cover photo |
| bio | TEXT | |
| followers_count | INTEGER | Denormalised |
| following_count | INTEGER | Denormalised |
| is_admin | BOOLEAN | Admin users can manage quiz content |
| ace_coins | INTEGER | Gamification currency, starts at 1000 |

### `decks`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| description | TEXT | |
| subject | TEXT | e.g. "Sejarah", "Matematik" |
| created_by | UUID | Admin only |
| is_published | BOOLEAN | False = draft, not visible to students |
| quiz_type | TEXT | `'objective'` or `'subjective'` |
| category_id | UUID | FK → categories |

### `questions`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| deck_id | UUID FK | |
| text | TEXT | |
| explanation | TEXT | Shown after answering |
| image_url | TEXT | Optional question image |
| order | INTEGER | Sort order in deck |
| marks | INTEGER | Used for subjective grading |

### `answers`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| question_id | UUID FK | |
| text | TEXT | |
| is_correct | BOOLEAN | |
| image_url | TEXT | Optional answer image |

### `quiz_results`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| deck_id | UUID FK | |
| deck_name | TEXT | Snapshot name |
| category | TEXT | |
| score | NUMERIC | Percentage 0-100 |
| correct_count | INTEGER | |
| wrong_count | INTEGER | |
| skipped_count | INTEGER | |
| total_count | INTEGER | |
| questions_data | JSONB | Full per-question result snapshot |
| completed_at | TIMESTAMPTZ | |

### `quiz_performance_results`
AI analysis result cached after each attempt.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| quiz_result_id | UUID FK | |
| user_id | UUID FK | |
| deck_id | UUID FK | |
| analysis | JSONB | See edge function response format |
| completed_at | TIMESTAMPTZ | |

### `posts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| content | TEXT | |
| image_url | TEXT | Legacy single image |
| tags | TEXT[] | |
| likes_count | INTEGER | Denormalised |
| comments_count | INTEGER | Denormalised |

### `post_images`
Multiple images per post (carousel).
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| file_url | TEXT |
| position | INTEGER |

### `follows`
| Column | Type |
|---|---|
| follower_id | UUID |
| followed_id | UUID |

### `post_likes`
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| user_id | UUID FK |

### `comments`
| Column | Type |
|---|---|
| id | UUID PK |
| post_id | UUID FK |
| user_id | UUID FK |
| content | TEXT |
| created_at | TIMESTAMPTZ |

### `chat_messages`
| Column | Type |
|---|---|
| id | UUID PK |
| sender_id | UUID FK |
| recipient_id | UUID FK |
| content | TEXT |
| read | BOOLEAN |
| created_at | TIMESTAMPTZ |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | Recipient |
| actor_id | UUID FK | Who triggered it |
| type | TEXT | `follow`, `like`, `comment`, `quiz_published`, `streak_milestone`, `streak_broken`, `goal_reminder` |
| post_id | UUID FK | Nullable |
| read | BOOLEAN | |

### `goals`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| text | TEXT | |
| date | DATE | Calendar date |
| deadline | TIMESTAMPTZ | Optional |
| priority | TEXT | `low`, `medium`, `high` |
| completed | BOOLEAN | |

### `student_streaks`
| Column | Type |
|---|---|
| id | UUID PK |
| user_id | UUID FK |
| current_streak | INTEGER |
| last_action_date | DATE |

### `student_schools` (Education history — multi-entry, LinkedIn style)
Each row = one education period. A user can have multiple rows.
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | No UNIQUE constraint — multiple rows allowed |
| school_id | UUID FK | FK → schools reference table |
| school_name | TEXT | Text fallback |
| grade | TEXT | e.g. `'Form 5'`, `'Degree Year 2'` |
| curricular | TEXT | Stream or field of study |
| school_type | TEXT | e.g. `'SMK'`, `'Universiti Awam'` |
| school_location | TEXT | City, State |
| class_name | TEXT | Class name or programme/major |
| start_year | SMALLINT | Optional |
| end_year | SMALLINT | Optional. NULL when is_current = true |
| is_current | BOOLEAN | Only one row per user should be true |

### `schools` (Reference table)
| Column | Type |
|---|---|
| id | UUID PK |
| name | TEXT |
| type | TEXT |
| level | TEXT | `primary`, `secondary`, `tertiary` |
| state | TEXT |
| district | TEXT |
| city | TEXT |

### Storage Buckets
| Bucket | Public | Purpose |
|---|---|---|
| `profile-images` | ✅ | Avatars and cover photos |
| `quiz-images` | ✅ | Question and answer images |
| `user-uploads` | ❌ | Study materials |

---

## 3. Authentication Flow

1. Email/password sign-in or Google OAuth via Supabase Auth
2. On first sign-in: a `profiles` row is auto-created with `ace_coins = 1000`
3. Check `profiles.username` — if null/empty → user is new → send to **Onboarding**
4. Onboarding = 3 steps: set username → upload avatar → select school
5. After onboarding → main app

```dart
// Listen for auth changes
Supabase.instance.client.auth.onAuthStateChange.listen((data) {
  final session = data.session;
  if (session == null) {
    // go to /auth
  } else {
    // check profile.username — if null → /onboarding, else → /feed
  }
});
```

---

## 4. Edge Functions

All AI features are Supabase Edge Functions (Deno runtime). Call them with the user's JWT — no API keys needed on the client. **All functions require Authorization header.**

### `mascot-chat`
AI tutoring chatbot. Persona: "Ace", a star-shaped mascot, friendly, Malaysian education focused.

**Request:**
```json
{
  "message": "Apa itu fotosintesis?",
  "history": [
    { "role": "user", "text": "Hello" },
    { "role": "model", "text": "Hi! I'm Ace." }
  ]
}
```
**Response:**
```json
{ "reply": "Fotosintesis ialah proses..." }
```
- Model: `gemini-2.5-flash-lite`
- Temperature: 0.7, maxTokens: 512
- Responds in BM or English matching the user's language

### `quiz-performance-analyzer`
Generates AI feedback after a quiz attempt.

**Request:**
```json
{
  "current": {
    "score": 72,
    "correct_count": 18,
    "wrong_count": 5,
    "skipped_count": 2,
    "questions_data": [
      { "text": "...", "is_correct": true, "was_skipped": false }
    ]
  },
  "history": [ /* prior quiz_results rows for same deck */ ]
}
```
**Response:**
```json
{
  "overall_trend": "improving",
  "performance_summary": "Prestasi anda meningkat...",
  "weak_areas": ["Bab 3 Nasionalisme"],
  "strong_areas": ["Bab 1 Tamadun Awal"],
  "improvement_tips": ["Ulang kaji...", "Cuba latihan...", "Fokus pada..."],
  "comparison_note": "Lebih baik 12% berbanding percubaan lepas"
}
```
- All output in Bahasa Malaysia
- Temperature: 0.4

### `subjective-quiz-grader`
Grades free-text answers. Used for `quiz_type = 'subjective'` decks.

**Request:**
```json
{
  "questions": [
    {
      "question": "Terangkan sebab kejatuhan empayar Melaka.",
      "modelAnswer": "Serangan Portugis pada 1511...",
      "studentAnswer": "Portugis menyerang...",
      "maxMarks": 4
    }
  ]
}
```
**Response:**
```json
[
  { "marksEarned": 3, "isCorrect": true, "feedback": "Jawapan baik..." }
]
```
- `isCorrect` = true if `marksEarned / maxMarks >= 0.70`
- Temperature: 0.1 (near-deterministic)

### `pdf-quiz-generator`
Generates quiz questions from a PDF file.

**Request:** `multipart/form-data` with a `file` field (PDF) and optional `questionCount` (max 40).

**Response:**
```json
{
  "questions": [
    {
      "text": "What is...",
      "answers": [
        { "text": "Option A", "is_correct": true },
        { "text": "Option B", "is_correct": false }
      ]
    }
  ]
}
```

### `text-quiz-parser`
Parses unstructured text into quiz questions.

**Request:**
```json
{ "text": "1. What is...\na) ...\nb) ...\nAnswer: a" }
```
**Response:** Same shape as pdf-quiz-generator.

**Calling edge functions from Flutter:**
```dart
final response = await Supabase.instance.client.functions.invoke(
  'mascot-chat',
  body: { 'message': userMessage, 'history': chatHistory },
);
final reply = response.data['reply'] as String;
```

---

## 5. Design System

> **Critical:** The Flutter app must match the web app's visual identity exactly. Do not deviate from these colors, typography, or design language.

### Brand Colors
```dart
class AceColors {
  // Primary palette
  static const cyan   = Color(0xFF3BD6F5);
  static const blue   = Color(0xFF2F7CFF);
  static const indigo = Color(0xFF2E2BE5);
  static const ink    = Color(0xFF0F172A); // primary text, borders, shadows

  // Accent
  static const pop    = Color(0xFFFF7A59); // orange-red accent, streaks, CTA
  static const sun    = Color(0xFFFFD65C); // yellow/gold

  // Soft backgrounds (tinted fills for cards, pills)
  static const skySoft    = Color(0xFFDDF3FF); // light blue fill
  static const blueSoft   = Color(0xFFC8DEFF);
  static const indigoSoft = Color(0xFFD6D4FF);
  static const mintSoft   = Color(0xFFD1FAE5);
  static const lavender   = Color(0xFFEDE9FE);
  static const peach      = Color(0xFFFFE4D6);
  static const lemon      = Color(0xFFFEF9C3);
  static const rose       = Color(0xFFFFE4E6);
  static const cloud      = Color(0xFFF3FAFF); // page background
}
```

### Typography
- **Display / headings:** `Baloo 2` (weights: 500, 600, 700, 800) — used for all bold titles, button labels, section headers
- **Body / UI text:** `Nunito` (weights: 400, 500, 600, 700, 800, 900)

Add to `pubspec.yaml`:
```yaml
dependencies:
  google_fonts: ^6.x

# Usage:
# GoogleFonts.baloo2(fontWeight: FontWeight.w800)
# GoogleFonts.nunito(fontWeight: FontWeight.w600)
```

### Design Language — "Neo-Brutalism"
The web app uses a consistent neo-brutalist card style throughout. **Every card and interactive element must follow this style:**

**Card style:**
- Solid `2.5px` border, color `#0F172A` (ink)
- Hard drop shadow: `3px 3px 0px #0F172A` (no blur, offset only)
- Rounded corners: `20px` radius for cards, `14px` for smaller components, `full` (pill) for buttons/tags
- White background for cards

**Flutter equivalents:**
```dart
// Card decoration
BoxDecoration(
  color: Colors.white,
  borderRadius: BorderRadius.circular(20),
  border: Border.all(color: AceColors.ink, width: 2.5),
  boxShadow: [
    BoxShadow(
      color: AceColors.ink,
      offset: Offset(3, 3),
      blurRadius: 0, // hard shadow, no blur
    ),
  ],
)

// Button style (pill)
BoxDecoration(
  color: AceColors.blue,
  borderRadius: BorderRadius.circular(100),
  border: Border.all(color: AceColors.ink, width: 2.5),
  boxShadow: [
    BoxShadow(color: AceColors.ink, offset: Offset(3, 3), blurRadius: 0),
  ],
)

// On press: translate +1px, shadow shrinks to (1,1)
// On hover/idle: translate -2px, shadow grows to (5,5)
```

**Color-coded education levels (used in Profile):**
```dart
// primary   → green   (#F0FDF4 bg, #16a34a text)
// secondary → blue    (#DDF3FF bg, #2F7CFF text)
// preuni    → indigo  (#D6D4FF bg, #2E2BE5 text)
// diploma   → amber   (#FEF3C7 bg, #d97706 text)
// degree    → sky     (#E0F2FE bg, #0369a1 text)
// postgrad  → purple  (#EDE9FE bg, #6D28D9 text)
```

**School type badge colors:**
```dart
const schoolTypeBadgeColors = {
  'SMK':                  (bg: Color(0xFFDDF3FF), text: Color(0xFF2F7CFF)),
  'SBP':                  (bg: Color(0xFFD6D4FF), text: Color(0xFF2E2BE5)),
  'MRSM':                 (bg: Color(0xFFFEF3C7), text: Color(0xFF92400e)),
  'Universiti Awam':      (bg: Color(0xFFDBEAFE), text: Color(0xFF1D4ED8)),
  'Universiti Swasta':    (bg: Color(0xFFEDE9FE), text: Color(0xFF6D28D9)),
  'Kolej Matrikulasi':    (bg: Color(0xFFD6D4FF), text: Color(0xFF2E2BE5)),
  'Sekolah Swasta':       (bg: Color(0xFFFFE4E6), text: Color(0xFFFF7A59)),
  // etc. — follow same pattern
};
```

### Mascot
- "Ace" is a star-shaped animated character
- Lottie animations used on web — use `lottie` Flutter package
- The mascot has a mood/message queue system: appears with tips after quiz completion, streak milestones, goal reminders

---

## 6. Feature Map

### Screen → Route
| Screen | Route | Auth Required |
|---|---|---|
| Landing | `/` | No (redirect to /feed if logged in) |
| Sign In / Sign Up | `/auth` | No |
| Onboarding (3 steps) | `/onboarding` | Yes (new users only) |
| Feed | `/feed` | Yes |
| Quiz | `/quiz` | Yes |
| Discover | `/discover` | Yes |
| Profile (own) | `/profile` | Yes |
| Profile (other) | `/profile/:userId` | Yes |
| Materials | `/materials` | Yes |
| Chat | `/chat` | Yes |
| Admin | `/admin` | Yes + `is_admin = true` |

### Key Features

**Quiz System:**
- 3 quiz types:
  1. `objective` — multiple choice / checkbox, auto-graded client-side
  2. `subjective` — free text, graded by `subjective-quiz-grader` edge function
  3. Boss Raid — gamified quiz with health/damage mechanics
- Flow: Categories → Decks → Active quiz → Submit → AI Analysis
- Questions are shuffled client-side before display
- Support for image questions and image answers
- Bookmarking questions during quiz
- After submit: call `quiz-performance-analyzer`, cache result in `quiz_performance_results`

**Gamification:**
- `ace_coins` — currency, 1000 on signup
- Daily streaks — tracked in `student_streaks`, reset after 3 days of inactivity
- Streak leaderboard
- Confetti / celebration animation on quiz completion
- Mascot messages triggered by events (quiz done, streak milestone, goal set)

**Social Feed:**
- Shows posts from followed users only
- Post text + multi-image carousel
- Like (heart), comment, follow
- Suggested users sidebar

**Profile:**
- Avatar (circle, cropped) + cover photo (wide banner)
- Bio
- Stats: posts, followers, following, streak
- Education history (LinkedIn-style vertical timeline)
  - Multiple entries, sorted: primary → secondary → pre-u → diploma → degree → postgrad
  - Each entry: school name, grade, stream, class, type badge, location, year range
  - `is_current = true` shows "Present" badge
- Quiz history
- Own posts grid

**Chat:**
- Direct messages between mutual followers only
- Realtime via Supabase realtime subscriptions
- Unread count badges

**Materials:**
- Upload study notes (PDF, images)
- Public/private toggle
- Like and comment on materials

**Goals:**
- Daily goal setting with priority (low/medium/high)
- Optional deadline + reminder
- Completion toggle

---

## 7. Business Logic

### New User Flow
```
signUp() → profile auto-created (ace_coins=1000) → check profile.username
  → null → navigate to Onboarding
  → set username → upload avatar → select school → mark complete
  → navigate to Feed
```

### Onboarding Steps
1. Set username (unique)
2. Upload profile photo (crop to circle, upload to `profile-images/{user_id}/avatar.jpg`)
3. Select school (optional — from `schools` reference table)

### Quiz Grading (Objective)
- Client-side: compare selected answer IDs against `answers.is_correct`
- Calculate `correct_count`, `wrong_count`, `skipped_count`, `score` (%)
- Save to `quiz_results` table
- Then call `quiz-performance-analyzer` edge function

### Education Level → Grade Mapping
```dart
String deriveLevelFromGrade(String grade) {
  if (grade.startsWith('Standard')) return 'primary';
  if (RegExp(r'^Form [1-5]$').hasMatch(grade)) return 'secondary';
  if (grade.startsWith('Form 6') || grade == 'Foundation' || grade == 'Matrikulasi') return 'preuni';
  if (grade.startsWith('Diploma')) return 'diploma';
  if (grade.startsWith('Degree')) return 'degree';
  if (grade == "Master's" || grade == 'PhD') return 'postgrad';
  return '';
}
```

### Grade Options Per Level
```dart
const gradeOptions = {
  'primary':   ['Standard 1','Standard 2','Standard 3','Standard 4','Standard 5','Standard 6'],
  'secondary': ['Form 1','Form 2','Form 3','Form 4','Form 5'],
  'preuni':    ['Form 6 (Lower)','Form 6 (Upper)','Foundation','Matrikulasi'],
  'diploma':   ['Diploma Year 1','Diploma Year 2','Diploma Year 3'],
  'degree':    ['Degree Year 1','Degree Year 2','Degree Year 3','Degree Year 4','Degree Year 5'],
  'postgrad':  ["Master's", 'PhD'],
};
```

### School Type → DB Level Filter
```dart
String? schoolDBLevel(String grade) {
  if (grade.startsWith('Standard')) return 'primary';
  if (grade.startsWith('Form')) return 'secondary';
  return 'tertiary';
}
```

### is_current Constraint
When saving an education entry with `is_current = true`, first update all other entries for that user to `is_current = false`:
```dart
await supabase
  .from('student_schools')
  .update({'is_current': false})
  .eq('user_id', userId)
  .neq('id', entryId); // skip if adding new (no entryId yet)
```

---

## 8. Realtime Subscriptions

Chat messages and notifications use Supabase realtime:
```dart
supabase
  .from('chat_messages')
  .stream(primaryKey: ['id'])
  .eq('recipient_id', userId)
  .listen((rows) { /* update unread count */ });

supabase
  .from('notifications')
  .stream(primaryKey: ['id'])
  .eq('user_id', userId)
  .listen((rows) { /* update notification badge */ });
```

---

## 9. Recommended Flutter Packages

```yaml
dependencies:
  supabase_flutter: ^2.x
  flutter_riverpod: ^2.x          # State management
  riverpod_annotation: ^2.x
  go_router: ^14.x                 # Navigation
  google_fonts: ^6.x               # Baloo 2 + Nunito
  cached_network_image: ^3.x       # All remote images
  image_picker: ^1.x               # Avatar upload, post images
  image_cropper: ^7.x              # Circle crop for avatar
  file_picker: ^8.x                # PDF upload for quiz generator
  lottie: ^3.x                     # Mascot animations
  confetti: ^0.7.x                 # Quiz completion celebration
  fl_chart: ^0.x                   # Performance charts
  shared_preferences: ^2.x         # Local settings
  intl: ^0.19.x                    # Date formatting
  timeago: ^3.x                    # "2 minutes ago" style timestamps
  flutter_svg: ^2.x                # SVG assets if needed
  local_auth: ^2.x                 # Face ID / fingerprint (optional)

dev_dependencies:
  build_runner: ^2.x
  riverpod_generator: ^2.x
  custom_lint: ^0.x
  riverpod_lint: ^2.x
```

---

## 10. Project Structure

```
lib/
├── main.dart                    # Supabase init, app entry
├── core/
│   ├── supabase/
│   │   └── supabase_client.dart # Singleton accessor
│   ├── router/
│   │   └── app_router.dart      # go_router config with auth guard
│   ├── theme/
│   │   ├── ace_colors.dart      # All brand colors (Section 5)
│   │   ├── ace_text_styles.dart # Baloo2 + Nunito styles
│   │   └── ace_theme.dart       # ThemeData
│   └── widgets/
│       ├── ace_card.dart        # Reusable neo-brutalist card
│       ├── ace_button.dart      # Pill button with hard shadow
│       └── ace_badge.dart       # Type/level badge pill
├── features/
│   ├── auth/
│   │   ├── auth_page.dart
│   │   └── auth_provider.dart
│   ├── onboarding/
│   │   └── onboarding_page.dart  # 3-step wizard
│   ├── feed/
│   │   ├── feed_page.dart
│   │   ├── post_card.dart
│   │   └── feed_provider.dart
│   ├── quiz/
│   │   ├── quiz_page.dart        # Category → Deck → Questions → Analysis
│   │   ├── quiz_provider.dart
│   │   └── quiz_analysis_card.dart
│   ├── profile/
│   │   ├── profile_page.dart
│   │   ├── education_section.dart # LinkedIn-style timeline
│   │   └── profile_provider.dart
│   ├── chat/
│   │   ├── chat_page.dart
│   │   └── chat_provider.dart    # Realtime stream
│   ├── discover/
│   │   └── discover_page.dart
│   ├── materials/
│   │   └── materials_page.dart
│   └── mascot/
│       ├── mascot_widget.dart    # Floating Lottie mascot
│       ├── mascot_chat_sheet.dart# Bottom sheet chat
│       └── mascot_provider.dart  # Message queue
└── models/
    ├── profile.dart
    ├── deck.dart
    ├── question.dart
    ├── quiz_result.dart
    ├── post.dart
    ├── chat_message.dart
    └── student_school.dart
```

---

## 11. Core Shared Widget Patterns

These components are used everywhere in the web app and must be built as shared Flutter widgets:

### AceCard
```dart
Container(
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(20),
    border: Border.all(color: const Color(0xFF0F172A), width: 2.5),
    boxShadow: const [BoxShadow(
      color: Color(0xFF0F172A), offset: Offset(3, 3), blurRadius: 0,
    )],
  ),
  child: child,
)
```

### AcePillButton
Rounded full, colored fill, hard shadow, lifts on press:
```dart
GestureDetector(
  onTapDown: (_) => setState(() => _pressed = true),
  onTapUp:   (_) => setState(() => _pressed = false),
  child: AnimatedContainer(
    duration: const Duration(milliseconds: 100),
    transform: Matrix4.translationValues(0, _pressed ? 1 : -1, 0),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(100),
      border: Border.all(color: const Color(0xFF0F172A), width: 2.5),
      boxShadow: [BoxShadow(
        color: const Color(0xFF0F172A),
        offset: _pressed ? const Offset(1,1) : const Offset(3,3),
        blurRadius: 0,
      )],
    ),
  ),
)
```

### AceBadge (type/school label)
```dart
Container(
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
  decoration: BoxDecoration(
    color: bgColor,
    borderRadius: BorderRadius.circular(100),
    border: Border.all(color: const Color(0xFF0F172A), width: 2),
    boxShadow: const [BoxShadow(
      color: Color(0xFF0F172A), offset: Offset(1,1), blurRadius: 0,
    )],
  ),
  child: Text(label, style: GoogleFonts.baloo2(
    fontWeight: FontWeight.w800, fontSize: 11, color: textColor,
  )),
)
```

---

## 12. Important Notes for Claude

- **Never change the Supabase URL or anon key** — they point to the live production database
- **Never generate a different color scheme** — use `AceColors` exactly as defined
- **Never use Material default styling** — all cards, buttons, and inputs must use the neo-brutalist style (solid ink border + hard offset shadow)
- **Font must be Baloo 2 for headings/buttons and Nunito for body text** — no system fonts in UI elements
- The web codebase is at `https://github.com/AceTerus/AceTerusRebrand` if you need to reference web implementations
- All AI features call Supabase Edge Functions — never call the Gemini API directly from the Flutter app
- RLS is enforced at the database level — the app never needs to manually filter by `user_id` on reads (Supabase handles it), but must include `user_id` on writes
- `is_admin` check: always read from `profiles.is_admin` — never hardcode or trust client-side admin flags for anything sensitive
