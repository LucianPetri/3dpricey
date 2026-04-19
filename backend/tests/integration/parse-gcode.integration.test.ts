import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../src/index';

function getAuthHeader() {
  process.env.JWT_SECRET = 'parse-gcode-secret';

  const token = jwt.sign(
    { id: 'user-1', email: 'user@example.com' },
    process.env.JWT_SECRET
  );

  return {
    Authorization: `Bearer ${token}`,
  };
}

describe('Parse G-code integration', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'parse-gcode-secret';
  });

  it('returns multi-material breakdown data for a valid G-code payload', async () => {
    const gcode = [
      '; estimated printing time = 1h 30m',
      '; filament_colour = #111111;#ffffff',
      '; filament_type = PLA;PETG',
      '; filament used [g] = 150,75',
      'T0',
      'G1 X1 Y1 E1.0',
      'T1',
      'G1 X2 Y2 E1.0',
    ].join('\n');

    const response = await request(app)
      .post('/api/quotes/parse-gcode')
      .set(getAuthHeader())
      .send({ gcode });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      colorChanges: [
        expect.objectContaining({ order: 1, tool: 'T0', color: '#111111', material: 'PLA', weightGrams: 150 }),
        expect.objectContaining({ order: 2, tool: 'T1', color: '#ffffff', material: 'PETG', weightGrams: 75 }),
      ],
      toolBreakdown: [
        expect.objectContaining({ order: 1, tool: 'T0', totalGrams: 150 }),
        expect.objectContaining({ order: 2, tool: 'T1', totalGrams: 75 }),
      ],
      recyclableTotals: expect.objectContaining({ modelGrams: 225, recyclableGrams: 0 }),
    });
  });

  it('rejects an empty parse request', async () => {
    const response = await request(app)
      .post('/api/quotes/parse-gcode')
      .set(getAuthHeader())
      .send({ gcode: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });
});