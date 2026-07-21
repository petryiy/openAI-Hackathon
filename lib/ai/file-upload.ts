import OpenAI from "openai";
import { ModelConfigurationError } from "@/lib/ai/provider";

/**
 * Upload a user PDF to the OpenAI Files API so it can be passed to the
 * Responses call as an input_file. The model then sees both the extracted text
 * layer and a rendered image of every page.
 */
export async function uploadPdfForModel(pdf: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new ModelConfigurationError("Add OPENAI_API_KEY to turn an uploaded document into a lesson.");
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1 });
  const uploaded = await client.files.create({ file: pdf, purpose: "user_data" });
  return uploaded.id;
}
