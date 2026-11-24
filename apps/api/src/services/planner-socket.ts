import { createRequire } from 'node:module';
import type { Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { verifyAccessToken } from './auth.service.js';
import { assertFacultyScope } from './faculty-program.service.js';
import { readPlannerAccess, subscribePlannerAccess } from './planner-access.service.js';

interface PlannerSocket {
  readyState: number;
  send(message: string): void;
  close(code: number): void;
  once(event: 'close', handler: () => void): void;
  once(event: 'message', handler: (message: Buffer) => void): void;
  on(event: 'error', handler: () => void): void;
}

const { WebSocketServer } = createRequire(import.meta.url)('ws') as {
  WebSocketServer: new (options: { noServer: boolean; maxPayload: number }) => {
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (socket: PlannerSocket) => void): void;
  };
};
const subscription = z.object({
  token: z.string(),
  facultyId: z.string().uuid(),
  termId: z.string().uuid(),
});

export function attachPlannerSocket(server: Server): void {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/api/planner-live') {
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, client => {
      let unsubscribe: (() => void) | undefined;
      const timeout = setTimeout(() => client.close(1008), 5000);
      client.on('error', () => client.close(1011));
      client.once('close', () => {
        clearTimeout(timeout);
        unsubscribe?.();
      });
      client.once('message', raw => {
        void (async () => {
          const {token, facultyId, termId} = subscription.parse(JSON.parse(raw.toString()));
          const actor = verifyAccessToken(token);
          if (actor.role !== 'FACULTY') {
            client.close(1008);
            return;
          }
          await assertFacultyScope(actor, facultyId, termId);
          if (client.readyState !== 1) return;
          clearTimeout(timeout);
          let receivedUpdate = false;
          const send = (access: Awaited<ReturnType<typeof readPlannerAccess>>) => {
            if (client.readyState !== 1) return;
            try { verifyAccessToken(token); } catch {
              client.close(1008);
              return;
            }
            client.send(JSON.stringify(access));
          };
          unsubscribe = subscribePlannerAccess(facultyId, termId, access => {
            receivedUpdate = true;
            send(access);
          });
          const initial = await readPlannerAccess(facultyId, termId);
          if (!receivedUpdate) send(initial);
        })().catch(() => client.close(1008));
      });
    });
  });
}
