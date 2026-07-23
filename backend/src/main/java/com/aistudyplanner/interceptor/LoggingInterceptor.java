package com.aistudyplanner.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@Slf4j
public class LoggingInterceptor implements HandlerInterceptor {

    private static final String START_TIME_ATTR = "startTime";
    private static final String START_MEMORY_ATTR = "startMemory";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        long startTime = System.currentTimeMillis();
        long startMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        request.setAttribute(START_TIME_ATTR, startTime);
        request.setAttribute(START_MEMORY_ATTR, startMemory);

        String studentId = "anonymous";
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName() != null) {
            studentId = authentication.getName(); 
        }

        log.debug("→ [{}] {} {} | Student: {} | Content-Length: {}", 
                request.getMethod(), request.getRequestURI(), 
                request.getQueryString() != null ? "?" + request.getQueryString() : "",
                studentId,
                request.getContentLength() > 0 ? request.getContentLength() + " bytes" : "N/A");

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Long startTime = (Long) request.getAttribute(START_TIME_ATTR);
        Long startMemory = (Long) request.getAttribute(START_MEMORY_ATTR);
        
        if (startTime != null) {
            long duration = System.currentTimeMillis() - startTime;
            long memoryUsed = (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) - startMemory;
            
            if (response.getStatus() >= 400) {
                log.warn("← [{}] {} | Status: {} | Duration: {}ms | Memory: {}KB", 
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    duration,
                    memoryUsed / 1024);
            } else {
                log.debug("← [{}] {} | Status: {} | Duration: {}ms | Memory: {}KB", 
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    duration,
                    memoryUsed / 1024);
            }
            
            if (ex != null) {
                log.error("Exception in request: {} {}", request.getMethod(), request.getRequestURI(), ex);
            }
        }
    }
}

