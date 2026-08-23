export class RendererApi {
  constructor(baseUrl, workerId) {
    this.baseUrl = baseUrl;
    this.workerId = workerId;
  }

  claimJob() {
    return this.request('/render-jobs/claim', {
      method: 'POST',
      body: { workerId: this.workerId },
      operation: 'claim',
    });
  }

  getEpisode(episodeId) {
    return this.request(`/chapters/1/reels/${episodeId}`, {
      operation: 'episode',
    });
  }

  heartbeat(jobId, notes) {
    return this.request(`/render-jobs/${jobId}/heartbeat`, {
      method: 'PATCH',
      body: { notes },
      operation: 'heartbeat',
    });
  }

  updateStatus(jobId, status, notes) {
    return this.request(`/render-jobs/${jobId}/status`, {
      method: 'PATCH',
      body: { status, heartbeat: status === 'running', notes },
      operation: 'status',
    });
  }

  createAsset(request) {
    return this.request('/generated-assets', {
      method: 'POST',
      body: request,
      operation: 'asset',
    });
  }

  createLog(jobId, request) {
    return this.request(`/render-jobs/${jobId}/logs`, {
      method: 'POST',
      body: { ...request, workerId: this.workerId },
      operation: 'log',
    });
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        'x-request-id': `${this.workerId}-${options.operation ?? 'request'}-${Date.now()}-${crypto.randomUUID()}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `${options.operation ?? 'request'} failed with HTTP ${response.status}: ${details}`,
      );
    }

    if (response.status === 204) {
      return undefined;
    }

    const body = await response.text();
    if (!body.trim()) {
      return null;
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(
        `${options.operation ?? 'request'} returned invalid JSON: ${error.message}`,
      );
    }
  }
}
