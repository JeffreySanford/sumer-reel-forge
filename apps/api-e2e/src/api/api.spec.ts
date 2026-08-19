import axios from 'axios';

describe('GET /api/health', () => {
  it('returns API health', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      status: 'ok',
      service: 'sumer-reel-forge-api',
    });
  });
});

describe('GET /api/chapters/1/reels', () => {
  it('returns the full Chapter 1 reel outline', async () => {
    const res = await axios.get(`/api/chapters/1/reels`);

    expect(res.status).toBe(200);
    expect(res.data).toHaveLength(18);
    expect(res.data[0]).toMatchObject({
      episode: 1,
      title: 'The Voyage Begins',
    });
  });
});
