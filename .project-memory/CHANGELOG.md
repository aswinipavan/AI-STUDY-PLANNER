# Changelog

## 2026-07-22
- **Files changed:** `pom.xml`, `.env`, `application.properties`, `GroqService.java`, `MaterialRepository.java`, `ChatHistoryRepository.java`, `MarksRepository.java`, `ExamRepository.java`, `FirebaseConfig.java`, `ManualTokenGenTest.java`.
- **Reason:** Resolve startup failures, implement caching, and add pagination.
- **Summary:** Upgraded dependencies, fixed DB credentials, implemented `@Cacheable`, migrated `List<T>` to `Page<T>` in repositories, and fixed Firebase initialization.
- **Impact:** Backend now successfully boots and connects to the database. Ready for frontend integration.
