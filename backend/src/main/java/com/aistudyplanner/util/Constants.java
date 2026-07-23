package com.aistudyplanner.util;

/**
 * Application-wide constants for numbers and limits
 */
public class Constants {
    
    // Scheduling constants
    public static final int DAYS_PER_WEEK = 7;
    public static final int DAYS_IN_MONTH = 30;
    public static final int DAYS_IN_YEAR = 365;
    public static final int UPCOMING_EXAMS_WINDOW_DAYS = 30;
    
    // Study time constants
    public static final int MIN_SLOT_DURATION_MINUTES = 15;
    public static final int SLOT_DURATION_ROUNDING_MINUTES = 30;
    public static final int BUFFER_BETWEEN_SLOTS_MINUTES = 10;
    
    // AI and API constants
    public static final int MAX_CHAT_CONTEXT_WORDS = 500;
    public static final int MAX_CHAT_HISTORY_MESSAGES = 50;
    public static final int GROQ_RATE_LIMIT_PER_MINUTE = 60;
    public static final int GROQ_API_TIMEOUT_SECONDS = 30;
    public static final int GROQ_CONNECT_TIMEOUT_SECONDS = 5;
    
    // File upload constants
    public static final long MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;  // 50MB
    public static final String[] ALLOWED_FILE_TYPES = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "application/zip",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    };
    
    // Pagination constants
    public static final int DEFAULT_PAGE_SIZE = 50;
    public static final int MAX_PAGE_SIZE = 500;
    public static final int MIN_PAGE_SIZE = 1;
    
    // Rate limiting constants
    public static final double RATE_LIMIT_REQUESTS_PER_MINUTE = 10.0;
    
    // JWT constants
    public static final int JWT_EXPIRATION_HOURS = 24;
    
    // Subscription constants
    public static final int PREMIUM_MONTHLY_PRICE_PAISE = 29900;
    public static final int PREMIUM_YEARLY_PRICE_PAISE = 199900;
    public static final String DEFAULT_CURRENCY = "INR";
    
    // Default values
    public static final int DEFAULT_SUBJECT_DIFFICULTY = 3;
    public static final int DEFAULT_STUDY_STREAK = 0;
    public static final double DEFAULT_AVAILABLE_HOURS_PER_DAY = 4.0;
    public static final double DEFAULT_SUNDAY_STUDY_MULTIPLIER = 0.5;
    public static final double NORMAL_DAY_STUDY_MULTIPLIER = 1.0;
    
    // Chat constants
    public static final String CHAT_ROLE_USER = "user";
    public static final String CHAT_ROLE_ASSISTANT = "assistant";
    
    // Database cleanup
    public static final int CHAT_HISTORY_RETENTION_DAYS = 30;
    public static final int PERFORMANCE_SNAPSHOT_RETENTION_MONTHS = 12;
    
    private Constants() {
        // Utility class, not instantiable
    }
}
