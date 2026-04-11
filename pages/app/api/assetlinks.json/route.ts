import { NextResponse } from 'next/server';

export async function GET() {
    const assetLinks = [
        {
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": "com.phnteam.pagesmobile",
                "sha256_cert_fingerprints": [
                    "09:53:E1:48:C5:9C:1C:D6:B3:03:40:09:17:14:51:66:71:DC:D7:F3:A8:FC:1C:31:E0:AE:15:76:E1:24:31:38"
                ]
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