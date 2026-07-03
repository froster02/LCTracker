import { z } from "zod";

export const submissionSchema = z.object({
  problemId: z.string().min(1),
  problemName: z.string().min(1),
  titleSlug: z.string().min(1),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().min(1),
  runtime: z.number().int().optional(),
  memory: z.number().int().optional(),
  status: z.enum([
    "Accepted",
    "Wrong Answer",
    "Time Limit Exceeded",
    "Memory Limit Exceeded",
    "Runtime Error",
    "Compile Error",
    "Output Limit Exceeded",
    "Pending",
    "Rejected",
  ]),
  codeLength: z.number().int().optional(),
  url: z.string().url(),
  submittedAt: z.string().datetime().optional(),
});

export const extensionAuthSchema = z.object({
  idToken: z.string().min(1),
});

export const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
