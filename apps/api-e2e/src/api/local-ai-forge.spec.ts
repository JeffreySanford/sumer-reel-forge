import axios from 'axios';

describe('local AI and Forge proposal API', () => {
  it('reports the registered Ollama provider even when the forced e2e endpoint is unavailable', async () => {
    const providers = await axios.get('/api/local-ai/providers');

    expect(providers.status).toBe(200);
    expect(providers.data).toEqual([
      expect.objectContaining({
        id: 'ollama',
        available: false,
        structuredOutput: true,
        managedUnload: true,
      }),
    ]);
  });

  it('returns an empty aggregate model inventory when the forced e2e Ollama endpoint is unavailable', async () => {
    const models = await axios.get('/api/local-ai/models');

    expect(models.status).toBe(200);
    expect(models.data).toEqual([]);
  });

  it('rejects motion proposal requests outside the Shot 3/4 contract before inference', async () => {
    await expect(
      axios.post('/api/forge/motion-proposals', { shot: 5, provider: 'ollama' }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('rejects unsupported provider ids before inference', async () => {
    await expect(
      axios.post('/api/forge/motion-proposals', { shot: 3, provider: 'not-a-provider' }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it('returns service unavailable for a valid proposal when no local text provider is reachable', async () => {
    await expect(
      axios.post('/api/forge/motion-proposals', {
        shot: 3,
        provider: 'ollama',
        model: 'qwen3:8b',
        direction: 'Keep the vessel heavy and restrained.',
      }),
    ).rejects.toMatchObject({ response: { status: 503 } });
  });
});
