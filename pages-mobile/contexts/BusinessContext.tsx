import React, { createContext, useContext, useEffect, useState } from 'react';
import { Database } from '../database.types';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

type Business = Database['public']['Tables']['businesses']['Row'];

type BusinessContextType = {
  businesses: Business[];
  isLoading: boolean;
  selectedBusiness: Business | null;
  setSelectedBusiness: (business: Business | null) => void;
  refreshBusinesses: () => Promise<void>;
  createBusiness: (name: string, description?: string) => Promise<Business | null>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setSelectedBusiness(null);
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const fetchBusinesses = async () => {
    try {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .or(`owner_id.eq.${session.user.id},id.in.(${await getUserBusinessIds()})`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBusinesses(data || []);
      
      // Auto-select first business if none selected
      if (data && data.length > 0 && !selectedBusiness) {
        setSelectedBusiness(data[0]);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserBusinessIds = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', session?.user?.id);

      if (error) throw error;
      return data?.map(item => item.business_id).join(',') || '';
    } catch (error) {
      console.error('Error fetching user business IDs:', error);
      return '';
    }
  };

  const refreshBusinesses = async () => {
    setIsLoading(true);
    await fetchBusinesses();
  };

  const createBusiness = async (name: string, description?: string): Promise<Business | null> => {
    try {
      if (!session?.user?.id) return null;

      // Generate slug
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_business_slug', { business_name: name });

      if (slugError) throw slugError;

      // Create business
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          name,
          description,
          slug: slugData,
          owner_id: session.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to businesses list
      setBusinesses(prev => [data, ...prev]);
      
      // Auto-select if it's the first business
      if (businesses.length === 0) {
        setSelectedBusiness(data);
      }

      return data;
    } catch (error) {
      console.error('Error creating business:', error);
      return null;
    }
  };

  return (
    <BusinessContext.Provider value={{
      businesses,
      isLoading,
      selectedBusiness,
      setSelectedBusiness,
      refreshBusinesses,
      createBusiness,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
} 