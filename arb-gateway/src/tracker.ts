import { type Request as CFWRequest } from '@cloudflare/workers-types';
import { type Request as ExpressRequest } from 'express';

interface TrackerOptions {
  apiEndpoint?: string;
  enableLogging?: boolean;
}

interface TrackingOptions {
  props?: { [key: string]: number | string } | string | number;
  data?: { [key: string]: number | string } | string | number;
}

interface RequestBody {
  domain: string;
  name: string;
  url: string;
  referrer?: string;
  props?: { [key: string]: number | string } | string | number;
  data?: { [key: string]: number | string } | string | number;
}

export class Tracker {
  domain = '';
  enableLogging = false;
  apiEndpoint = 'https://plausible.pff.sh/api/event';
  constructor(domain: string, options: TrackerOptions = {}) {
    this.domain = domain;
    this.apiEndpoint = options.apiEndpoint || this.apiEndpoint;
    this.enableLogging = options.enableLogging || this.enableLogging;
  }

  log(message: string) {
    if (this.enableLogging) {
      console.log(message);
    }
  }

  async trackPageview(
    req: CFWRequest | ExpressRequest,
    options?: TrackingOptions,
    includeUserDetails = false
  ) {
    await this.trackEvent('pageview', req, options, includeUserDetails);
  }

  async trackEvent(
    name: string,
    req: CFWRequest | ExpressRequest,
    { props, data }: TrackingOptions = {},
    includeUserDetails = false
  ) {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('Invalid event name');
      }

      const body: RequestBody = {
        domain: this.domain,
        name: name,
        url:
          'originalUrl' in req // means it's express request
            ? `${req.protocol}://${req.get('host')}${req.originalUrl}`
            : req.url,
      };

      const requestInfo = 'originalUrl' in req ? req : req.headers;

      if (requestInfo.get('Referrer')) {
        body.referrer = requestInfo.get('Referrer') || '';
      }
      body.props = props || {}
      const trackingData = (body.url).match(/\/0x[a-fA-F0-9]{40}\/0x[a-fA-F0-9]{1,}\.json/)
      if (trackingData) {
        body.props = Object.assign(body.props, {
          sender:trackingData[0].slice(1,42),
          calldata:trackingData[0].slice(44).replace(".json","")
        })
      }

      if (data) {
        body.data = data;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const userAgent = requestInfo.get('User-Agent');
      if (userAgent) {
        headers['User-Agent'] = userAgent;
        headers['X-Forwarded-For'] = '127.0.0.1';
      }

      if (includeUserDetails) {
        headers['X-Forwarded-For'] =
          (requestInfo as ExpressRequest)?.socket?.remoteAddress ||
          requestInfo.get('CF-Connecting-IP') ||
          '';
      }

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Plausible API responded with ${response.status}`);
      }

      this.log(`Event tracked: ${name}`);
    } catch (err) {
      console.error('Plausible error:', err);
    }
  }
}
