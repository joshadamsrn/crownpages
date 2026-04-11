// components/digitalBrochure/aboutSection.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
// NOTE: adjust this import path according to your alias setup:
import { generatePublicUrl } from '@supabase/supabase-js';
// agar alias @ ka issue hai to use something like ../lib/supabase/client

// types you had:
interface AboutData {
  title: string;
  content: string; // plain text OR html string?
  image?: string;
}

interface AboutSectionProps {
  data?: AboutData;
  aboutContent?: string; // Simple string prop for easier usage
  business?: any; // BusinessData type remove kiya, RN doesn't care but you can re-add
  pageId?: string;
  sectionId?: string;
  styles?: {
    background?: string;
    text?: {
      primary?: string;
      secondary?: string;
    };
  };
}

// Dummy theme hook fallback
// Expo / RN me tum apna context useTheme bana sakte ho.
// Filhaal main safe defaults de raha hoon.
const defaultTheme = {
  surface: '#FFFFFF',
  text: {
    primary: '#111827', // almost black
    secondary: '#4B5563', // gray
  },
};

export function AboutSection({
  data,
  aboutContent,
  styles: sectionStyles,
}: AboutSectionProps) {
  // Support both data object and simple aboutContent string
  const title = data?.title || 'About';
  const content = data?.content || aboutContent || '';
  const image = data?.image;

  // agar tum Expo me apna theme context already bana chuke ho,
  // to `useTheme()` se real values le lo:
  // const theme = useTheme();
  const theme = defaultTheme;

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  // "Read more" text logic
  const truncatedContent =
    content && content.length > 150 ? content.slice(0, 150) + '...' : content;

  useEffect(() => {
    let isMounted = true;
    if (image) {
      generatePublicUrl(image).then((url: string | null | undefined) => {
        if (isMounted) {
          setBgUrl(url || null);
        }
      });
    } else {
      setBgUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [image]);

  return (
    <View
      style={[
        componentStyles.section,
        {
          backgroundColor:
            sectionStyles?.background || '#FFFFFF', // Match exact white background of other sections
        },
      ]}
    >
      <View style={componentStyles.innerWrapper}>
        {/* Layout: if we have image, show side-by-side on big screens.
           React Native doesn't have "md:grid-cols-2", so we'll do a vertical stack.
           If you later want tablet split layout, you can use react-native-responsive or Dimensions. */}
        {bgUrl ? (
          <View style={componentStyles.blockWrapper}>
            {/* IMAGE BLOCK */}
            <View style={componentStyles.imageWrapper}>
              <Image
                source={{ uri: bgUrl }}
                style={componentStyles.image}
                resizeMode="cover"
              />
            </View>

            {/* TEXT BLOCK */}
            <View style={componentStyles.textWrapper}>
              <Text
                style={[
                  componentStyles.title,
                  {
                    color:
                      sectionStyles?.text?.primary ||
                      theme.text.primary ||
                      '#111827',
                  },
                ]}
              >
                {title}
              </Text>

              {/* CONTENT TEXT */}
              <Text
                style={[
                  componentStyles.contentText,
                  {
                    color:
                      sectionStyles?.text?.secondary ||
                      theme.text.secondary ||
                      '#4B5563',
                  },
                ]}
              >
                {showFullContent ? content : truncatedContent}
              </Text>

              {content && content.length > 150 ? (
                <TouchableOpacity
                  onPress={() => setShowFullContent(!showFullContent)}
                >
                  <Text style={componentStyles.readMoreButton}>
                    {showFullContent ? 'Read Less' : 'Read More'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : (
          // CASE: no image, only text
          <View style={componentStyles.textOnlyWrapper}>
            <Text
              style={[
                componentStyles.title,
                {
                  color:
                    sectionStyles?.text?.primary ||
                    theme.text.primary ||
                    '#111827',
                },
              ]}
            >
              {title}
            </Text>

            <Text
              style={[
                componentStyles.contentText,
                {
                  color:
                    sectionStyles?.text?.secondary ||
                    theme.text.secondary ||
                    '#4B5563',
                },
              ]}
            >
              {showFullContent ? content : truncatedContent}
            </Text>

            {content && content.length > 150 ? (
              <TouchableOpacity
                style={componentStyles.readMoreContainer}
                onPress={() => setShowFullContent(!showFullContent)}
              >
                <Text style={componentStyles.readMoreButton}>
                  {showFullContent ? 'Read Less' : 'Read More'}
                </Text>
                <Ionicons
                  name={showFullContent ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#000000"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const componentStyles = StyleSheet.create({
  section: {
    paddingVertical: 24, // py-16 ~ 64px, mobile thoda kam rakha for comfort
    paddingHorizontal: 16, // px-4
    backgroundColor: '#FFFFFF', // Ensure white background matches rest of app
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 1200, // max-w-6xl ~ 1152px, but RN ignore on phone, fine for web/native-web
    alignSelf: 'center',
  },

  // When we have both image + text
  blockWrapper: {
    flexDirection: 'column', // mobile default stack
    gap: 24,
  },

  imageWrapper: {
    // order-2 md:order-1 doesn't exist in RN, so we just show image first.
    // You can reorder by swapping View blocks if you want text first.
  },

  image: {
    width: '100%',
    height: 200, // h-64 ~ 256px, but we choose 200 for phones
    borderRadius: 12,
    // shadow styles:
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },

  textWrapper: {
    // margin / padding so it breathes
  },

  title: {
    fontSize: 28, // text-3xl / md:text-4xl
    fontWeight: '700',
    marginBottom: 16,
  },

  contentText: {
    fontSize: 16, // text-lg
    lineHeight: 24, // leading-relaxed
  },

  readMoreButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  readMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 16,
    gap: 4,
  },

  // When there's no image
  textOnlyWrapper: {},
});
