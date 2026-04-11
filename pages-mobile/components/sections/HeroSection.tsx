import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageSection } from '../../types/page-builder.types';

interface HeroSectionProps {
  section: PageSection;
  styles?: any;
  onButtonPress?: (link: string) => void;
}

export function HeroSection({ section, styles: customStyles, onButtonPress }: HeroSectionProps) {
  const { data } = section;
  
  const renderContent = () => (
    <View style={[styles.content, customStyles?.content]}>
      {data.title && (
        <Text style={[styles.title, customStyles?.title]}>
          {data.title}
        </Text>
      )}
      {data.subtitle && (
        <Text style={[styles.subtitle, customStyles?.subtitle]}>
          {data.subtitle}
        </Text>
      )}
      {data.ctaButton && (
        <TouchableOpacity 
          style={[
            styles.button,
            data.ctaButton.style === 'secondary' && styles.buttonSecondary,
            customStyles?.button
          ]}
          onPress={() => onButtonPress?.(data.ctaButton.link)}
        >
          <Text style={[
            styles.buttonText,
            data.ctaButton.style === 'secondary' && styles.buttonTextSecondary,
            customStyles?.buttonText
          ]}>
            {data.ctaButton.text}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (data.backgroundImage) {
    return (
      <ImageBackground 
        source={{ uri: data.backgroundImage }} 
        style={[styles.container, customStyles?.container]}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {renderContent()}
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={[styles.container, styles.noImageContainer, customStyles?.container]}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 300,
    justifyContent: 'center',
  },
  noImageContainer: {
    backgroundColor: '#f5f5f5',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#fff',
  },
}); 