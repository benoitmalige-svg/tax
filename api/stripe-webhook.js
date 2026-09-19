import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
      api: {
              bodyParser: false,
      },
};

function buffer(readable) {
      return new Promise((resolve, reject) => {
              const chunks = [];
              readable.on('data', (chunk) => chunks.push(chunk));
              readable.on('end', () => resolve(Buffer.concat(chunks)));
              readable.on('error', reject);
      });
}

async function addToBeehiiv(email) {
      const pubId = process.env.BEEHIIV_PUBLICATION_ID;
      const apiKey = process.env.BEEHIIV_API_KEY;
      const automationId = process.env.BEEHIIV_AUTOMATION_ID;

  console.log('DEBUG pubId present:', Boolean(pubId), 'apiKey present:', Boolean(apiKey), 'automationId present:', Boolean(automationId));

  const response = await fetch(
          `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
      {
                method: 'POST',
                headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                            email,
                            reactivate_existing: true,
                            send_welcome_email: false,
                            automation_ids: automationId ? [automationId] : [],
                }),
      }
        );

  const rawText = await response.text();
      console.log('DEBUG Beehiiv create status:', response.status);
      console.log('DEBUG Beehiiv create body:', rawText);

  if (!response.ok) {
          throw new Error(`Beehiiv create/update subscriber failed (${response.status}): ${rawText}`);
  }

  const data = JSON.parse(rawText);
      const subscriptionId = data && data.data && data.data.id;

  if (subscriptionId) {
          const tagResponse = await fetch(
                    `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/${subscriptionId}/tags`,
              {
                          method: 'POST',
                          headers: {
                                        Authorization: `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ tags: ['identity-tax-oct-purchased'] }),
              }
                  );

        const tagText = await tagResponse.text();
          console.log('DEBUG Beehiiv tag status:', tagResponse.status);
          console.log('DEBUG Beehiiv tag body:', tagText);
  }

  return data;
}

export default async function handler(req, res) {
      if (req.method !== 'POST') {
              return res.status(405).json({ error: 'Method not allowed' });
      }

  let event;

  try {
          const rawBody = await buffer(req);
          const signature = req.headers['stripe-signature'];
          event = stripe.webhooks.constructEvent(
                    rawBody,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                  );
  } catch (err) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const email =
                    (session.customer_details && session.customer_details.email) ||
                    session.customer_email;

        console.log('DEBUG checkout.session.completed email:', email);

        if (email) {
                  try {
                              await addToBeehiiv(email);
                  } catch (err) {
                              console.error('Beehiiv sync failed:', err);
                  }
        } else {
                  console.error('No email found on checkout session', session.id);
        }
  }

  res.status(200).json({ received: true });
}
