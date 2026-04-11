import { Session } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { unpublishAllUserPages } from '../utils'
import { RevenueCatService } from '../utils/revenuecat'
import { SubscriptionService } from '../utils/subscriptionService'
import { supabase } from '../utils/supabase'

type AuthContextType = {
  session: Session | null
  isLoading: boolean
  showInactiveModal: boolean
  setShowInactiveModal: (show: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInactiveModal, setShowInactiveModal] = useState(false)

  // Handle RevenueCat operations with error resilience
  const handleRevenueCatOperation = async (operation: () => Promise<void>, operationName: string) => {
    try {
      await operation()
    } catch (error) {
      console.warn(`RevenueCat ${operationName} failed (non-critical):`, error)
      // Don't throw the error - just log it as RevenueCat is not critical for core auth flow
    }
  }

  // Check if user is inactive and handle accordingly
  const handleInactiveUserCheck = async (userId: string) => {
    try {
      // CRITICAL: Force refresh subscription status to get fresh RevenueCat data
      // This ensures we don't use stale cached data that might not reflect 
      // the user's actual subscription status
      console.log('🔄 Checking user subscription status with fresh data...')
      const subscriptionInfo = await SubscriptionService.forceRefreshSubscriptionStatus()

      // Check if user has expired trial (inactive status)
      // Logic matches SubscriptionContext: hasExpiredTrial = status === 'free' && !hasNoPlan
      const hasNoPlan = subscriptionInfo.status === 'no_plan'
      const hasExpiredTrial = subscriptionInfo.status === 'free' && !hasNoPlan

      console.log('📊 Subscription status check:', {
        userId,
        hasProAccess: subscriptionInfo.hasProAccess,
        source: subscriptionInfo.source,
        status: subscriptionInfo.status,
        hasNoPlan,
        hasExpiredTrial
      })

      // Only mark as inactive if they truly have expired trial AND no pro access
      if (hasExpiredTrial && !subscriptionInfo.hasProAccess) {
        console.log('Inactive user detected, unpublishing pages...')

        // Unpublish all user pages
        const result = await unpublishAllUserPages(userId)

        if (result.success) {
          console.log('Successfully unpublished all user pages')
        } else {
          console.error('Failed to unpublish user pages:', result.error)
        }

        // Show inactive modal after a brief delay
        setTimeout(() => {
          setShowInactiveModal(true)
        }, 1000)
      } else {
        console.log('✅ User has active subscription, no action needed')
      }
    } catch (error) {
      console.error('Error checking inactive user status:', error)
      // Don't show inactive modal on error - fail gracefully
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)

      // Identify user with RevenueCat if logged in
      if (session?.user?.id) {
        handleRevenueCatOperation(
          () => RevenueCatService.identifyUser(session.user.id),
          'user identification'
        )
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      // Handle RevenueCat user identification based on auth state
      if (event === 'SIGNED_IN' && session?.user?.id) {
        // Add a small delay for new signups to let database triggers complete
        const isNewUser = event === 'SIGNED_IN' && !session.user.email_confirmed_at;
        const delay = isNewUser ? 2000 : 0; // 2 second delay for new users

        setTimeout(() => {
          handleRevenueCatOperation(
            () => RevenueCatService.identifyUser(session.user.id),
            'user sign in'
          )
        }, delay);

        // Check for inactive user status and handle accordingly
        // Increased delay to ensure RevenueCat has fully synced subscription data
        setTimeout(() => {
          handleInactiveUserCheck(session.user.id)
        }, delay + 3000); // Give RevenueCat 3+ seconds to sync after identification
      } else if (event === 'SIGNED_OUT') {
        // RevenueCat logout is handled in the manual signOut function
        // No need to logout again here to avoid double-logout errors
        // Reset inactive modal state on sign out
        setShowInactiveModal(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    // Note: RevenueCat identification happens in the auth state change listener
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })

    // Don't let RevenueCat issues affect the signup process
    // RevenueCat identification will happen in the auth state change listener when the user confirms their email

    return { error }
  }

  const signOut = async () => {
    try {
      // Log out from RevenueCat first (but don't let errors block the signout)
      await handleRevenueCatOperation(
        () => RevenueCatService.logOutUser(),
        'sign out'
      )
    } catch (error) {
      console.log('RevenueCat logout completed with handling for any edge cases')
    }

    // Then log out from Supabase
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, isLoading, showInactiveModal, setShowInactiveModal, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 