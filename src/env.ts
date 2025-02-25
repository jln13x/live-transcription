import { z } from "zod";

export const env = z
  .object({
    ASSEMBLYAI_API_KEY: z.string().min(1),
  })
  .parse({
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLY_API_KEY,
  });
