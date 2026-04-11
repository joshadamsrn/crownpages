import { NextResponse } from 'next/server';

export async function GET() {
    const appSiteAssociation = {
        "applinks": {
            "apps": [],
            "details": [
                {
                    "appID": "643BVN45VK.com.phnteam.pagesmobile",
                    "paths": [
                        // Business pages: /[business-slug]
                        "/*",
                        // Individual pages: /[business-slug]/[page-slug] 
                        "/*/*",
                        // Share links: /share/[shortCode]
                        "/share/*",
                        // Exclude web-only routes
                        "NOT /api/*",
                        "NOT /auth/*",
                        "NOT /protected/*",
                        "NOT /organization/*",
                        "NOT /mobile/*",
                        "NOT /_next/*",
                        "NOT /favicon.ico",
                        "NOT /.well-known/*"
                    ]
                }
            ]
        },
        "webcredentials": {
            "apps": ["643BVN45VK.com.phnteam.pagesmobile"]
        }
    };

    return NextResponse.json(appSiteAssociation, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': '*',
        },
    });
} 