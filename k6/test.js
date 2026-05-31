import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m',  target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed:   ['rate<0.02'],
  },
};

export default function () {
  // Test main app
  const main = http.get('http://pricecomparison:3000/api/product');
  check(main, { 'main OK': (r) => r.status < 500 });

  // Test chatbot
  const chatbot = http.get('http://pricehawk_chatbot:8000/');
  check(chatbot, { 'chatbot OK': (r) => r.status === 200 });

  sleep(1);
}