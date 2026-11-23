package com.quickCourt.backend.service;

import com.quickCourt.backend.dto.RazorpayOrderResponse;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);

    @Value("${razorpay.key.id:}")
    private String keyId;

    @Value("${razorpay.key.secret:}")
    private String keySecret;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    public boolean isConfigured() {
        if (keyId == null || keySecret == null) {
            return false;
        }
        String id = keyId.trim();
        String secret = keySecret.trim();
        if (id.isBlank() || secret.isBlank()) {
            return false;
        }
        if (id.equalsIgnoreCase("YOUR_KEY_ID") || secret.equalsIgnoreCase("YOUR_KEY_SECRET")
                || id.contains("placeholder") || secret.contains("placeholder")
                || id.contains("YourKey") || secret.contains("YourKey")) {
            return false;
        }
        return (id.startsWith("rzp_test_") || id.startsWith("rzp_live_")) && id.length() >= 14 && secret.length() >= 8;
    }

    public boolean isWebhookConfigured() {
        if (webhookSecret == null) {
            return false;
        }
        String ws = webhookSecret.trim();
        if (ws.isBlank() || ws.equalsIgnoreCase("YOUR_WEBHOOK_SECRET")
                || ws.contains("placeholder") || ws.contains("YourWebhook")) {
            return false;
        }
        return ws.length() >= 8;
    }

    public String getKeyId() {
        return keyId != null ? keyId.trim() : "";
    }

    public String getKeySecret() {
        return keySecret != null ? keySecret.trim() : "";
    }

    public String getWebhookSecret() {
        return webhookSecret != null ? webhookSecret.trim() : "";
    }

    /**
     * Creates a Razorpay Order for the given booking and trusted amount.
     */
    public RazorpayOrderResponse createOrder(Long bookingId, BigDecimal amountInRupees, String receipt) {
        long amountInPaise = amountInRupees.multiply(BigDecimal.valueOf(100)).longValue();

        if (!isConfigured()) {
            log.warn("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing). Order creation skipped.");
            return new RazorpayOrderResponse(
                    null,
                    amountInPaise,
                    amountInRupees,
                    "INR",
                    null,
                    bookingId,
                    null,
                    false,
                    "Razorpay payment gateway is not configured. Please supply valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            );
        }

        try {
            RazorpayClient client = new RazorpayClient(keyId.trim(), keySecret.trim());
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", receipt != null ? receipt : "rcpt_" + bookingId + "_" + System.currentTimeMillis());
            orderRequest.put("payment_capture", 1);

            JSONObject notes = new JSONObject();
            notes.put("bookingId", String.valueOf(bookingId));
            orderRequest.put("notes", notes);

            Order order = client.orders.create(orderRequest);
            String orderId = order.get("id");

            log.info("Razorpay order created: {} for bookingId: {}, amount: {} paise", orderId, bookingId, amountInPaise);

            return new RazorpayOrderResponse(
                    orderId,
                    amountInPaise,
                    amountInRupees,
                    "INR",
                    keyId.trim(),
                    bookingId,
                    null,
                    true,
                    "Order created successfully"
            );
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for bookingId: {}: {}", bookingId, e.getMessage(), e);
            throw new IllegalArgumentException("Razorpay order creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Verifies the cryptographic HMAC-SHA256 payment signature returned by Razorpay Checkout.
     */
    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        if (orderId == null || paymentId == null || signature == null) {
            return false;
        }
        if (!isConfigured()) {
            log.warn("Cannot verify payment signature: Razorpay secret is not configured.");
            return false;
        }

        String payload = orderId.trim() + "|" + paymentId.trim();
        return verifyHmacSha256(payload, signature.trim(), keySecret.trim());
    }

    /**
     * Verifies the Razorpay Webhook signature using the raw request body and webhook secret.
     */
    public boolean verifyWebhookSignature(String requestBody, String signature) {
        if (requestBody == null || signature == null) {
            return false;
        }
        if (!isWebhookConfigured()) {
            log.warn("Cannot verify webhook signature: RAZORPAY_WEBHOOK_SECRET is not configured.");
            return false;
        }

        return verifyHmacSha256(requestBody, signature.trim(), webhookSecret.trim());
    }

    /**
     * Constant-time HMAC-SHA256 verification to prevent timing attacks.
     */
    public boolean verifyHmacSha256(String data, String expectedSignatureHex, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(hash);

            return MessageDigest.isEqual(
                    computedHex.toLowerCase().getBytes(StandardCharsets.UTF_8),
                    expectedSignatureHex.toLowerCase().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("Error computing HMAC-SHA256 signature: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Fetches payment details directly from the Razorpay API to confirm status, amount and currency.
     */
    public com.razorpay.Payment fetchPayment(String paymentId) {
        if (!isConfigured()) {
            return null;
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId.trim(), keySecret.trim());
            return client.payments.fetch(paymentId);
        } catch (RazorpayException e) {
            log.warn("Could not fetch payment details from Razorpay API for {}: {}", paymentId, e.getMessage());
            return null;
        }
    }

    /**
     * Explicitly captures an authorized Razorpay payment.
     */
    public com.razorpay.Payment capturePayment(String paymentId, long amountInPaise, String currency) {
        if (!isConfigured()) {
            return null;
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId.trim(), keySecret.trim());
            JSONObject captureRequest = new JSONObject();
            captureRequest.put("amount", amountInPaise);
            captureRequest.put("currency", currency != null ? currency : "INR");
            return client.payments.capture(paymentId, captureRequest);
        } catch (RazorpayException e) {
            log.error("Failed to capture Razorpay payment {}: {}", paymentId, e.getMessage());
            throw new IllegalArgumentException("Razorpay capture failed: " + e.getMessage(), e);
        }
    }
}
