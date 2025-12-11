import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const KIE_FILE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-stream-upload";
const KIE_API_KEY = process.env.KIE_API_KEY;

export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  originalName: string;
}

export async function uploadFileToKIE(
  filePath: string,
  uploadPath: string = "reference-images",
  customFileName?: string
): Promise<UploadedFile> {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in environment");
  }

  const fileBuffer = readFileSync(filePath);
  const originalName = filePath.split("/").pop() || "unknown";
  const fileName = customFileName || originalName;

  const formData = new FormData();
  const blob = new Blob([fileBuffer]);
  formData.append("file", blob, fileName);
  formData.append("uploadPath", uploadPath);
  formData.append("fileName", fileName);

  const response = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload file to KIE: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (!result.success || result.code !== 200) {
    throw new Error(`KIE upload failed: ${result.msg || "Unknown error"}`);
  }

  return {
    fileUrl: result.data?.fileUrl || result.data?.downloadUrl || "",
    fileName: result.data?.fileName || fileName,
    originalName: result.data?.originalName || originalName,
  };
}

export async function uploadBufferToKIE(
  buffer: Buffer,
  fileName: string,
  uploadPath: string = "cropped-regions"
): Promise<UploadedFile> {
  if (!KIE_API_KEY) {
    throw new Error("KIE_API_KEY is not set in environment");
  }

  const formData = new FormData();
  const blob = new Blob([buffer]);
  formData.append("file", blob, fileName);
  formData.append("uploadPath", uploadPath);
  formData.append("fileName", fileName);

  const response = await fetch(KIE_FILE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIE_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to upload buffer to KIE: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  if (!result.success || result.code !== 200) {
    throw new Error(`KIE upload failed: ${result.msg || "Unknown error"}`);
  }

  return {
    fileUrl: result.data?.fileUrl || result.data?.downloadUrl || "",
    fileName: result.data?.fileName || fileName,
    originalName: fileName,
  };
}

export interface StyleImageMapping {
  styleId: string;
  imageUrls: string[];
}

export async function uploadReferenceImages(baseDir: string): Promise<StyleImageMapping[]> {
  const results: StyleImageMapping[] = [];

  try {
    const styleDirs = readdirSync(baseDir).filter((item) => {
      const fullPath = join(baseDir, item);
      return statSync(fullPath).isDirectory();
    });

    for (const styleDir of styleDirs) {
      const stylePath = join(baseDir, styleDir);
      const imageFiles = readdirSync(stylePath).filter((file) => {
        const ext = extname(file).toLowerCase();
        return [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
      });

      const uploadedUrls: string[] = [];

      for (const imageFile of imageFiles) {
        const imagePath = join(stylePath, imageFile);
        console.log(`Uploading ${styleDir}/${imageFile}...`);

        try {
          const uploaded = await uploadFileToKIE(imagePath, `reference-images/${styleDir}`, imageFile);
          uploadedUrls.push(uploaded.fileUrl);
          console.log(`✓ Uploaded: ${uploaded.fileUrl}`);
        } catch (error) {
          console.error(`✗ Failed to upload ${imageFile}:`, error);
        }
      }

      if (uploadedUrls.length > 0) {
        results.push({
          styleId: styleDir,
          imageUrls: uploadedUrls,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error scanning reference images:", error);
    return [];
  }
}
