# Backend Test Execution Report

**Framework**: JUnit 5 / Spring Boot Test / Maven Surefire  
**Execution Timestamp**: August 28, 2026, 05:13:32 PM (2026-08-28T11:43:32Z)  
**Git Commit SHA**: `15a41330e8dd8ea719281580c67806b18f9fb710` (Branch: `feat/master-ai-tutor-and-timetable-overhaul`)  
**Environment**: Java `openjdk version "17.0.19" 2026-04-21` | OS `Windows 11 (ARM64)`  

## Summary Metrics

| Metric | Value |
| :--- | :--- |
| **Total Tests** | **263** |
| **Passed** | **255** |
| **Failed** | **0** |
| **Skipped** | **8** |
| **Pass Rate** | **96.96%** |
| **Duration** | **85.9s** |

## Test Suites Detail

| Suite / Class Name | Total | Passed | Failed | Skipped | Time (s) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `com.aistudyplanner.LocalPersistenceVerificationTest` | 1 | 1 | 0 | 0 | 1.051s |
| `com.aistudyplanner.ManualTokenGenTest` | 1 | 0 | 0 | 1 | 0.0s |
| `com.aistudyplanner.config.CacheConfigTest` | 10 | 10 | 0 | 0 | 5.072s |
| `com.aistudyplanner.config.SecurityConfigTest` | 13 | 9 | 0 | 4 | 47.077s |
| `com.aistudyplanner.controller.AuthControllerTest` | 5 | 5 | 0 | 0 | 2.622s |
| `com.aistudyplanner.controller.MaterialControllerTest` | 21 | 21 | 0 | 0 | 1.843s |
| `com.aistudyplanner.integration.BackendFullFlowIntegrationTest` | 2 | 2 | 0 | 0 | 9.321s |
| `com.aistudyplanner.integration.ExamIntegrationTest` | 2 | 2 | 0 | 0 | 0.294s |
| `com.aistudyplanner.integration.UploadIntegrationTest` | 4 | 4 | 0 | 0 | 6.737s |
| `com.aistudyplanner.migration.FlywayPostgresMigrationTest` | 3 | 0 | 0 | 3 | 0.001s |
| `com.aistudyplanner.security.FirebaseTokenFilterTest` | 16 | 16 | 0 | 0 | 1.043s |
| `com.aistudyplanner.security.JwtTokenProviderTest` | 15 | 15 | 0 | 0 | 1.276s |
| `com.aistudyplanner.service.AdaptiveScheduleServiceTest` | 8 | 8 | 0 | 0 | 1.272s |
| `com.aistudyplanner.service.AiAssistantPromptTest` | 2 | 2 | 0 | 0 | 0.225s |
| `com.aistudyplanner.service.AuthServiceTest` | 6 | 6 | 0 | 0 | 0.043s |
| `com.aistudyplanner.service.GroqServiceTest` | 20 | 20 | 0 | 0 | 0.175s |
| `com.aistudyplanner.service.MaterialSubjectFilterTest` | 4 | 4 | 0 | 0 | 0.168s |
| `com.aistudyplanner.service.PerformanceServiceTest` | 6 | 6 | 0 | 0 | 0.303s |
| `com.aistudyplanner.service.StorageServiceTest` | 8 | 8 | 0 | 0 | 0.099s |
| `com.aistudyplanner.service.StudentProfilePersistenceTest` | 6 | 6 | 0 | 0 | 0.055s |
| `com.aistudyplanner.service.StudyTimeWindowTest` | 17 | 17 | 0 | 0 | 0.022s |
| `com.aistudyplanner.service.TimetableHorizonAndDetailsTest` | 4 | 4 | 0 | 0 | 0.057s |
| `com.aistudyplanner.service.TimetableServiceHorizonTest` | 5 | 5 | 0 | 0 | 0.072s |
| `com.aistudyplanner.service.TimetableServiceNlpTest` | 1 | 1 | 0 | 0 | 0.026s |
| `com.aistudyplanner.service.TimetableServiceScenarioTest` | 1 | 1 | 0 | 0 | 0.026s |
| `com.aistudyplanner.service.TimetableStudyPeriodTest` | 14 | 14 | 0 | 0 | 0.121s |
| `com.aistudyplanner.service.ai.AiProviderGatewayTest` | 0 | 0 | 0 | 0 | 0.244s |
| `com.aistudyplanner.service.ai.AiProviderGatewayTest$FallbackTriggers` | 18 | 18 | 0 | 0 | 0.063s |
| `com.aistudyplanner.service.ai.provider.AgentRouterProviderTest` | 22 | 22 | 0 | 0 | 0.355s |
| `com.aistudyplanner.service.ai.provider.GroqProviderTest` | 18 | 18 | 0 | 0 | 5.17s |
| `com.aistudyplanner.service.nlp.DocumentIntelligenceTest` | 10 | 10 | 0 | 0 | 1.063s |
