import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { env } from './config/env.js';
import { corsMiddleware } from './config/cors.js';
import { connectDatabase } from './config/database.js';
import { loggerMiddleware } from './config/logger.js';
import routes from './routes/index.js';
import { initSocket } from './ws/index.js';
import { errorHandler } from './middleware/error.js';
async function bootstrap() {
    await connectDatabase();
    const app = express();
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(corsMiddleware);
    app.use(loggerMiddleware);
    app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
    app.use(express.urlencoded({ extended: true }));
    app.use('/', routes);
    app.use(errorHandler);
    const httpServer = createServer(app);
    initSocket(httpServer);
    httpServer.listen(env.PORT, () => {
        console.log(`Server listening on :${env.PORT}`);
    });
    return app;
}
// Run only if invoked directly
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
    bootstrap();
}
export default bootstrap;
//# sourceMappingURL=server.js.map