'use client'

/**
 * Loading state shown while the 3D bundle streams in.
 *
 * Uses the same sky gradient as the real scene so the transition is a
 * sharpening rather than a flash of a different-looking screen.
 */
export function SceneLoading() {
  return (
    <div
      data-testid="scene-loading"
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'linear-gradient(180deg, #040a1a 0%, #0a1b3a 45%, #123157 72%, #2c5075 100%)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ display: 'grid', gap: 18, justifyItems: 'center' }}>
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '2px solid rgba(124, 201, 255, 0.18)',
            borderTopColor: 'var(--color-course)',
            animation: 'course-spin 900ms linear infinite',
          }}
        />
        <p className="label-caps" style={{ margin: 0 }}>
          Flugszene wird geladen
        </p>
      </div>

      <style>{`
        @keyframes course-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
