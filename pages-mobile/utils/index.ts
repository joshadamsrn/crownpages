import { supabase } from './supabase';

export const isValidEmail = (email: string): boolean => {
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Export link handler functions
export {
  handleUniversalLink, openCrownPageInViewer, parseCrownPagesUrl,
  saveToWallet, type CrownPagesLink
} from './linkHandler';

// Export RevenueCat service
export { RevenueCatService } from './revenuecat';

/**
 * Unpublishes all pages for a user (used when account becomes inactive)
 */
export const unpublishAllUserPages = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('pages')
      .update({
        is_published: false,
        published_at: null
      })
      .eq('created_by', userId)
      .eq('is_published', true);

    if (error) {
      console.error('Error unpublishing user pages:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error unpublishing user pages:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

