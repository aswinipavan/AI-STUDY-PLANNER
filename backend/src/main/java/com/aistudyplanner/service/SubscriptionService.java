package com.aistudyplanner.service;

import com.aistudyplanner.exception.AlreadySubscribedException;
import com.aistudyplanner.exception.PaymentVerificationException;
import com.aistudyplanner.exception.ResourceNotFoundException;
import com.aistudyplanner.model.PaymentStatus;
import com.aistudyplanner.model.PlanType;
import com.aistudyplanner.model.dto.request.PaymentOrderRequest;
import com.aistudyplanner.model.dto.request.PaymentVerifyRequest;
import com.aistudyplanner.model.dto.response.PaymentOrderResponse;
import com.aistudyplanner.model.dto.response.SubscriptionResponse;
import com.aistudyplanner.model.entity.Student;
import com.aistudyplanner.model.entity.Subscription;
import com.aistudyplanner.repository.StudentRepository;
import com.aistudyplanner.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final StudentRepository studentRepository;
    private final RazorpayService razorpayService;

    public static final int PREMIUM_MONTHLY = com.aistudyplanner.util.Constants.PREMIUM_MONTHLY_PRICE_PAISE;
    public static final int PREMIUM_YEARLY = com.aistudyplanner.util.Constants.PREMIUM_YEARLY_PRICE_PAISE;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Transactional
    public PaymentOrderResponse createPaymentOrder(UUID studentId, PaymentOrderRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Optional<Subscription> existingSub = subscriptionRepository.findByStudentId(studentId);
        if (existingSub.isPresent() && existingSub.get().getExpiresAt() != null 
                && existingSub.get().getExpiresAt().isAfter(OffsetDateTime.now())) {
            throw new AlreadySubscribedException("You already have an active premium subscription.");
        }

        int amount = request.getPlanType() == PlanType.PREMIUM_MONTHLY ? PREMIUM_MONTHLY : PREMIUM_YEARLY;
        String currency = "INR";
        String receiptId = "receipt_" + studentId.toString().substring(0, 8);

        JSONObject order = razorpayService.createOrder(amount, currency, receiptId);
        String orderId = order.getString("id");

        Subscription subscription = existingSub.orElse(new Subscription());
        subscription.setStudent(student);
        subscription.setPlanType(request.getPlanType());
        subscription.setRazorpayOrderId(orderId);
        subscription.setAmountPaise(amount);
        subscription.setCurrency(currency);
        subscription.setStatus(PaymentStatus.CREATED);

        subscriptionRepository.save(subscription);

        return PaymentOrderResponse.builder()
                .orderId(orderId)
                .amount(amount)
                .currency(currency)
                .keyId(keyId)
                .build();
    }

    @Transactional
    public SubscriptionResponse verifyAndActivateSubscription(UUID studentId, PaymentVerifyRequest request) {
        boolean isValid = razorpayService.verifyPaymentSignature(
                request.getRazorpayOrderId(), 
                request.getRazorpayPaymentId(), 
                request.getRazorpaySignature()
        );

        if (!isValid) {
            throw new PaymentVerificationException("Invalid payment signature.");
        }

        Subscription subscription = subscriptionRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription order not found"));

        if (!subscription.getStudent().getId().equals(studentId)) {
            throw new IllegalArgumentException("Subscription does not belong to student");
        }

        subscription.setStatus(PaymentStatus.PAID);
        subscription.setRazorpayPaymentId(request.getRazorpayPaymentId());
        
        OffsetDateTime now = OffsetDateTime.now();
        subscription.setStartedAt(now);
        
        if (subscription.getPlanType() == PlanType.PREMIUM_MONTHLY) {
            subscription.setExpiresAt(now.plusDays(30));
        } else {
            subscription.setExpiresAt(now.plusDays(365));
        }

        Student student = subscription.getStudent();
        student.setIsPremium(true);
        studentRepository.save(student);
        
        subscription = subscriptionRepository.save(subscription);

        return toSubscriptionResponse(subscription);
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscriptionStatus(UUID studentId) {
        Optional<Subscription> subscriptionOpt = subscriptionRepository.findByStudentId(studentId);
        
        if (subscriptionOpt.isEmpty()) {
            // User has never subscribed - return FREE status
            return SubscriptionResponse.builder()
                    .planType(PlanType.FREE)
                    .status(PaymentStatus.CREATED) // or null
                    .build();
        }
        
        Subscription subscription = subscriptionOpt.get();
        return toSubscriptionResponse(subscription);
    }

    @Transactional
    public void handleWebhook(String payload, String signature) {
        log.info("Received Razorpay Webhook");
        try {
            JSONObject webhookData = new JSONObject(payload);
            String event = webhookData.getString("event");
            JSONObject eventData = webhookData.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
            
            String paymentId = eventData.getString("id");
            String orderId = eventData.getString("order_id");

            
            if ("payment.authorized".equals(event) || "payment.captured".equals(event)) {
                Subscription subscription = subscriptionRepository.findByRazorpayOrderId(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Subscription order not found"));
                
                subscription.setStatus(PaymentStatus.PAID);
                subscription.setRazorpayPaymentId(paymentId);
                
                OffsetDateTime now = OffsetDateTime.now();
                subscription.setStartedAt(now);
                
                if (subscription.getPlanType() == PlanType.PREMIUM_MONTHLY) {
                    subscription.setExpiresAt(now.plusDays(30));
                } else {
                    subscription.setExpiresAt(now.plusDays(365));
                }
                
                Student student = subscription.getStudent();
                student.setIsPremium(true);
                studentRepository.save(student);
                subscriptionRepository.save(subscription);
                
                log.info("Payment webhook processed successfully. Order: {}, Payment: {}", orderId, paymentId);
                
            } else if ("payment.failed".equals(event)) {
                Subscription subscription = subscriptionRepository.findByRazorpayOrderId(orderId)
                        .orElseThrow(() -> new ResourceNotFoundException("Subscription order not found"));
                
                subscription.setStatus(PaymentStatus.CANCELLED);
                subscriptionRepository.save(subscription);
                
                log.warn("Payment failed for order: {}", orderId);
            }
        } catch (Exception e) {
            log.error("Failed to process Razorpay webhook", e);
            throw new RuntimeException("Webhook processing failed", e);
        }
    }

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void checkAndExpireSubscriptions() {
        List<Subscription> subscriptions = subscriptionRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now();

        for (Subscription sub : subscriptions) {
            if (sub.getStatus() == PaymentStatus.PAID && sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(now)) {
                sub.setStatus(PaymentStatus.CANCELLED);
                Student student = sub.getStudent();
                student.setIsPremium(false);
                
                studentRepository.save(student);
                subscriptionRepository.save(sub);
                log.info("Expired subscription for student: {}", student.getId());
            }
        }
    }

    private SubscriptionResponse toSubscriptionResponse(Subscription subscription) {
        return SubscriptionResponse.builder()
                .id(subscription.getId())
                .planType(subscription.getPlanType())
                .status(subscription.getStatus())
                .startedAt(subscription.getStartedAt())
                .expiresAt(subscription.getExpiresAt())
                .build();
    }
}
