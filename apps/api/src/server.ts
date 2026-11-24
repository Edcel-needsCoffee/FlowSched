import 'dotenv/config';
import { createApp, ensureUploadDirs } from './app.js';
import { attachPlannerSocket } from './services/planner-socket.js';

const port = Number(process.env.PORT ?? 4000);
ensureUploadDirs();
const app = createApp();

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}`);
});
attachPlannerSocket(server);
