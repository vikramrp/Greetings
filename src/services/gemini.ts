import { GoogleGenAI, Type } from "@google/genai";
import { Template, Placeholder } from "../types";

export async function removeBackground(base64Image: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: "image/png",
            },
          },
          {
            text: "Extract the person from this image and return only the person on a transparent background. Do not include any background elements.",
          },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image part found in response");
  } catch (error) {
    console.error("Error removing background:", error);
    return base64Image;
  }
}

export async function generateCustomTemplate(prompt: string): Promise<Omit<Template, 'id'>> {
  // Use process.env.API_KEY if available (injected by AI Studio for paid models)
  const apiKey = (process.env as any).API_KEY || process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey });

  // 1. Generate the Background Image
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
      parts: [
        {
          text: `A professional, high-quality poster background for: ${prompt}. The image should be 1080x1350 (portrait aspect ratio). It should have clear empty spaces for a person's photo and text labels like name and designation. Style: Modern, clean, professional.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "3:4",
        imageSize: "1K"
      }
    }
  });

  let imageURL = '';
  for (const part of imageResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      imageURL = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageURL) throw new Error("Failed to generate template image");

  // 2. Generate Placeholder Coordinates
  const layoutResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this poster description: "${prompt}", suggest optimal (x, y, width, height) coordinates for placeholders on a 1080x1350 canvas. 
    Return a JSON array of placeholders. Each placeholder must have:
    - type: "text" or "image"
    - x: number (0-1080)
    - y: number (0-1350)
    - width: number
    - height: number
    - fontSize: number (for text)
    - color: string (hex)
    - label: string
    - key: "name", "designation", or "userPhoto"
    
    Ensure the layout is balanced and professional.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            width: { type: Type.NUMBER },
            height: { type: Type.NUMBER },
            fontSize: { type: Type.NUMBER },
            color: { type: Type.STRING },
            label: { type: Type.STRING },
            key: { type: Type.STRING }
          },
          required: ["type", "x", "y", "width", "height", "label", "key"]
        }
      }
    }
  });

  const placeholders = JSON.parse(layoutResponse.text) as Placeholder[];

  return {
    title: `AI Generated: ${prompt.substring(0, 20)}...`,
    category: 'AI Generated',
    imageURL,
    placeholders
  };
}
