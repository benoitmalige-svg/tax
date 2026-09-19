import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

  try {
        const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                line_items: [
                  { price: process.env.STRIPE_PRICE_ENROLLMENT, quantity: 1 }, // $30 one-time
                  { price: process.env.STRIPE_PRICE_MEMBERSHIP, quantity: 1 }, // $49/month
                        ],
                subscription_data: {
                          trial_end: 1793545200, // Nov 1, 2026, 10:00 AM America/New_York
                },
                success_url: `${req.headers.origin}/?success=true`,
                cancel_url: `${req.headers.origin}/?canceled=true`,
        });

      res.status(200).json({ url: session.url });
  } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Unable to start checkout' });
  }
}
