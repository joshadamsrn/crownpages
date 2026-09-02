<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

# CrownPages NextJS Renderer

A NextJS application that renders CrownPages from JSON content stored in Supabase. This is the web rendering component of the CrownPages platform that displays pages created in the mobile app.

## Features

- **JSON-based Page Rendering**: Renders pages from structured JSON content stored in Supabase
- **Section-based Architecture**: Modular section components (Hero, About, Contact, Features, Gallery, Testimonials, FAQ, Documents, CTA)
- **Analytics Tracking**: Comprehensive analytics for page views, clicks, downloads, and user interactions
- **Share Links**: Support for secure, trackable share links with expiration and view limits
- **Responsive Design**: Mobile-first responsive design that works across all devices
- **Business Theming**: Dynamic theming based on business brand colors and fonts
- **Save to Wallet**: Users can save pages to their personal wallet for later access
- **Apple / Google Wallet APIs**: Web save sheet supports real wallet handoff when issuer credentials are configured

## Architecture

### Page Structure

Pages are rendered from JSON content with the following structure:

```json
{
  "sections": [
    {
      "id": "section_id",
      "type": "hero",
      "data": {
        "title": "Welcome",
        "subtitle": "Your subtitle",
        "ctaButton": {
          "text": "Get Started",
          "link": "#contact"
        }
      }
    }
  ]
}
```

### Supported Section Types

1. **Hero Section** (`hero`)
   - Title, subtitle, CTA button
   - Optional background image
2. **About Section** (`about`)

   - Title and rich text content
   - Optional side image

3. **Contact Section** (`contact`)

   - Email, phone, address, hours
   - Trackable contact links

4. **Features Section** (`features`)

   - Grid of features with icons
   - Customizable feature list

5. **Gallery Section** (`gallery`)

   - Image gallery with hover effects
   - Responsive grid layout

6. **Testimonials Section** (`testimonials`)

   - Customer testimonials with ratings
   - Name and position display

7. **FAQ Section** (`faq`)

   - Collapsible Q&A interface
   - Interactive accordion design

8. **Documents Section** (`documents`)

   - Downloadable files and resources
   - File type icons and tracking

9. **CTA Section** (`cta`)
   - Call-to-action with button
   - Prominent placement and styling

### URL Structure

- **Direct Pages**: `/{slug}` - Renders published pages by slug
- **Share Links**: `/share/{shortCode}` - Renders pages via trackable share links

### Analytics

The system tracks the following events:

- Page views
- Button clicks
- Link clicks
- Phone/email clicks
- Address clicks
- Document downloads
- Page saves

### Database Schema

The system uses the following main tables:

- `pages` - Page content and metadata
- `businesses` - Business information and branding
- `analytics_events` - User interaction tracking
- `share_links` - Secure sharing functionality
- `wallet_items` - User-saved pages

## Getting Started

1. Ensure your Supabase project is set up with the required tables
2. Set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Testing the System

To test the page rendering:

1. Create a page in your Supabase `pages` table with JSON content
2. Set `is_published` to `true`
3. Access the page at `/{your_page_slug}`

Example page data:

```json
{
  "sections": [
    {
      "id": "hero_1",
      "type": "hero",
      "data": {
        "title": "Welcome to My Business",
        "subtitle": "We provide excellent services",
        "ctaButton": {
          "text": "Contact Us",
          "link": "tel:555-0123"
        }
      }
    }
  ]
}
```

## API Routes

- `GET /api/og` - Open Graph image generation
- `POST /api/wallet` - Apple Wallet / Google Wallet save handoff
- Page rendering handles all analytics automatically

## Wallet Setup

Wallet configuration is documented in [docs/wallet-setup.md](./docs/wallet-setup.md).
Use [pages/.env.wallet.example](./.env.wallet.example) as the variable template when wiring issuer credentials locally.

## Performance Features

- Server-side rendering for SEO
- Optimized analytics tracking
- Lazy loading of images
- Responsive image handling
- Efficient database queries

## Security Features

- Share link expiration
- View count limits
- RLS (Row Level Security) on all tables
- Secure analytics tracking
- Protected routes for private pages

This system provides a complete web rendering solution for CrownPages, enabling businesses to share their mobile-created pages on the web with full analytics and user engagement tracking.

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)

** Generating project types from supabase schema **

```bash
supabase gen types typescript --project-id "dbrbbqntpuujgjcinoek" --schema public > database.types.ts
```
