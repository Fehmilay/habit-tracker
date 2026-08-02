interface AircraftGlyphProps {
  size?: number
  color?: string
  className?: string
  rotationDegrees?: number
}

/**
 * A small vector airliner silhouette for 2D UI (map markers, hangar cards).
 *
 * Not an emoji and not a stock icon-font glyph - both render inconsistently
 * across platforms and read as decorative rather than as part of the product.
 * This is the same top-down silhouette language as the 3D aircraft: a
 * fuselage, swept wings and a tail, nose pointing up by default.
 */
export function AircraftGlyph({
  size = 20,
  color = 'currentColor',
  className,
  rotationDegrees = 0,
}: AircraftGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={rotationDegrees ? { transform: `rotate(${rotationDegrees}deg)` } : undefined}
      aria-hidden="true"
    >
      <path
        d="M12 1.4c.8 0 1.35.98 1.5 2.7l.06 1.9 6.9 4.36c.4.25.64.7.64 1.18v1.02c0 .5-.42.87-.9.78l-6.64-1.22v3.9l2.36 1.7c.22.16.35.42.35.7v.98c0 .5-.44.87-.92.77L12 18.9l-3.35 1.19c-.48.1-.92-.27-.92-.77v-.98c0-.28.13-.54.35-.7l2.36-1.7v-3.9l-6.64 1.22c-.48.09-.9-.28-.9-.78v-1.02c0-.48.24-.93.64-1.18l6.9-4.36.06-1.9c.15-1.72.7-2.7 1.5-2.7Z"
        fill={color}
      />
    </svg>
  )
}
