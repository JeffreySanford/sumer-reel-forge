import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  url?: string;
};

type ResponseWithFinish = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
};

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(
    request: RequestWithHeaders,
    response: ResponseWithFinish,
    next: () => void,
  ): void {
    const started = Date.now();
    const requestId = this.getRequestId(request);

    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          requestId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - started,
        }),
      );
    });

    next();
  }

  private getRequestId(request: RequestWithHeaders): string {
    const existing = request.headers['x-request-id'];
    return typeof existing === 'string' && existing.trim().length > 0
      ? existing
      : crypto.randomUUID();
  }
}
