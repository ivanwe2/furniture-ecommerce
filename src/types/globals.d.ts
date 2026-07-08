// Ambient module declarations so a bare `tsc --noEmit` typecheck passes.
// Next's bundler resolves these side-effect imports at build time; the
// TypeScript compiler itself needs the declarations to accept them.
declare module '*.css'
declare module '*.scss'
declare module '@payloadcms/next/css'
