import os
from google import genai
from google.genai import types


class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is missing. Add it to backend/.env"
            )

        self.client = genai.Client(api_key=self.api_key)

        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.5-flash"
        )

    def generate(self, prompt: str) -> str:
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response.")

        return response.text.strip()


gemini_service = GeminiService()