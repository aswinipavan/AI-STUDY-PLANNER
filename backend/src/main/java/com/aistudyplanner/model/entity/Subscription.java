package com.aistudyplanner.model.entity;

import com.aistudyplanner.model.PaymentStatus;
import com.aistudyplanner.model.PlanType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Version
    @Column(name = "version")
    private Long version;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", unique = true, nullable = false)
    @ToString.Exclude
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", length = 50)
    private PlanType planType;

    @Column(name = "razorpay_order_id", length = 100)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 100)
    private String razorpayPaymentId;

    @Column(name = "razorpay_subscription_id", length = 100)
    private String razorpaySubscriptionId;

    @Column(name = "amount_paise")
    private Integer amountPaise;

    @Builder.Default
    @Column(name = "currency", length = 10)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30)
    private PaymentStatus status;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}

