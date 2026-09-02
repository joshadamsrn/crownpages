import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { PKPass } from 'passkit-generator';
import sharp from 'sharp';

interface WalletRequestBody {
  platform: 'ios' | 'android' | 'generic';
  pageId: string;
  pageUrl: string;
  pageTitle: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  mode?: 'preflight';
}

const requiredGoogleEnv = [
  'GOOGLE_WALLET_ISSUER_ID',
  'GOOGLE_WALLET_CLASS_ID',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY',
] as const;

const requiredAppleEnv = [
  'APPLE_WALLET_TEAM_IDENTIFIER',
  'APPLE_WALLET_PASS_TYPE_IDENTIFIER',
  'APPLE_WALLET_ORGANIZATION_NAME',
  'APPLE_WALLET_WWDR_CERT',
  'APPLE_WALLET_SIGNER_CERT',
  'APPLE_WALLET_SIGNER_KEY',
] as const;

function getMissingEnv(keys: readonly string[]) {
  return keys.filter((key) => !process.env[key]);
}

function parseWalletRequest(searchParams: URLSearchParams): WalletRequestBody {
  return {
    platform: (searchParams.get('platform') as WalletRequestBody['platform']) || 'generic',
    pageId: searchParams.get('pageId') || '',
    pageUrl: searchParams.get('pageUrl') || '',
    pageTitle: searchParams.get('pageTitle') || '',
    mode: (searchParams.get('mode') as WalletRequestBody['mode']) || undefined,
    businessName: searchParams.get('businessName') || undefined,
    address: searchParams.get('address') || undefined,
    phone: searchParams.get('phone') || undefined,
    email: searchParams.get('email') || undefined,
    contactName: searchParams.get('contactName') || undefined,
    heroImageUrl: searchParams.get('heroImageUrl') || undefined,
    logoUrl: searchParams.get('logoUrl') || undefined,
  };
}

async function getGoogleAccessToken() {
  const missingEnv = getMissingEnv([
    'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY',
  ]);

  if (missingEnv.length > 0) {
    return {
      ok: false as const,
      status: 501,
      error: `Google Wallet auth is not configured. Missing: ${missingEnv.join(', ')}`,
    };
  }

  const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;

  const assertion = jwt.sign(
    {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      exp: expiresAt,
      iat: issuedAt,
    },
    privateKey,
    {
      algorithm: 'RS256',
    }
  );

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return {
      ok: false as const,
      status: tokenResponse.status,
      error: `Unable to authenticate Google Wallet service account: ${errorText}`,
    };
  }

  const tokenPayload = await tokenResponse.json();
  return {
    ok: true as const,
    accessToken: tokenPayload.access_token as string,
  };
}

async function ensureGoogleWalletClass(classId: string, accessToken: string, body: WalletRequestBody) {
  const getResponse = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${encodeURIComponent(classId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (getResponse.ok) {
    return { ok: true as const };
  }

  if (getResponse.status !== 404) {
    return {
      ok: false as const,
      status: getResponse.status,
      error: `Unable to verify Google Wallet class ${classId}.`,
    };
  }

  const classPayload = {
    id: classId,
    imageModulesData: body.heroImageUrl
      ? [
          {
            mainImage: {
              sourceUri: {
                uri: body.heroImageUrl,
              },
            },
          },
        ]
      : undefined,
    textModulesData: [
      body.address
        ? {
            id: 'address',
            header: 'Address',
            body: body.address,
          }
        : null,
      {
        id: 'about',
        header: 'Saved from Crown Pages',
        body: 'Open this pass to jump back to the live page.',
      },
    ].filter(Boolean),
    linksModuleData: {
      uris: [
        {
          id: 'open-page',
          description: 'Open Crown Page',
          uri: body.pageUrl,
        },
      ],
    },
  };

  const insertResponse = await fetch('https://walletobjects.googleapis.com/walletobjects/v1/genericClass', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(classPayload),
  });

  if (!insertResponse.ok) {
    const errorText = await insertResponse.text();
    return {
      ok: false as const,
      status: insertResponse.status,
      error: `Unable to create Google Wallet class ${classId}: ${errorText}`,
    };
  }

  return { ok: true as const };
}

function createGoogleWalletUrl(body: WalletRequestBody, origin: string) {
  const missingEnv = getMissingEnv(requiredGoogleEnv);
  if (missingEnv.length > 0) {
    return {
      ok: false as const,
      status: 501,
      error: `Google Wallet is not configured. Missing: ${missingEnv.join(', ')}`,
    };
  }

  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const classId = process.env.GOOGLE_WALLET_CLASS_ID!;
  const clientEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const objectSuffix = `${body.pageId}-${Date.now()}`.replace(/[^a-zA-Z0-9._-]/g, '-');
  const objectId = `${issuerId}.${objectSuffix}`;
  const headerText = body.businessName || body.pageTitle;

  const genericObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: '#FFFFFF',
    logo: body.logoUrl
      ? {
          sourceUri: {
            uri: body.logoUrl,
          },
        }
      : undefined,
    heroImage: body.heroImageUrl
      ? {
          sourceUri: {
            uri: body.heroImageUrl,
          },
        }
      : undefined,
    cardTitle: {
      defaultValue: {
        language: 'en-US',
        value: headerText,
      },
    },
    header: {
      defaultValue: {
        language: 'en-US',
        value: body.pageTitle,
      },
    },
    subheader: body.address
      ? {
          defaultValue: {
            language: 'en-US',
            value: body.address,
          },
        }
      : undefined,
    barcode: {
      type: 'QR_CODE',
      value: body.pageUrl,
      alternateText: 'Open Crown Page',
    },
    textModulesData: [
      body.contactName
        ? {
            id: 'contact',
            header: 'Contact',
            body: body.contactName,
          }
        : null,
      body.phone
        ? {
            id: 'phone',
            header: 'Phone',
            body: body.phone,
          }
        : null,
      body.email
        ? {
            id: 'email',
            header: 'Email',
            body: body.email,
          }
        : null,
      {
        id: 'page-link',
        header: 'Crown Page',
        body: body.pageUrl,
      },
    ].filter(Boolean),
    linksModuleData: {
      uris: [
        {
          id: 'open-page',
          description: 'Open Crown Page',
          uri: body.pageUrl,
        },
      ],
    },
  };

  const claims = {
    iss: clientEmail,
    aud: 'google',
    origins: [origin],
    typ: 'savetowallet',
    payload: {
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
  });

  return {
    ok: true as const,
    saveUrl: `https://pay.google.com/gp/v/save/${token}`,
  };
}

async function getDefaultPassAssetBuffer() {
  const fallbackLogoPath = path.join(process.cwd(), 'public', 'lightlogo.png');
  return readFile(fallbackLogoPath);
}

async function fetchWalletImageBuffer(url?: string) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    if (contentType.includes('png')) {
      return inputBuffer;
    }

    if (contentType.startsWith('image/')) {
      return await sharp(inputBuffer).png().toBuffer();
    }

    return null;
  } catch {
    return null;
  }
}

async function createAppleWalletPass(body: WalletRequestBody) {
  const missingEnv = getMissingEnv(requiredAppleEnv);
  if (missingEnv.length > 0) {
    return {
      ok: false as const,
      status: 501,
      error: `Apple Wallet is not configured. Missing: ${missingEnv.join(', ')}`,
    };
  }

  const [
    fallbackAsset,
    dynamicLogo,
    dynamicStrip,
  ] = await Promise.all([
    getDefaultPassAssetBuffer(),
    fetchWalletImageBuffer(body.logoUrl),
    fetchWalletImageBuffer(body.heroImageUrl),
  ]);

  const basePassJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_IDENTIFIER!,
    teamIdentifier: process.env.APPLE_WALLET_TEAM_IDENTIFIER!,
    organizationName: process.env.APPLE_WALLET_ORGANIZATION_NAME!,
    description: 'Crown Pages saved page',
    logoText: 'Crown Pages',
    foregroundColor: 'rgb(17,24,39)',
    backgroundColor: 'rgb(255,255,255)',
    labelColor: 'rgb(107,114,128)',
    suppressStripShine: true,
    generic: {},
  };

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(basePassJson), 'utf8'),
      'icon.png': fallbackAsset,
      'icon@2x.png': fallbackAsset,
      'logo.png': dynamicLogo || fallbackAsset,
      'logo@2x.png': dynamicLogo || fallbackAsset,
      ...(dynamicStrip
        ? {
            'strip.png': dynamicStrip,
            'strip@2x.png': dynamicStrip,
          }
        : {}),
    },
    {
      wwdr: process.env.APPLE_WALLET_WWDR_CERT!,
      signerCert: process.env.APPLE_WALLET_SIGNER_CERT!,
      signerKey: process.env.APPLE_WALLET_SIGNER_KEY!.replace(/\\n/g, '\n'),
      signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
    },
    {
      serialNumber: `${body.pageId}-${Date.now()}`,
      description: body.pageTitle,
      organizationName: process.env.APPLE_WALLET_ORGANIZATION_NAME!,
      logoText: body.businessName || body.pageTitle,
    }
  );

  pass.type = 'generic';
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: body.pageUrl,
    messageEncoding: 'iso-8859-1',
    altText: 'Open Crown Page',
  });

  pass.primaryFields.push({
    key: 'title',
    label: 'Page',
    value: body.pageTitle,
  });

  if (body.address) {
    pass.secondaryFields.push({
      key: 'address',
      label: 'Address',
      value: body.address,
    });
  }

  if (body.contactName) {
    pass.auxiliaryFields.push({
      key: 'contact',
      label: 'Contact',
      value: body.contactName,
    });
  }

  if (body.phone) {
    pass.backFields.push({
      key: 'phone',
      label: 'Phone',
      value: body.phone,
    });
  }

  if (body.email) {
    pass.backFields.push({
      key: 'email',
      label: 'Email',
      value: body.email,
    });
  }

  pass.backFields.push({
    key: 'link',
    label: 'Crown Page',
    value: body.pageUrl,
  });

  if (body.address) {
    pass.backFields.push({
      key: 'address-back',
      label: 'Address',
      value: body.address,
    });
  }

  const buffer = pass.getAsBuffer();
  const fileName = `${(body.pageTitle || 'crown-page').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pkpass`;

  return {
    ok: true as const,
    buffer,
    fileName,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WalletRequestBody;
    return await handleWalletRequest(body, request.nextUrl.origin);
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json(
      { error: 'Unable to prepare wallet save.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const body = parseWalletRequest(request.nextUrl.searchParams);
    return await handleWalletRequest(body, request.nextUrl.origin);
  } catch (error) {
    console.error('Wallet API error:', error);
    return NextResponse.json(
      { error: 'Unable to prepare wallet save.' },
      { status: 500 }
    );
  }
}

async function handleWalletRequest(body: WalletRequestBody, origin: string) {
  if (!body?.pageId || !body?.pageUrl || !body?.pageTitle) {
    return NextResponse.json(
      { error: 'Missing required wallet payload.' },
      { status: 400 }
    );
  }

  if (body.platform === 'android') {
    const tokenResult = await getGoogleAccessToken();
    if (!tokenResult.ok) {
      return NextResponse.json(
        { error: tokenResult.error, fallback: 'app' },
        { status: tokenResult.status }
      );
    }

    const classResult = await ensureGoogleWalletClass(
      process.env.GOOGLE_WALLET_CLASS_ID!,
      tokenResult.accessToken,
      body
    );
    if (!classResult.ok) {
      return NextResponse.json(
        { error: classResult.error, fallback: 'app' },
        { status: classResult.status }
      );
    }

    const result = createGoogleWalletUrl(body, origin);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fallback: 'app' },
        { status: result.status }
      );
    }

    return NextResponse.json({
      platform: 'google',
      saveUrl: result.saveUrl,
    });
  }

  if (body.platform === 'ios') {
    if (body.mode === 'preflight') {
      const result = await createAppleWalletPass(body);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            fallback: 'app',
          },
          { status: result.status }
        );
      }

      return NextResponse.json({
        ready: true,
      });
    }

    const result = await createAppleWalletPass(body);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          fallback: 'app',
        },
        { status: result.status }
      );
    }

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(
    {
      error: 'Wallet save is only available on supported mobile devices.',
    },
    { status: 400 }
  );
}
