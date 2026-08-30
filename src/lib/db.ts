import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { lookup, Resolver } from "node:dns";
import ws from "ws";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const neonDnsResolver = new Resolver();
neonDnsResolver.setServers(["1.1.1.1", "8.8.8.8"]);

type LookupAddress = { address: string; family: number };
type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * Some local DNS resolvers reject Neon endpoint records even though the endpoint
 * is valid. Keep the normal resolver as the first choice, with a public-DNS
 * fallback only for Neon WebSocket connections.
 */
function lookupNeonHost(hostname: string, options: unknown, callback?: LookupCallback) {
  const done = (typeof options === "function" ? options : callback) as LookupCallback | undefined;
  if (!done) return;
  const wantsAllAddresses = typeof options === "object" && options !== null && "all" in options && options.all === true;
  const complete = (error: NodeJS.ErrnoException | null, address?: string) => {
    if (error || !address) {
      done(error, wantsAllAddresses ? [] : "", wantsAllAddresses ? undefined : 0);
      return;
    }
    if (wantsAllAddresses) {
      done(null, [{ address, family: 4 }]);
      return;
    }
    done(null, address, 4);
  };

  lookup(hostname, { family: 4 }, (error, address) => {
    if (!error) {
      complete(null, address);
      return;
    }

    neonDnsResolver.resolve4(hostname, (fallbackError, addresses) => {
      if (fallbackError || addresses.length === 0) {
        complete(error);
        return;
      }
      complete(null, addresses[0]);
    });
  });
}

class NeonWebSocket extends ws {
  constructor(address: string) {
    super(address, { lookup: lookupNeonHost } as unknown as ws.ClientOptions);
  }
}

function createPrismaClient(): PrismaClient {
  const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to connect to the database.");
  if (!url.includes("neon.tech")) throw new Error("DATABASE_URL must be a Neon PostgreSQL connection string.");

  neonConfig.webSocketConstructor = NeonWebSocket;
  const adapter = new PrismaNeon({ connectionString: url });
  return new PrismaClient({ adapter, log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
