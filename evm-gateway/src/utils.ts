import { type Request as CFWRequest } from '@cloudflare/workers-types';
import { type PropsDecoder } from '@ensdomains/server-analytics';
export interface Router {
  handle: (request: CFWRequest) => Promise<Response>;
}

export const propsDecoder: PropsDecoder<CFWRequest> = (request?: CFWRequest) => {
  if (!request || !request.url) {
    return {};
  }
  const trackingData = request.url.match(
    /\/0x[a-fA-F0-9]{40}\/0x[a-fA-F0-9]{1,}\.json/
  );
  if (trackingData) {
    return {
      sender: trackingData[0].slice(1, 42),
      calldata: trackingData[0].slice(44).replace('.json', ''),
    };
  } else {
    return {};
  }
};