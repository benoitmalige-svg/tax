// TEMPORARY DIAGNOSTIC ROUTE - TEST ONLY
// Queries Beehiiv directly (server-side) to verify a subscriber's status,
// tags, and automation enrollment. Not linked from any page. Safe to delete
// once the Stripe -> Beehiiv flow is confirmed working.
export default async function handler(req, res) {
    const apiKey = process.env.BEEHIIV_API_KEY;
    const pubId = process.env.BEEHIIV_PUBLICATION_ID;
    const autoId = process.env.BEEHIIV_AUTOMATION_ID;
    const email = req.query.email;

  if (!email) {
        return res.status(400).json({ error: 'Add ?email=someone@example.com to the URL' });
  }
    if (!apiKey || !pubId || !autoId) {
          return res.status(500).json({ error: 'Missing one of BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID, BEEHIIV_AUTOMATION_ID' });
    }

  try {
        const subUrl = `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions/by_email/${encodeURIComponent(email)}?expand[]=tags`;
        const subRes = await fetch(subUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
        const subData = await subRes.json();

      let journeysData = null;
        let journeysStatus = null;
        let matchingJourney = null;

      if (subRes.status === 200 && subData.data && subData.data.id) {
              const journeysUrl = `https://api.beehiiv.com/v2/publications/${pubId}/automations/${autoId}/journeys?status=all&limit=100`;
              const journeysRes = await fetch(journeysUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
              journeysStatus = journeysRes.status;
              journeysData = await journeysRes.json();
              if (journeysData && Array.isArray(journeysData.data)) {
                        matchingJourney = journeysData.data.find((j) => j.subscription_id === subData.data.id) || null;
              }
      }

      return res.status(200).json({
              lookup_email: email,
              subscription_lookup_status_code: subRes.status,
              subscription: subData,
              journeys_lookup_status_code: journeysStatus,
              total_journeys_in_automation: journeysData ? journeysData.total_results : null,
              matching_journey_for_this_subscriber: matchingJourney,
              all_journeys_in_automation: journeysData ? journeysData.data : null,
      });
  } catch (err) {
        return res.status(500).json({ error: err.message });
  }
}
