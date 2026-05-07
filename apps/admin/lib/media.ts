import type { DatamixMediaAsset } from "@datamix/core";

import { adminPublicEnv } from "./runtime";

type MediaAssetApiBody = {
  asset?: DatamixMediaAsset;
  assets?: DatamixMediaAsset[];
  error?: string;
  message?: string;
};

export class MediaAssetRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaAssetRequestError";
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildMediaAssetsUrl() {
  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/media/assets`;
}

export async function listMediaAssets() {
  const response = await fetch(buildMediaAssetsUrl(), {
    credentials: "include",
  });

  const body = await readApiBody<MediaAssetApiBody>(response);

  if (!response.ok) {
    throw new MediaAssetRequestError(body?.error ?? "Unable to load media assets.");
  }

  return body?.assets ?? [];
}

export async function uploadMediaAsset(file: File) {
  const formData = new FormData();

  formData.set("file", file);

  const response = await fetch(buildMediaAssetsUrl(), {
    body: formData,
    credentials: "include",
    method: "POST",
  });

  const body = await readApiBody<MediaAssetApiBody>(response);

  if (!response.ok) {
    throw new MediaAssetRequestError(body?.error ?? "Unable to upload media asset.");
  }

  if (!body?.asset || !body.message) {
    throw new MediaAssetRequestError("Media upload response was incomplete.");
  }

  return {
    asset: body.asset,
    message: body.message,
  };
}
