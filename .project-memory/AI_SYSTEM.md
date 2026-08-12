# AI Study Planner - AI System Map

This document outlines the artificial intelligence architecture, configuration, prompts, and caching mechanisms implemented in the platform.

---

## 1. Core AI Engine & Model Mismatch

### Configuration & Endpoint
The AI functionality is encapsulated within `GroqService.java` and configured in `GroqConfig.java`. Under the hood, the application does **not** query Groq's endpoints (`api.groq.com/openai`). Instead, it targets the **Google Gemini Developer API** (Google AI Studio):
- **Base API URL:** `https://generativelanguage.googleapis.com/v1beta/models/groq-1.5-flash:generateContent`
- **Authentication Method:** Appends `?key={api-key}` as a query parameter (typical of Google developer API keys).
- **Request Structure:** Sends Google-style JSON body structure:
  ```json
  {
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "PROMPT_HERE" }]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 1000
    }
  }
  ```

### CRITICAL DISCOVERY: Model Name Mismatch
> [!WARNING]
> The configured model in `GroqConfig.java` is `groq-1.5-flash`.
> Google Gemini API does **not** host a model named `groq-1.5-flash`. The model name should be `gemini-1.5-flash`.
> While unit tests pass because they mock the HTTP RestTemplate responses completely, calling this service live against Google Gemini will return a `404 Not Found` or `400 Bad Request` indicating the model was not found. This is a critical runtime bug.

---

## 2. Platform Optimizations: Caching & Rate Limiting

### Rate Limiting
To prevent quota exhaustion on free-tier API keys, `GroqService` implements a rolling window rate limiter:
- **Limit:** Max 30 requests per minute (`GROQ_RATE_LIMIT_PER_MINUTE` configured in `Constants.java`).
- **Mechanism:** A `ConcurrentHashMap<Long, AtomicInteger>` tracks the count of requests for the current epoch-minute.
- **Handling:** If exceeded, it throws `RateLimitException`, which maps to HTTP `429 Too Many Requests`.

### Response Caching
Daily operations like motivational quotes are cached to avoid redundant API hits:
- **Mechanism:** `@Cacheable(value = "groq-tips", key = "#date")` on `getMotivationalTip`.
- **Cache Eviction:** Local cache stores tip responses per-date, resolving immediately for subsequent users.

---

## 3. Implemented Prompts and Use Cases

### 3.1. Subject Marks Analyzer (`analyzeMarks`)
- **Objective:** Evaluates current performance and provides improvement strategies.
- **Prompt:**
  ```text
  You are an academic advisor AI. A student has these subject scores: {subjectAverages}.
  Analyze their performance and provide:
  1. Overall assessment (2 sentences)
  2. Top 3 subjects needing immediate attention with specific improvement strategies
  3. Study time recommendation per weak subject per day
  4. One motivational insight
  Keep response under 300 words. Be direct and actionable.
  ```

### 3.2. Context-Aware Student Chat (`chat`)
- **Objective:** Dynamic conversation assisting with academic concepts and step-by-step problem-solving.
- **Context Management:** Iterates through chat history backward, capping history to a maximum of 500 words to respect token length limits.
- **System Prompt:**
  ```text
  You are an AI study assistant and an expert problem solver helping a college student.
  When presented with a problem (math, coding, logical, or scientific), you must analyze it step-by-step,
  explain the underlying concepts clearly, and provide a fully worked-out solution.
  For general academic doubts, suggest study strategies and provide motivation. Keep answers concise and student-friendly.
  Previous conversation:
  {historyContext}
  Student's question: {userMessage}
  ```

### 3.3. Timetable Slot Topic Generation (`generateTopicSuggestion`)
- **Objective:** Proactively determines what the student should study during a specific slot.
- **Prompt:**
  ```text
  For student studying {subjectName} with {avgPercentage}% average,
  suggest a specific study topic for today's {durationMinutes} minute session.
  Be concise (max 10 words). Exam in {daysToExam} days.
  ```

### 3.4. Study Material Summarizer (`summarizeMaterial`)
- **Objective:** Generates concise digests of uploaded notes.
- **Text Capping:** Substrings text content to a maximum of 10,000 characters before execution.
- **Prompt:**
  ```text
  Summarize this study material in 5 bullet points (max 150 words total): {textContent}
  ```

### 3.5. Document Subject Categorizer (`categorizeMaterial`)
- **Objective:** Automatically places files in the correct subject folder on upload.
- **Text Capping:** Substrings text previews to 2,000 characters.
- **Prompt:**
  ```text
  Based on this file name and content preview, identify the college subject name (e.g., 'Data Structures', 'Engineering Mathematics'). Reply with only the subject name, nothing else.
  File: {fileName}. Preview: {textPreview}
  ```

### 3.6. Structured Exam Study Plan (`generateExamPlan`)
- **Objective:** Generates revision schedules based on upcoming exams.
- **Prompt:**
  ```text
  Create a day-by-day exam preparation plan for {studentName}.
  Upcoming exams: {exams}
  Subject averages: {subjectAverages}
  Provide a structured plan with: daily goals, priority topics, revision strategy.
  Keep it under 400 words.
  ```
