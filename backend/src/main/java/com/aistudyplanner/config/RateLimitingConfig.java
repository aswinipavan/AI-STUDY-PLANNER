package com.aistudyplanner.config;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.util.concurrent.RateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * Rate limiting configuration using Guava RateLimiter
 * Prevents brute force attacks and DoS
 */
@Component
@Slf4j
@SuppressWarnings("null")
public class RateLimitingConfig {

    private final LoadingCache<String, RateLimiter> limiters;

    public RateLimitingConfig() {
        limiters = CacheBuilder.newBuilder()
                .maximumSize(100000)
                .expireAfterAccess(10, TimeUnit.MINUTES)
                .build(new CacheLoader<String, RateLimiter>() {
                    @Override
                    public RateLimiter load(String key) {
                        // 60 requests per minute per IP/key (increased for development/testing)
                        // Production should use environment variable for this value
                        return RateLimiter.create(60.0 / 60.0);
                    }
                });
    }

    /**
     * Check if request should be allowed
     * @param key identifier (e.g., IP address or user ID)
     * @return true if allowed, false if rate limited
     */
    public boolean allowRequest(String key) {
        try {
            RateLimiter rateLimiter = limiters.get(key);
            return rateLimiter.tryAcquire();
        } catch (ExecutionException e) {
            log.error("Rate limiter error for key: {}", key, e);
            return true; // Fail open - allow request if limiter fails
        }
    }

    /**
     * Get remaining requests for a key
     * @param key identifier
     * @return approximate number of remaining requests
     */
    public double getRemainingRequests(String key) {
        try {
            RateLimiter rateLimiter = limiters.get(key);
            return rateLimiter.getRate();
        } catch (ExecutionException e) {
            return 10.0;
        }
    }
}
