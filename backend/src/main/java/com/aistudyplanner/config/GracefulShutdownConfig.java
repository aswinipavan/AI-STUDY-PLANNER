package com.aistudyplanner.config;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;

import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.TimeUnit;

/**
 * Graceful shutdown configuration for async and scheduled tasks
 */
@Configuration
@Slf4j
public class GracefulShutdownConfig {

    @Autowired(required = false)
    private ThreadPoolTaskExecutor taskExecutor;

    @Autowired(required = false)
    private ThreadPoolTaskScheduler taskScheduler;

    /**
     * Cleanup on application shutdown
     */
    @PreDestroy
    public void shutdownGracefully() {
        log.info("Starting graceful shutdown...");
        
        if (taskExecutor != null) {
            log.info("Shutting down TaskExecutor...");
            taskExecutor.shutdown();
            try {
                if (taskExecutor.getThreadPoolExecutor().awaitTermination(10, TimeUnit.SECONDS)) {
                    log.info("TaskExecutor shutdown gracefully");
                } else {
                    log.warn("TaskExecutor forced shutdown after timeout");
                    taskExecutor.getThreadPoolExecutor().shutdownNow();
                }
            } catch (InterruptedException e) {
                log.error("Error shutting down TaskExecutor", e);
                taskExecutor.getThreadPoolExecutor().shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        if (taskScheduler != null) {
            log.info("Shutting down TaskScheduler...");
            taskScheduler.shutdown();
            try {
                if (taskScheduler.getScheduledExecutor().awaitTermination(10, TimeUnit.SECONDS)) {
                    log.info("TaskScheduler shutdown gracefully");
                } else {
                    log.warn("TaskScheduler forced shutdown after timeout");
                    taskScheduler.getScheduledExecutor().shutdownNow();
                }
            } catch (InterruptedException e) {
                log.error("Error shutting down TaskScheduler", e);
                taskScheduler.getScheduledExecutor().shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        
        log.info("Graceful shutdown complete");
    }
}
