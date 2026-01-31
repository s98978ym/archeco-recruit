export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL is not configured');
    return res.status(500).json({ error: 'Slack webhook not configured' });
  }

  try {
    const { type, fields } = req.body;

    const title = type === 'career' ? ':briefcase: 中途採用エントリー' : ':mortar_board: インターンエントリー';

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: title, emoji: true },
      },
      {
        type: 'section',
        fields: fields.map((f) => ({
          type: 'mrkdwn',
          text: `*${f.label}*\n${f.value || '(未入力)'}`,
        })),
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `送信元: <https://int-incubation.com|ARCHECO採用サイト> | ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
          },
        ],
      },
    ];

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!slackRes.ok) {
      console.error('Slack webhook error:', slackRes.status, await slackRes.text());
      return res.status(502).json({ error: 'Slack notification failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
