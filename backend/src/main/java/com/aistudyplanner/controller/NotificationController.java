package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.NotificationResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Notifications", description = "Smart Academic Notifications APIs")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get personalized smart academic notifications")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(@CurrentStudent Student student) {
        log.info("Fetching smart notifications for student: {}", student.getId());
        List<NotificationResponse> notifications = notificationService.getPersonalizedNotifications(student);
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications fetched successfully"));
    }
}
