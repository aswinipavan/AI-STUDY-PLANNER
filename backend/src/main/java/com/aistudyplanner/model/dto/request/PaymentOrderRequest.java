package com.aistudyplanner.model.dto.request;

import com.aistudyplanner.model.PlanType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentOrderRequest {

    @NotNull(message = "Plan type must not be null")
    private PlanType planType;
}
