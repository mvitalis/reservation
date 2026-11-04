// routes/stripe.js
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

// Initialize Stripe with your Secret Key (use test secret key starting with sk_test_)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Map your plans to Stripe Price IDs (Replace with your actual price IDs from Stripe Dashboard)
const PLAN_PRICES = {
  pro: 'price_1PxxxxxxxxxxxxxxPRO',      // e.g. $19/month
  business: 'price_1PxxxxxxxxxxxxBIZ', // e.g. $49/month
};

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan, userId, userEmail } = req.body;

    const priceId = PLAN_PRICES[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Store user ID to link subscription to Supabase user upon success
      metadata: {
        userId: userId,
        plan: plan,
      },
      success_url: `${process.env.CLIENT_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${process.env.CLIENT_URL}/pricing?status=cancelled`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe Checkout Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;