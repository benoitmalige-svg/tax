import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

try {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      { price: process.env.STRIPE_PRICE_BOOK_ONLY, quantity: 1 },
      ],
    metadata: {
      product: 'identity-tax-book-only',
    },
    success_url: `${req.headers.origin}/?success=true`,
    cancel_url: `${req.headers.origin}/?canceled=true`,
    custom_text: {
      submit: {
        message: '$60 one-time for the complete private digital pre-release of The Identity Tax. No subscription, no October experience, no recurring charge.',
      },
    },
  });

  res.status(200).json({ url: session.url });
} catch (err) {
  console.error(err);
  res.status(500).json({ error: 'Unable to start checkout' });
}
}
