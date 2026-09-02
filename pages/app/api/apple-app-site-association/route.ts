import { NextResponse } from 'next/server';
import { getCurrentWhiteLabelTenant } from '@/lib/white-label-tenants';

export async function GET() {
    const tenant = await getCurrentWhiteLabelTenant();
    const appId = `${tenant.appleTeamId}.${tenant.iosBundleIdentifier}`;
    const appSiteAssociation = {
        "applinks": {
            "apps": [],
            "details": [
                {
                    "appID": appId,
                    "paths": [
                        // Public Crown Page URLs should open on the live website.
                        // Keep universal links reserved for explicit app-only paths.
                        "/app/*"
                    ]
                }
            ]
        },
        "webcredentials": {
            "apps": [appId]
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
