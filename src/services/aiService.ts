export interface GenerateAIRequest {
  prompt: string;
  systemInstruction?: string;
  contextData?: Record<string, unknown>;
}

export interface GenerateAIResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export const aiService = {
  /**
   * Send an AI generation request to the serverless function.
   */
  async generateText(request: GenerateAIRequest): Promise<GenerateAIResponse> {
    const { prompt, systemInstruction, contextData } = request;

    try {
      const response = await fetch('/.netlify/functions/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          contextData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || `AI function returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        text: data.text || data.output || '',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with AI service';
      console.error('AI call failed:', msg);
      return {
        success: false,
        error: msg,
      };
    }
  },
};
