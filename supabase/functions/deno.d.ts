// This file provides type definitions for Deno globals (like the Deno namespace)
// so that standard IDE TypeScript servers (configured for Node/Vite) can resolve
// Deno APIs without highlighting them as errors.

declare namespace Deno {
  interface ServeOptions {
    port?: number;
    hostname?: string;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { port: number; hostname: string }) => void;
  }

  function serve(
    handler: (request: Request, info: any) => Response | Promise<Response>
  ): void;

  function serve(
    options: ServeOptions,
    handler: (request: Request, info: any) => Response | Promise<Response>
  ): void;

  const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
  };
}

declare module "https://esm.sh/@supabase/supabase-js*" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/linkedom*" {
  export const DOMParser: any;
  export const parseHTML: any;
  export class HTMLDocument {}
  export class Element {}
  export class Document {}
}

declare module "https://esm.sh/linkedom@0.16.8?external=canvas" {
  export const DOMParser: any;
  export const parseHTML: any;
  export class HTMLDocument {}
  export class Element {}
  export class Document {}
}

declare module "https://esm.sh/*" {
  const content: any;
  export default content;
  export const DOMParser: any;
  export const parseHTML: any;
  export class HTMLDocument {}
  export class Element {}
  export class Document {}
}

declare module "jsr:*" {
  const content: any;
  export default content;
}
