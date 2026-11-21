// Property photos live in a public bucket, so their address can be built directly.
export function publicMediaUrl(key: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-media/${key}`;
}