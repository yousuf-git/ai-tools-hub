import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '36px',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="60" y="28" width="8" height="72" rx="4" fill="white"/>
          <rect x="28" y="60" width="72" height="8" rx="4" fill="white"/>
          <rect x="60" y="60" width="8" height="50" rx="4" transform="rotate(45 64 64)" fill="white"/>
          <rect x="60" y="60" width="8" height="50" rx="4" transform="rotate(-45 64 64)" fill="white"/>
          <circle cx="64" cy="28" r="5" fill="white"/>
          <circle cx="64" cy="100" r="5" fill="white"/>
          <circle cx="28" cy="64" r="5" fill="white"/>
          <circle cx="100" cy="64" r="5" fill="white"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
