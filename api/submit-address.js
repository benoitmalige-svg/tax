import crypto from 'crypto';

function verifyAddressToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Malformed token');
  }
  const [payload, sig] = token.split('.');
  const secret = process.env.ADDRESS_TOKEN_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (sig !== expected) {
    throw new Error('Invalid token signature');
  }
  return Buffer.from(payload, 'base64url').toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      token,
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }
    if (!fullName || !addressLine1 || !city || !state || !postalCode || !country) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let email;
    try {
      email = verifyAddressToken(token);
    } catch (err) {
      console.error('Address token verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    const pubId = process.env.BEEHIIV_PUBLICATION_ID;
    const apiKey = process.env.BEEHIIV_API_KEY;

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/by_email/${encodeURIComponent(email)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_fields: [
            { name: 'Mailing Full Name', value: fullName },
            { name: 'Mailing Address Line 1', value: addressLine1 },
            { name: 'Mailing Address Line 2', value: addressLine2 || '' },
            { name: 'Mailing City', value: city },
            { name: 'Mailing State', value: state },
            { name: 'Mailing Postal Code', value: postalCode },
            { name: 'Mailing Country', value: country },
            { name: 'Shipping Address Complete', value: true },
          ],
        }),
      }
    );

    const rawText = await response.text();
    console.log('DEBUG submit-address Beehiiv status:', response.status);
    console.log('DEBUG submit-address Beehiiv body:', rawText);

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to save address' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('submit-address error:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
