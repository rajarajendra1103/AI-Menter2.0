const fetch = require('node-fetch');

async function test() {
    const payload = {
      model: 'gemma2-9b-it',
      messages: [{ role: 'user', content: 'Respond with only valid JSON. Test message' }],
      response_format: { type: "json_object" }
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR_GROQ_API_KEY`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

test();
