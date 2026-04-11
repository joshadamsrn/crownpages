'use client';

import React, { useState } from 'react';
import { trackSave } from '@/lib/analytics';
import { createClient } from '@/lib/supabase/client';

interface SavePageButtonProps {
  pageId: string;
}

export function SavePageButton({ pageId }: SavePageButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // For non-authenticated users, we can show a message or redirect to login
        alert('Please sign in to save pages to your wallet');
        return;
      }

      // Check if already saved
      const { data: existingItem } = await supabase
        .from('wallet_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('page_id', pageId)
        .single();

      if (existingItem) {
        // Remove from wallet
        await supabase
          .from('wallet_items')
          .delete()
          .eq('id', existingItem.id);
        
        setIsSaved(false);
      } else {
        // Add to wallet
        await supabase
          .from('wallet_items')
          .insert({
            user_id: user.id,
            page_id: pageId,
          });
        
        setIsSaved(true);
        // Track the save event
        await trackSave(pageId, user.id);
      }
    } catch (error) {
      console.error('Failed to save page:', error);
      alert('Failed to save page. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
        ${isSaved 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <svg 
        className={`w-5 h-5 ${isSaved ? 'fill-current' : 'stroke-current fill-none'}`}
        viewBox="0 0 24 24" 
        strokeWidth={2}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {isLoading ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
    </button>
  );
} 