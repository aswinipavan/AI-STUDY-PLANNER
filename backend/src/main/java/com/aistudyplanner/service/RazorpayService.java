package com.aistudyplanner.service;

import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayService {

    private final RazorpayClient razorpayClient;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    public JSONObject createOrder(int amountPaise, String currency, String receiptId) {
        long startTime = System.currentTimeMillis();
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", receiptId);
            orderRequest.put("payment_capture", 1);
            
            Order order = razorpayClient.orders.create(orderRequest);
            long duration = System.currentTimeMillis() - startTime;
            log.info("Razorpay order created successfully. OrderId: {}, Amount: {} {}, Duration: {}ms", 
                order.get("id"), amountPaise, currency, duration);
            return order.toJson();
        } catch (RazorpayException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("Razorpay order creation failed after {}ms. Amount: {} {}, Error message: {}", 
                duration, amountPaise, currency, e.getMessage(), e);
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage(), e);
        }
    }

    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            log.error("Error verifying payment signature", e);
            return false;
        }
    }

    public JSONObject getPaymentDetails(String paymentId) {
        try {
            Payment payment = razorpayClient.payments.fetch(paymentId);
            return payment.toJson();
        } catch (RazorpayException e) {
            log.error("Error fetching payment details", e);
            throw new RuntimeException("Failed to fetch payment details", e);
        }
    }
}
