import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3333;
const app = createApp();

app.listen(port, () => {
  console.log(`MesaFlow API rodando em http://localhost:${port}`);
});
