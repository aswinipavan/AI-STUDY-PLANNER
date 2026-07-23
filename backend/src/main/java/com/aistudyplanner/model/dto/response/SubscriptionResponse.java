package com.aistudyplanner.model.dto.response;

import com.aistudyplanner.model.PaymentStatus;
import com.aistudyplanner.model.PlanType;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionResponse {
    private UUID id;
    private PlanType planType;
    private PaymentStatus status;
    private OffsetDateTime startedAt;
    private OffsetDateTime expiresAt;
}
