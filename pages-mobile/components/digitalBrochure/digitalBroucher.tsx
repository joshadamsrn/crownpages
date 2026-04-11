import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import HeroSection from './heroSection';

const { width } = Dimensions.get('window');

const AbbingtonMurray = () => {
  const router = useRouter();
  const [showMoreLinks, setShowMoreLinks] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [isContactSaved, setIsContactSaved] = useState(false);

  const amenities = [
    { name: 'Movie Section', icon: '🎬' },
    { name: 'Pool', icon: '🏊' },
    { name: 'Golf Simulator', icon: '⛳' },
    { name: 'Gym', icon: '💪' },
    { name: 'Assisted Living', icon: '🏥' },
    { name: 'Trophy Room', icon: '🏆' },
    { name: 'Library', icon: '📚' },
    { name: 'Salon', icon: '💇' },
  ];

  const links = [
    { title: 'PRICING', icon: '💰' },
    { title: 'FLOOR PLANS', icon: '📋' },
    { title: 'ACTIVITIES CALENDAR', icon: '📅' },
    { title: 'DINING CALENDAR', icon: '🍽️' },
    { title: 'WELCOME INFO', icon: 'ℹ️' },
  ];

  const photoThumbnails = [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=400&h=250&fit=crop',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=250&fit=crop',
  ];

  const aboutText = `Our 108 independent assisted living & memory care apartments feature beautiful interiors with mountain views, spacious yet cozy apartments that will make you want to stay & enjoy all the luxury amenities the community of Abbington has to offer. Some highlights our residents enjoy the most include the Sundial Cream Parlor for gathering with friends, three gourmet meals served in a restaurant-style dining room, & luxuries like our library, full-service hair salon, great room, fitness center, movie theater room, & more. Whether you want to enjoy an independent lifestyle, need some additional support daily assistance from our nurses, or need the option of a Murray memory care unit, this is home.`;

  const truncatedAbout = aboutText.slice(0, 150) + '...';

  const handleSaveContact = () => {
    // Navigate to Save Contact Screen with contact data
    router.push({
      pathname: '/SaveContactScreen',
      params: {
        contactName: 'Lindsay Snow',
        contactRole: 'Sales Director',
        communityName: 'The Abbington of Murray',
        address: '5377 South State Street, Murray, Utah, 84107',
        phone: '(301) 351-7750', // You can add actual phone number here
        email: 'lindsay.snow@abbington.com' // You can add actual email here
      }
    });
  };

  const handleContactPress = () => {
    // Navigate to contact profile screen
    router.push({
      pathname: '/ContactProfileScreen',
      params: {
        contactName: 'Lindsay Snow',
        contactRole: 'Sales Director',
        phone: '(301) 351-7750',
        email: 'lindsay.snow@abbington.com'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2C6BED" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#141414" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSubtitle}>The Abbington of</Text>
          <Text style={styles.headerTitle}>Murray</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="bookmark-border" size={24} color="#141414" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="share" size={24} color="#141414" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        {/* <View style={styles.heroImageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=250&fit=crop' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Assisted Living</Text>
          </View>
        </View> */}
        <HeroSection heroImageUrl={photoThumbnails[0] }/>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Title and Address */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>The Abbington of Murray</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>★★★★★</Text>
              <Text style={styles.ratingCount}>(4.8 • 124 reviews)</Text>
            </View>
            <View style={styles.addressContainer}>
              <Icon name="location-on" size={18} color="#666666" style={styles.locationIcon} />
              <Text style={styles.address}>5377 South State Street, Murray, Utah, 84107</Text>
            </View>
          </View>

          {/* Contact Person */}
          <View style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>Lindsay Snow</Text>
              <Text style={styles.contactRole}>Sales Director</Text>
              <View style={styles.contactStatus}>
                <View style={styles.statusIndicator} />
                <Text style={styles.statusText}>Available Now</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveContactButton, isContactSaved && styles.savedContactButton]}
              onPress={handleSaveContact}
            >
              <Icon 
                name={isContactSaved ? "check" : "person-add"} 
                size={20} 
                color={isContactSaved ? "#FFFFFF" : "#2C6BED"} 
              />
              <Text style={[styles.saveContactText, isContactSaved && styles.savedContactText]}>
                {isContactSaved ? 'Saved' : 'Save Contact'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photos & Videos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos & Videos</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}
              contentContainerStyle={styles.photoScrollContent}
            >
              {photoThumbnails.map((photo, index) => (
                <TouchableOpacity key={index} style={styles.photoThumbnail}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {index === 0 && (
                    <View style={styles.videoBadge}>
                      <Icon name="play-arrow" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.aboutText}>
              {showFullAbout ? aboutText : truncatedAbout}
            </Text>
            <TouchableOpacity 
              style={styles.readMoreButton}
              onPress={() => setShowFullAbout(!showFullAbout)}
            >
              <Text style={styles.readMoreText}>
                {showFullAbout ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amenities Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.amenitiesGrid}>
              {amenities.slice(0, 6).map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <View style={styles.amenityIconContainer}>
                    <Text style={styles.amenityIcon}>{amenity.icon}</Text>
                  </View>
                  <Text style={styles.amenityText}>{amenity.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Links Section */}
          <View style={styles.section}>
            <View style={styles.linksHeader}>
              <Text style={styles.sectionTitle}>Links</Text>
            </View>
            
            <View style={styles.linksContainer}>
              {links.map((link, index) => (
                <TouchableOpacity key={index} style={styles.linkItem}>
                  <View style={styles.linkLeft}>
                    <View style={styles.linkIconContainer}>
                      <Text style={styles.linkIcon}>{link.icon}</Text>
                    </View>
                    <Text style={styles.linkText}>{link.title}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#CCCCCC" />
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Contact Button */}
            <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
              <Text style={styles.contactButtonText}>Contact Community</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000000ff',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000ff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Hero Image
  heroImageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  heroBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#2C6BED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heroBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contentContainer: {
    padding: 20,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 32,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    fontSize: 16,
    color: '#FFB800',
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  address: {
    fontSize: 16,
    color: '#666666',
    flex: 1,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  contactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  saveContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C6BED',
    gap: 8,
  },
  savedContactButton: {
    backgroundColor: '#2C6BED',
    borderColor: '#2C6BED',
  },
  saveContactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C6BED',
  },
  savedContactText: {
    color: '#FFFFFF',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFF',
    minWidth: 72,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C6BED',
    textAlign: 'center',
  },
  // Rest of the styles...
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#2C6BED',
    fontWeight: '600',
  },
  photoScroll: {
    marginTop: 8,
  },
  photoScrollContent: {
    paddingRight: 20,
  },
  photoThumbnail: {
    width: 160,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444444',
    marginBottom: 12,
  },
  readMoreButton: {
    paddingVertical: 8,
  },
  readMoreText: {
    fontSize: 16,
    color: '#2C6BED',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  amenityIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  amenityIcon: {
    fontSize: 24,
  },
  amenityText: {
    fontSize: 13,
    color: '#1A1A1A',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  linksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linksContainer: {
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  linkIcon: {
    fontSize: 18,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  contactButton: {
    backgroundColor: '#2C6BED',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2C6BED',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  contactButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AbbingtonMurray;