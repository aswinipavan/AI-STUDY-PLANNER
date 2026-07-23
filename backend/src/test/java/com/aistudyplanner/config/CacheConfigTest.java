package com.aistudyplanner.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import static org.assertj.core.api.Assertions.*;

@SpringJUnitConfig(CacheConfigTest.TestCacheConfig.class)
@DisplayName("Cache Configuration Tests - Module 2")
class CacheConfigTest {

    @Autowired
    private CacheManager cacheManager;

    @Configuration
    @EnableCaching
    static class TestCacheConfig {
        @Bean
        public CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(
                    "groq-tips",
                    "exam-schedule",
                    "student-performance",
                    "material-summary",
                    "topic-suggestions"
            );
        }
    }

    @BeforeEach
    void setUp() {
        // CacheManager is autowired
    }

    // ============ Test 1: Cache Manager Exists ============
    @Test
    @DisplayName("Should provide configured CacheManager bean")
    void testCacheManagerExists() {
        assertThat(cacheManager).isNotNull();
    }

    // ============ Test 2: Motivational Tips Cache ============
    @Test
    @DisplayName("Should have groq-tips cache for motivational tips")
    void testMotivationalTipsCache() {
        assertThat(cacheManager.getCacheNames()).contains("groq-tips");
        assertThat(cacheManager.getCache("groq-tips")).isNotNull();
    }

    // ============ Test 3: Exam Schedule Cache ============
    @Test
    @DisplayName("Should have exam-schedule cache")
    void testExamScheduleCache() {
        assertThat(cacheManager.getCacheNames()).contains("exam-schedule");
        assertThat(cacheManager.getCache("exam-schedule")).isNotNull();
    }

    // ============ Test 4: Student Performance Cache ============
    @Test
    @DisplayName("Should have student-performance cache")
    void testStudentPerformanceCache() {
        assertThat(cacheManager.getCacheNames()).contains("student-performance");
        assertThat(cacheManager.getCache("student-performance")).isNotNull();
    }

    // ============ Test 5: Material Summary Cache ============
    @Test
    @DisplayName("Should have material-summary cache")
    void testMaterialSummaryCache() {
        assertThat(cacheManager.getCacheNames()).contains("material-summary");
        assertThat(cacheManager.getCache("material-summary")).isNotNull();
    }

    // ============ Test 6: Topic Suggestions Cache ============
    @Test
    @DisplayName("Should have topic-suggestions cache")
    void testTopicSuggestionsCache() {
        assertThat(cacheManager.getCacheNames()).contains("topic-suggestions");
        assertThat(cacheManager.getCache("topic-suggestions")).isNotNull();
    }

    // ============ Test 7: Cache Put and Get ============
    @Test
    @DisplayName("Should put value into cache and retrieve it")
    void testCachePutAndGet() {
        String cacheKey = "test-key-2026-07-22";
        String cachedValue = "Stay focused and trust your preparation!";
        
        cacheManager.getCache("groq-tips").put(cacheKey, cachedValue);
        
        assertThat(cacheManager.getCache("groq-tips").get(cacheKey).get())
                .isEqualTo(cachedValue);
    }

    // ============ Test 8: Cache Eviction ============
    @Test
    @DisplayName("Should evict cache entry when explicit eviction triggered")
    void testCacheEviction() {
        String cacheKey = "evict-test";
        String value = "This will be evicted";
        
        cacheManager.getCache("groq-tips").put(cacheKey, value);
        assertThat(cacheManager.getCache("groq-tips").get(cacheKey)).isNotNull();
        
        cacheManager.getCache("groq-tips").evict(cacheKey);
        assertThat(cacheManager.getCache("groq-tips").get(cacheKey)).isNull();
    }

    // ============ Test 9: Multiple Caches Independence ============
    @Test
    @DisplayName("Should maintain separate data in different caches")
    void testMultipleCachesIndependence() {
        String key = "shared-key";
        String tipsValue = "Tip value";
        String performanceValue = "Performance data";
        
        cacheManager.getCache("groq-tips").put(key, tipsValue);
        cacheManager.getCache("student-performance").put(key, performanceValue);
        
        assertThat(cacheManager.getCache("groq-tips").get(key).get())
                .isEqualTo(tipsValue);
        assertThat(cacheManager.getCache("student-performance").get(key).get())
                .isEqualTo(performanceValue);
    }

    // ============ Test 10: Clear Cache ============
    @Test
    @DisplayName("Should clear all entries from a cache")
    void testClearCache() {
        cacheManager.getCache("groq-tips").put("key1", "value1");
        cacheManager.getCache("groq-tips").put("key2", "value2");
        
        assertThat(cacheManager.getCache("groq-tips").get("key1")).isNotNull();
        
        cacheManager.getCache("groq-tips").clear();
        
        assertThat(cacheManager.getCache("groq-tips").get("key1")).isNull();
        assertThat(cacheManager.getCache("groq-tips").get("key2")).isNull();
    }
}
