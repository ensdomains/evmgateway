import { Request as CFWRequest } from '@cloudflare/workers-types';
import { Request as ExpressRequest } from 'express';

interface TrackerOptions {
  apiEndpoint?: string;
  enableLogging?: boolean;
}

interface TrackingOptions {
  props?: any;
  data?: any;
}

interface RequestBody {
  domain: string;
  name: string;
  url: string;
  referrer?: string;
  props?: any;
  data?: any;
}

export class Tracker {
  domain = '';
  enableLogging = false;
  apiEndpoint = 'https://plausible.io/api/event';

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

      if (
        requestInfo.get('Referrer')
      ) {
        body.referrer = requestInfo.get('Referrer') ||
          '';
      }

      if (props) {
        body.props = props;
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