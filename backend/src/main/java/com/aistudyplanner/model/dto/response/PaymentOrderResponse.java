package com.aistudyplanner.model.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponse {

    private String orderId;
    private Integer amount;
    private String currency;
    private String keyId;
}
