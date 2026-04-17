export const generateOpenRouterResponse = async (prompt, requestedModel = 'llama-3.3-70b-versatile', base64Media = null) => {
  // Exclusively using Groq models as requested
  const modelsToTry = [
    requestedModel,
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768'
  ];

  // Remove duplicates while preserving order
  const uniqueModels = [...new Set(modelsToTry)];
  
  let lastError = null;

  for (const model of uniqueModels) {
    try {
      let messageContent = prompt;

      if (base64Media) {
        // Groq handles text structure best in this context
        messageContent = prompt + "\n[Note: This prompt originally contained an image but provide context strictly based on text].";
      }

      const isJsonRequested = prompt.toLowerCase().includes("respond with only valid json") || 
                              prompt.toLowerCase().includes("json object with this exact shape") ||
                              prompt.toLowerCase().includes("raw json array") ||
                              prompt.toLowerCase().includes("raw json structure");

      const payload = {
        model: model,
        messages: [{ role: 'user', content: messageContent }],
        temperature: isJsonRequested ? 0.1 : 0.4,
      };

      if (isJsonRequested) {
        payload.response_format = { type: "json_object" };
      }

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_GROQ_API_KEY is missing from .env file");
      }

      let response;
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        console.error(`[Groq] Network/CORS Error for ${model}:`, fetchErr);
        throw new Error(`Network Error: Failed to reach Groq API. Please check your internet connection or CORS settings. (${fetchErr.message})`);
      }

      if (response.status === 429) {
        const errorText = await response.text();
        console.warn(`[Groq] 429 Rate Limit for ${model}. Trying fallback...`);
        lastError = new Error(`Rate limit exceeded for ${model}: ${errorText}`);
        continue; // Try next model
      }

      if (!response.ok) {
        throw new Error(`Groq API Error: ${response.statusText} - ${await response.text()}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`[Groq] Attempt with ${model} failed:`, error);
      lastError = error;
      // If it's a rate limit, decommissioned, model not found, or JSON validation error, try the next model
      if (
        error.message.includes('429') || 
        error.message.includes('rate_limit') || 
        error.message.includes('model_not_found') ||
        error.message.includes('does not exist') ||
        error.message.includes('decommissioned') ||
        error.message.includes('no longer supported') ||
        error.message.includes('json_validate_failed') ||
        error.message.includes('failed to generate JSON')
      ) {
        continue;
      }
      throw error; // For other errors (like auth), stop and throw
    }
  }

  throw lastError || new Error("All model attempts failed.");
};
