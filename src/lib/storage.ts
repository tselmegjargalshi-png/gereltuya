import "server-only";
import { put } from "@vercel/blob";

export const storageEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads an image to Vercel Blob. Throws a Mongolian user-facing message on failure. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!storageEnabled()) throw new Error("Зураг хадгалах үйлчилгээ холбогдоогүй байна. Зургийн холбоос оруулна уу.");
  if (!ALLOWED.has(file.type)) throw new Error("Зөвхөн JPG, PNG, WEBP зураг оруулах боломжтой.");
  if (file.size > MAX_BYTES) throw new Error("Зургийн хэмжээ 5MB-аас ихгүй байх ёстой.");
  const ext = file.type.split("/")[1];
  const blob = await put(`${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, { access: "public", addRandomSuffix: false });
  return blob.url;
}
