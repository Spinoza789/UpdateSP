import helmet from "helmet";
import type { RequestHandler } from "express";

// Shared by production HTML and API responses.
const defaultHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
});

export const securityHeaders: RequestHandler = (req, res, next) => {
  defaultHeaders(req, res, () => {
    // This page intentionally talks to the Janoshik window that opened it.
    // COOP same-origin severs window.opener before its JS can handshake.
    // Keep isolation on every other HTML page and every API endpoint.
    if (/^\/sleepingpepisadmin\/janoshik-receiver\/?$/.test(req.path)) {
      res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
    }
    next();
  });
};
