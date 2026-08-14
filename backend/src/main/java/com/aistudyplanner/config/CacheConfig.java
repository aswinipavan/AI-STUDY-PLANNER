package com.aistudyplanner.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        // Use Caffeine for bounded, efficient caching with automatic eviction
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("groq-tips");
        
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(100)              // Max 100 cached entries
                .expireAfterWrite(5, TimeUnit.HOURS)  // Expire after 5 hours
                .recordStats());               // Enable statistics
        
        return cacheManager;
    }
}


