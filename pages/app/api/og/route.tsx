import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'CrownPages';

  // For now, return a simple response redirecting to a placeholder service
  // In production, you'd want to use a service like @vercel/og or similar
  const ogImageUrl = `https://via.placeholder.com/1200x630/000000/ffffff?text=${encodeURIComponent(title)}`;
  
  return Response.redirect(ogImageUrl);
} 