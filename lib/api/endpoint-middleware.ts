// Thin endpoint middleware: auth (placeholder), rate limit hook (future), Zod validation, error normalization
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

export interface EndpointOptions {
  auth?: boolean; // require authenticated user
  schema?: { body?: ZodSchema; query?: ZodSchema };
  featureFlag?: string; // env var name must equal '1'
}

export interface EndpointContext<TBody=unknown, TQuery=unknown> {
  body: TBody;
  query: TQuery;
  user?: { id: string } | null;
}

export type EndpointHandler<TBody, TQuery> = (req: NextRequest, ctx: EndpointContext<TBody, TQuery>) => Promise<unknown>;

function authCheck(_: NextRequest): { id: string } | null {
  // TODO integrate NextAuth session retrieval.
  return null; // anonymous by default
}

export async function endpoint<TB=unknown, TQ=unknown>(req: NextRequest, opts: EndpointOptions, handler: EndpointHandler<TB, TQ>) {
  try {
    if (opts.featureFlag) {
      if (process.env[opts.featureFlag] !== '1') {
        return NextResponse.json({ error: 'Feature disabled', flag: opts.featureFlag }, { status: 403 });
      }
    }

    const url = new URL(req.url);
    let bodyParsed: unknown = undefined;
    if (req.method !== 'GET' && req.headers.get('content-type')?.includes('application/json')) {
      bodyParsed = await req.json().catch(() => undefined);
    }

    if (opts.schema?.body) {
      bodyParsed = opts.schema.body.parse(bodyParsed ?? {});
    }

    const queryObj: Record<string, string> = {};
    url.searchParams.forEach((v,k)=>{ queryObj[k]=v; });
    let queryParsed: unknown = queryObj;
    if (opts.schema?.query) {
      queryParsed = opts.schema.query.parse(queryObj);
    }

    const user = opts.auth ? authCheck(req) : null;
    if (opts.auth && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await handler(req, { body: bodyParsed as TB, query: queryParsed as TQ, user });
    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    if (err?.issues) { // ZodError
      return NextResponse.json({ error: 'ValidationError', issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'InternalError', message: err?.message || 'Unknown error' }, { status: 500 });
  }
}
