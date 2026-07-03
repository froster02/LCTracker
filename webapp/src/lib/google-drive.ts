import { google } from "googleapis";

const FILE_NAME = "LeetCode_SRS_Data.json";

interface Problem {
  id: string;
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  stage: number;
  last_solved_at: string;
  next_review_at: string;
  created_at: string;
}

export function calculateNextReviewDate(stage: number, baseDateStr?: string): string {
  const date = baseDateStr ? new Date(baseDateStr) : new Date();
  switch (stage) {
    case 0: date.setDate(date.getDate() + 7); break;
    case 1: date.setDate(date.getDate() + 14); break;
    case 2: date.setDate(date.getDate() + 21); break;
    default: date.setMonth(date.getMonth() + 6); break;
  }
  return date.toISOString().split("T")[0];
}

function getAuth(accessToken: string, refreshToken?: string) {
  const auth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID!,
    process.env.AUTH_GOOGLE_SECRET!
  );
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return auth;
}

export async function readProblems(
  accessToken: string,
  refreshToken?: string
): Promise<{ problems: Problem[]; fileId: string | null }> {
  try {
    const auth = getAuth(accessToken, refreshToken);
    const drive = google.drive({ version: "v3", auth });

    const listRes = await drive.files.list({
      q: `name='${FILE_NAME}' and mimeType='application/json' and trashed=false`,
      spaces: "drive",
      fields: "files(id)",
    });

    if (!listRes.data.files || listRes.data.files.length === 0) {
      return { problems: [], fileId: null };
    }

    const fileId = listRes.data.files[0].id!;
    const contentRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "json" }
    );

    const data = contentRes.data as { problems?: Problem[] } | null;
    return { problems: data?.problems ?? [], fileId };
  } catch (error) {
    console.error("[Google Drive] read error:", error);
    return { problems: [], fileId: null };
  }
}

export async function writeProblems(
  accessToken: string,
  problems: Problem[],
  fileId: string | null,
  refreshToken?: string
): Promise<string | null> {
  try {
    const auth = getAuth(accessToken, refreshToken);
    const drive = google.drive({ version: "v3", auth });

    const content = JSON.stringify({ problems, updatedAt: new Date().toISOString() });

    if (fileId) {
      await drive.files.update({
        fileId,
        media: { mimeType: "application/json", body: content },
      });
      return fileId;
    }

    const createRes = await drive.files.create({
      requestBody: { name: FILE_NAME, mimeType: "application/json" },
      media: { mimeType: "application/json", body: content },
      fields: "id",
    });
    return createRes.data.id ?? null;
  } catch (error) {
    console.error("[Google Drive] write error:", error);
    return null;
  }
}
