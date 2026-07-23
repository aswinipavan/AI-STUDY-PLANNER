package com.aistudyplanner.controller;

import com.aistudyplanner.model.dto.request.PaymentOrderRequest;
import com.aistudyplanner.model.dto.request.PaymentVerifyRequest;
import com.aistudyplanner.model.dto.response.ApiResponse;
import com.aistudyplanner.model.dto.response.PaymentOrderResponse;
import com.aistudyplanner.model.dto.response.SubscriptionResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.security.CurrentStudent;
import com.aistudyplanner.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
@Tag(name = "Subscription", description = "Premium Subscription & Razorpay APIs")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @PostMapping("/order")
    @Operation(summary = "Create Razorpay Payment Order")
    public ResponseEntity<ApiResponse<PaymentOrderResponse>> createPaymentOrder(
            @CurrentStudent Student student,
            @Valid @RequestBody PaymentOrderRequest request) {
        log.info("Creating payment order for student: {}", student.getId());
        PaymentOrderResponse response = subscriptionService.createPaymentOrder(student.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "Order created successfully"));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify Payment and Activate Subscription")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> verifyAndActivateSubscription(
            @CurrentStudent Student student,
            @Valid @RequestBody PaymentVerifyRequest request) {
        log.info("Verifying payment for student: {}", student.getId());
        SubscriptionResponse response = subscriptionService.verifyAndActivateSubscription(student.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(response, "Subscription activated successfully"));
    }

    @GetMapping("/status")
    @Operation(summary = "Get current subscription status")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> getSubscriptionStatus(@CurrentStudent Student student) {
        log.info("Fetching subscription status for student: {}", student.getId());
        SubscriptionResponse response = subscriptionService.getSubscriptionStatus(student.getId());
        return ResponseEntity.ok(ApiResponse.success(response, "Subscription status fetched successfully"));
    }
}
