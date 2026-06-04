import { getMediaObject, MediaAssetError } from "../media";
import { getDatamixEnv, jsonResponse, withPublicMediaCors } from "./http";

function handleMediaAssetError(error: MediaAssetError) {
  return jsonResponse({ error: error.message }, error.statusCode);
}

export async function getPublicMediaObject(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const requestPath = requestUrl.pathname;
    const storageKeyPrefix = "/api/media/object/";
    const storageKey = requestPath.startsWith(storageKeyPrefix)
      ? decodeURIComponent(requestPath.slice(storageKeyPrefix.length))
      : "";

    if (!storageKey) {
      return withPublicMediaCors(
        request,
        jsonResponse({ error: "Media storage key is required." }, 400),
      );
    }

    const mediaObject = await getMediaObject(getDatamixEnv(), storageKey, requestUrl);
    const headers = new Headers();

    headers.set("Cache-Control", mediaObject.cacheControl);
    headers.set("Content-Length", String(mediaObject.contentLength));
    headers.set("Content-Type", mediaObject.contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    if (mediaObject.etag) {
      headers.set("ETag", mediaObject.etag);
    }

    return withPublicMediaCors(
      request,
      new Response(mediaObject.body, {
        headers,
        status: 200,
      }),
    );
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return withPublicMediaCors(request, handleMediaAssetError(error));
    }

    throw error;
  }
}
