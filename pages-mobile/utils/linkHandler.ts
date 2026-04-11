import { router } from 'expo-router';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export interface CrownPagesLink {
    businessSlug: string;
    pageSlug: string;
    fullUrl: string;
    isValid: boolean;
}

/**
 * Parse a crownpages.com URL to extract business and page information
 */
export function parseCrownPagesUrl(url: string): CrownPagesLink {
    try {
        const urlObj = new URL(url);

        // Check if it's a crownpages.com domain (support both www and non-www)
        const validDomains = ['crownpages.com', 'www.crownpages.com'];
        if (!validDomains.includes(urlObj.hostname.toLowerCase())) {
            return {
                businessSlug: '',
                pageSlug: '',
                fullUrl: url,
                isValid: false
            };
        }

        // Parse the path - expected format: /businessSlug or /businessSlug/pageSlug
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);

        // Filter out system/app routes - these should not be treated as business slugs
        const systemRoutes = [
            '(app)', '(tabs)', 'app', 'auth', 'api', 'protected', 'mobile',
            'organization', 'payment', 'privacy-policy', 'terms-of-service',
            'share', 't', 'admin', '_next', 'static'
        ];

        // Check if the first part is a system route
        if (pathParts.length > 0 && systemRoutes.includes(pathParts[0])) {
            return {
                businessSlug: '',
                pageSlug: '',
                fullUrl: url,
                isValid: false
            };
        }

        if (pathParts.length >= 2) {
            // Individual crown page: /businessSlug/pageSlug
            return {
                businessSlug: pathParts[0],
                pageSlug: pathParts[1],
                fullUrl: url,
                isValid: true
            };
        } else if (pathParts.length === 1) {
            // Business page: /businessSlug
            return {
                businessSlug: pathParts[0],
                pageSlug: '',
                fullUrl: url,
                isValid: true
            };
        }

        return {
            businessSlug: '',
            pageSlug: '',
            fullUrl: url,
            isValid: false
        };
    } catch (error) {
        console.error('Error parsing URL:', error);
        return {
            businessSlug: '',
            pageSlug: '',
            fullUrl: url,
            isValid: false
        };
    }
}

/**
 * Save a crownpages.com link to the user's wallet
 */
export async function saveToWallet(
    url: string,
    userId: string,
    options?: { showSuccess?: boolean }
): Promise<boolean> {
    try {
        const parsedLink = parseCrownPagesUrl(url);

        if (!parsedLink.isValid) {
            Alert.alert('Invalid Link', 'This doesn\'t appear to be a valid CrownPages link.');
            return false;
        }

        // Business pages (without pageSlug) cannot be saved to wallet directly
        if (!parsedLink.pageSlug) {
            Alert.alert('Business Page', 'This is a business directory page. Individual Crown Pages can be saved to your wallet.');
            return false;
        }

        // Find the page in the database - need to properly filter by business
        console.log('Looking for page with slug:', parsedLink.pageSlug, 'and business:', parsedLink.businessSlug);
        
        // First get the business ID
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id')
            .eq('slug', parsedLink.businessSlug)
            .single();
        
        if (businessError || !business) {
            console.error('Business not found:', parsedLink.businessSlug, businessError);
            Alert.alert('Business Not Found', 'The business for this page could not be found.');
            return false;
        }
        
        // Then get the page for that specific business
        const { data: page, error: pageError } = await supabase
            .from('pages')
            .select(`
        *,
        business:businesses(*)
      `)
            .eq('slug', parsedLink.pageSlug)
            .eq('business_id', business.id)
            .eq('is_published', true)
            .eq('is_active', true)
            .maybeSingle();

        if (pageError) {
            console.error('Error fetching page:', pageError);
            Alert.alert('Error', 'Failed to fetch page information. Please check your internet connection and try again.');
            return false;
        }

        if (!page) {
            console.log('Page not found with slug:', parsedLink.pageSlug);
            Alert.alert('Page Not Found', 'This page doesn\'t exist or is no longer available. Make sure the page is published and active.');
            return false;
        }

        console.log('Found page:', page.title, 'owned by business:', (page.business as any)?.name);

        // Business slug already verified above when we fetched by business_id
        const businessData = page.business as any;
        console.log('Found page for business:', businessData?.slug, 'matching expected:', parsedLink.businessSlug);

        // Check if already saved to wallet
        console.log('Checking if page is already saved for user:', userId);
        const { data: existingItem, error: checkError } = await supabase
            .from('wallet_items')
            .select('id')
            .eq('user_id', userId)
            .eq('page_id', page.id)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing wallet item:', checkError);
        }

        if (existingItem) {
            console.log('Page already saved to wallet');
            Alert.alert('Already Saved', 'This page is already in your wallet.');
            return false;
        }

        console.log('Proceeding to save page to wallet...');

        // Save to wallet
        console.log('Saving page to wallet:', { user_id: userId, page_id: page.id });
        const { error: insertError } = await supabase
            .from('wallet_items')
            .insert({
                user_id: userId,
                page_id: page.id,
                saved_at: new Date().toISOString(),
                is_favorite: false
            });

        if (insertError) {
            console.error('Error saving to wallet:', insertError);
            Alert.alert('Error', `Failed to save page to wallet: ${insertError.message || 'Unknown error'}`);
            return false;
        }

        console.log('Successfully saved page to wallet!');

        // Update save count for the page
        console.log('Updating save count for page:', page.id);
        const { error: updateError } = await supabase
            .from('pages')
            .update({ save_count: (page.save_count || 0) + 1 })
            .eq('id', page.id);

        if (updateError) {
            console.error('Error updating save count:', updateError);
        }

        if (options?.showSuccess !== false) {
            Alert.alert(
                'Saved to Wallet',
                `"${page.title}" has been saved to your wallet.`,
                [
                    { text: 'View Wallet', onPress: () => router.push('/(app)/(tabs)/wallet') },
                    { text: 'OK' }
                ]
            );
        }

        return true;
    } catch (error) {
        console.error('Error saving to wallet:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
        return false;
    }
}



/**
 * Open a Crown Pages link - ALWAYS opens in browser (not in-app viewer)
 * Handles both business pages and individual crown pages
 */
export function openCrownPageInViewer(url: string) {
    try {
        const parsedLink = parseCrownPagesUrl(url);

        if (!parsedLink.isValid) {
            Alert.alert('Invalid Link', 'This doesn\'t appear to be a valid CrownPages link.');
            return;
        }

        // Open Crown Pages in external browser
        console.log('Opening Crown Page in browser:', url);
        import('expo-linking').then(({ default: Linking }) => {
            Linking.openURL(url).catch((err) => {
                console.error('Error opening URL in browser:', err);
                Alert.alert('Error', 'Could not open page in browser.');
            });
        });
    } catch (error) {
        console.error('Error opening Crown Page:', error);
        Alert.alert('Error', 'Failed to open Crown Page.');
    }
}

/**
 * Handle universal links when the app is opened via Crown Pages URL
 */
export function handleUniversalLink(url: string) {
    console.log('Handling universal link:', url);

    const parsedLink = parseCrownPagesUrl(url);

    if (parsedLink.isValid) {
        // Open in page viewer
        openCrownPageInViewer(url);
    } else {
        console.warn('Invalid Crown Pages URL:', url);
    }
} 