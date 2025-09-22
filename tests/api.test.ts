import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { db } from '../server/db';

// Test용 app 생성
let app: express.Application;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

describe('Bible API Tests', () => {
  describe('GET /api/bible/books', () => {
    test('성경책 목록을 반환해야 함', async () => {
      const response = await request(app).get('/api/bible/books');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // 첫 번째 성경책 구조 검증
      const firstBook = response.body[0];
      expect(firstBook).toHaveProperty('id');
      expect(firstBook).toHaveProperty('bookCode');
      expect(firstBook).toHaveProperty('bookNameKr');
      expect(firstBook).toHaveProperty('bookOrder');
    });

    test('성경책이 순서대로 정렬되어야 함', async () => {
      const response = await request(app).get('/api/bible/books');
      const books = response.body;
      
      // bookOrder 기준으로 정렬 확인
      for (let i = 1; i < books.length; i++) {
        if (books[i-1].bookOrder && books[i].bookOrder) {
          expect(books[i-1].bookOrder).toBeLessThanOrEqual(books[i].bookOrder);
        }
      }
    });
  });

  describe('GET /api/bible/random-verse', () => {
    test('랜덤 구절을 반환해야 함', async () => {
      const response = await request(app).get('/api/bible/random-verse');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('chapter');
      expect(response.body).toHaveProperty('verse');
      expect(typeof response.body.content).toBe('string');
      expect(response.body.content.length).toBeGreaterThan(0);
    });

    test('여러 번 호출시 다른 구절이 나올 수 있음', async () => {
      const response1 = await request(app).get('/api/bible/random-verse');
      const response2 = await request(app).get('/api/bible/random-verse');
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // 동일할 수도 있지만, 데이터가 있다는 것을 확인
      expect(response1.body.content).toBeTruthy();
      expect(response2.body.content).toBeTruthy();
    });
  });

  describe('GET /api/challenges', () => {
    test('챌린지 목록을 반환해야 함', async () => {
      const response = await request(app).get('/api/challenges');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // 첫 번째 챌린지 구조 검증
      const firstChallenge = response.body[0];
      expect(firstChallenge).toHaveProperty('id');
      expect(firstChallenge).toHaveProperty('title');
      expect(firstChallenge).toHaveProperty('description');
      expect(firstChallenge).toHaveProperty('type');
      expect(firstChallenge).toHaveProperty('requiredAccuracy');
      expect(firstChallenge).toHaveProperty('requiredWpm');
    });

    test('활성 챌린지만 반환해야 함', async () => {
      const response = await request(app).get('/api/challenges');
      const challenges = response.body;
      
      challenges.forEach((challenge: any) => {
        expect(challenge.isActive).toBe(true);
      });
    });
  });
});