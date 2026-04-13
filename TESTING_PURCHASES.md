# Guide: Testing Purchases Locally with Dodo Payments

To test the full purchase flow (upgrade your user account to "Pro" or "Founding"), you need to handle **Webhooks**. Because Dodo Payments is on the internet and your server is on `localhost`, they cannot talk to each other directly without a tunnel.

## 1. Setup ngrok (The Tunnel)

`ngrok` creates a temporary public URL that forwards traffic to your local server.

1.  **Install ngrok**: If you don't have it, download from [ngrok.com](https://ngrok.com/download).
2.  **Start your backend**: Ensure your server is running (Port 3001).
    ```bash
    npm run backend
    ```
3.  **Start the tunnel**:
    ```bash
    ngrok http 3001
    ```
4.  **Copy the Forwarding URL**: It will look like `https://a1b2-c3d4.ngrok-free.app`.

---

## 2. Configure Dodo Dashboard

1.  Log in to your [Dodo Payments Dashboard](https://app.dodopayments.com).
2.  Go to **Developers** > **Webhooks**.
3.  Click **Add Endpoint**.
4.  **Endpoint URL**: Paste your ngrok URL and add `/api/webhooks/dodo`.
    - Example: `https://a1b2-c3d4.ngrok-free.app/api/webhooks/dodo`
5.  **Events to listen for**:
    - `payment.succeeded`
    - `subscription.cancelled`
    - `subscription.expired`
6.  **Secret**: Copy the **Webhook Secret** and paste it into `.env.local` as `DODO_WEBHOOK_SECRET`.

---

## 3. Environment Variables Check

Ensure your `.env.local` looks like this:

```bash
# Correct environment for sk_test_ keys
DODO_ENV=test_mode
DODO_API_KEY=sk_test_...
DODO_WEBHOOK_SECRET=whsec_...
```

---

## 4. Test a Purchase

1.  Open your app (`http://localhost:5173`).
2.  Click **Upgrade** or go to the **Pricing** section.
3.  Choose a plan. You should be redirected to Dodo.
4.  **Use Test Cards**: Dodo provides test numbers (e.g., `4242 4242 4242 4242`).
5.  Complete the payment.
6.  **Verify Webhook**: Check your `ngrok` terminal or the Dodo Dashboard to see the "payment.succeeded" event sent.
7.  **Check App**: Refresh your app. Your profile should now show the "Pro" or "Founding" badge!

---

## Troubleshooting

- **401 Unauthorized**: Your `DODO_WEBHOOK_SECRET` is wrong or missing.
- **404 Not Found**: Your ngrok URL is wrong or you forgot to add `/api/webhooks/dodo` at the end.
- **Payload Error**: Ensure your server is actually running on port 3001.
- **Manual Reset**: If you need to downgrade a user back to "free" for more testing, you can do so directly in the Supabase `profiles` table.
