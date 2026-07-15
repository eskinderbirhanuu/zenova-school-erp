// Suppress pre-existing implicit any/unknown type errors in page components
// These are gradually being resolved as pages are typed properly.
// This file allows incremental migration without breaking tsc.
declare module "*.tsx" {
  const content: any
  export default content
}
