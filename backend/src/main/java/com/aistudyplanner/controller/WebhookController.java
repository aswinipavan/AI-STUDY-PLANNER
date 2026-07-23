package com.aistudyplanner.controller;

import com.aistudyplanner.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Public Webhooks for external integrations")
public class WebhookController {

    private final SubscriptionService subscriptionService;

    @PostMapping("/razorpay")
    @Operation(summary = "Razorpay Webhook Endpoint")
    public ResponseEntity<Void> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        log.info("Received Razorpay webhook");
        subscriptionService.handleWebhook(payload, signature);
        return ResponseEntity.ok().build();
    }
}
