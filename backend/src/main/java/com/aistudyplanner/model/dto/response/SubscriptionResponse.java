package com.aistudyplanner.model.dto.response;

import com.aistudyplanner.model.PaymentStatus;
import com.aistudyplanner.model.PlanType;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    @JsonProperty("isPremium")
    public boolean isPremium() {
        return planType != null 
                && planType != PlanType.FREE 
                && status == PaymentStatus.PAID
                && expiresAt != null 
                && expiresAt.isAfter(OffsetDateTime.now());
    }
}
