const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testdb',
  user: process.env.DB_USER || 'testuser',
  password: process.env.DB_PASSWORD || 'testpass',
});

let redisClient = null;
const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    await redisClient.connect();
    console.log('Conectado a Redis');
  } catch (error) {
    console.error('Error conectando a Redis:', error.message);
  }
};

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      postgres: pool ? 'connected' : 'disconnected',
      redis: redisClient?.isReady || false
    }
  });
});

app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const cachedUser = await redisClient.get(`user:${userId}`);
    if (cachedUser) {
      return res.json({ source: 'cache', data: JSON.parse(cachedUser) });
    }
  } catch (error) {
    console.error('Error en Redis:', error.message);
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    try {
      await redisClient.set(`user:${userId}`, JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('Error guardando en Redis:', error.message);
    }
    res.json({ source: 'database', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`Servidor corriendo en puerto ${port}`);
    await connectRedis();
  });
}

module.exports = { app, pool, redisClient };
