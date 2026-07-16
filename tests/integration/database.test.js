const request = require('supertest');
const { app, pool, redisClient } = require('../../src/app');

describe('Pruebas de Integracion con Servicios', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL
      )
    `);
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS users');
    await pool.end();
    if (redisClient) {
      await redisClient.quit();
    }
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM users');
    if (redisClient && redisClient.isReady) {
      await redisClient.flushAll();
    }
  });

  test('POST /users Crear usuario en PostgreSQL', async () => {
    const userData = { name: 'Maria Gonzalez', email: 'maria@ejemplo.com' };
    const response = await request(app)
      .post('/users')
      .send(userData)
      .expect(201);
    expect(response.body.name).toBe(userData.name);
    expect(response.body.email).toBe(userData.email);
  });
});
