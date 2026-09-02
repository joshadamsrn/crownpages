import { NextResponse } from 'next/server';
import { getCurrentWhiteLabelTenant } from '@/lib/white-label-tenants';

export async function GET() {
    const tenant = await getCurrentWhiteLabelTenant();
    const assetLinks = [
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": tenant.androidPackageName,
                "sha256_cert_fingerprints": tenant.androidSha256CertFingerprints
            }
        }
    ];

    return NextResponse.json(assetLinks, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': '*',
        },
    });
} 
