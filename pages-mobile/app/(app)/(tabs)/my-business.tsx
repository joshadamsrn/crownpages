// import { useAuth } from "@/contexts/AuthContext";
// import { Business } from "@/types/page-builder.types";
// import { isValidEmail } from "@/utils";
// import { supabase } from "@/utils/supabase";
// import { DEFAULT_THEME } from "@crown-pages/types";
// import { Ionicons } from "@expo/vector-icons";
// import { router } from "expo-router";
// import { debounce } from "lodash";
// import React, { useCallback, useEffect, useState } from "react";
// import {
//     ActivityIndicator,
//     Alert,
//     KeyboardAvoidingView,
//     Modal,
//     Platform,
//     SafeAreaView,
//     ScrollView,
//     Share,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View
// } from "react-native";
// import Toast from "react-native-toast-message";
// import ColorPicker, {
//     HueSlider,
//     OpacitySlider,
//     Panel1,
//     Preview,
//     Swatches,
// } from "reanimated-color-picker";
// import Loader from "../../../components/common/Loader";

// interface BusinessFormData {
//   name: string;
//   email: string;
//   slug?: string;
//   description?: string;
//   owner_id?: string;
//   phone?: string;
//   website?: string;
//   city?: string;
//   state?: string;
//   street_address?: string;
//   zip_code?: string;
//   primary_color?: string;
//   secondary_color?: string;
//   font_family?: string;
// }

// const MyBusinessScreen = () => {
//   const { session } = useAuth();
//   const [isLoading, setIsLoading] = useState(true);
//   const [businesses, setBusinesses] = useState<Business[]>([]);
//   const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
//     null
//   );
//   const [isCreating, setIsCreating] = useState(false);
//   const [isEditing, setIsEditing] = useState(false);
//   const [showCreateForm, setShowCreateForm] = useState(false);
//   const [showColorPicker, setShowColorPicker] = useState(false);
//   const [colorPickerField, setColorPickerField] = useState<
//     "primary_color" | "secondary_color"
//   >("primary_color");
//   const [slugError, setSlugError] = useState<string | null>(null);
//   const [showSlugInfoModal, setShowSlugInfoModal] = useState(false);

//   // Slug availability checking states
//   const [isCheckingSlug, setIsCheckingSlug] = useState(false);
//   const [slugAvailability, setSlugAvailability] = useState<{
//     available: boolean | null;
//     message: string;
//   }>({ available: null, message: '' });
//   const [originalSlug, setOriginalSlug] = useState('');
//   const [hasSlugChanges, setHasSlugChanges] = useState(false);

//   // Business page states
//   const [businessPage, setBusinessPage] = useState<any>(null);
//   const [isLoadingBusinessPage, setIsLoadingBusinessPage] = useState(false);

//   const [businessData, setBusinessData] = useState<BusinessFormData>({
//     name: "",
//     email: "",
//     slug: "",
//     description: "",
//     owner_id: session?.user.id,
//     phone: "",
//     website: "",
//     city: "",
//     state: "",
//     street_address: "",
//     zip_code: "",
//     primary_color: DEFAULT_THEME.primary,
//     secondary_color: DEFAULT_THEME.secondary,
//     font_family: DEFAULT_THEME.fontFamily,
//   });

//   const [originalData, setOriginalData] = useState<BusinessFormData>({
//     name: "",
//     email: "",
//     slug: "",
//     description: "",
//     owner_id: session?.user.id,
//     phone: "",
//     website: "",
//     city: "",
//     state: "",
//     street_address: "",
//     zip_code: "",
//     primary_color: "#007AFF",
//     secondary_color: "#34C759",
//     font_family: "Inter",
//   });

//   // Debounced slug availability check
//   const checkSlugAvailability = useCallback(
//     debounce(async (slugToCheck: string, excludeId?: string) => {
//       if (!slugToCheck || slugToCheck === originalSlug) {
//         setSlugAvailability({ available: null, message: '' });
//         setIsCheckingSlug(false);
//         return;
//       }

//       setIsCheckingSlug(true);
//       try {
//         let query = supabase
//           .from('businesses')
//           .select('id')
//           .eq('slug', slugToCheck);

//         if (excludeId) {
//           query = query.neq('id', excludeId);
//         }

//         const { data, error } = await query.maybeSingle();

//         if (error) throw error;

//         if (data) {
//           setSlugAvailability({
//             available: false,
//             message: 'This business URL is already taken',
//           });
//         } else {
//           setSlugAvailability({
//             available: true,
//             message: 'Perfect! This business URL is available',
//           });
//         }
//       } catch (error) {
//         console.error('Error checking slug availability:', error);
//         setSlugAvailability({
//           available: false,
//           message: 'Error checking availability',
//         });
//       } finally {
//         setIsCheckingSlug(false);
//       }
//     }, 500),
//     [originalSlug]
//   );

//   // Format slug (lowercase, replace spaces with hyphens, remove special chars)
//   const formatSlug = (input: string) => {
//     return input
//       .toLowerCase()
//       .trim()
//       .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
//       .replace(/\s+/g, '-') // Replace spaces with hyphens
//       .replace(/-+/g, '-') // Replace multiple hyphens with single
//       .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
//   };

//   const generateSlugFromName = () => {
//     const generated = formatSlug(businessData.name);
//     setBusinessData((prev) => ({ ...prev, slug: generated }));
//     setHasSlugChanges(generated !== originalSlug);
//     if (generated !== originalSlug) {
//       checkSlugAvailability(generated, selectedBusinessId || undefined);
//     }
//   };

//   const getSlugStatusColor = () => {
//     if (slugAvailability.available === true) return '#10B981';
//     if (slugAvailability.available === false) return '#EF4444';
//     return '#6B7280';
//   };

//   const getSlugStatusIcon = () => {
//     if (isCheckingSlug) return 'time-outline';
//     if (slugAvailability.available === true) return 'checkmark-circle';
//     if (slugAvailability.available === false) return 'close-circle';
//     return 'information-circle-outline';
//   };

//   useEffect(() => {
//     fetchBusinesses();
//   }, []);

//   const fetchBusinesses = async () => {
//     try {
//       setIsLoading(true);
//       const { data, error } = await supabase
//         .from("businesses")
//         .select("*")
//         .eq("owner_id", session?.user.id)
//         .order("created_at", { ascending: false });

//       if (error && error.code !== "PGRST116") throw error;

//       if (data && data.length > 0) {
//         setBusinesses(data);
//         const firstBusiness = data[0];
//         setSelectedBusinessId(firstBusiness.id);
//         const formData: BusinessFormData = {
//           name: firstBusiness.name || "",
//           email: firstBusiness.email || "",
//           slug: firstBusiness.slug || "",
//           description: firstBusiness.description || "",
//           owner_id: firstBusiness.owner_id,
//           phone: firstBusiness.phone || "",
//           website: firstBusiness.website || "",
//           city: firstBusiness.city || "",
//           state: firstBusiness.state || "",
//           street_address: firstBusiness.street_address || "",
//           zip_code: firstBusiness.zip_code || "",
//           primary_color: firstBusiness.primary_color || DEFAULT_THEME.primary,
//           secondary_color:
//             firstBusiness.secondary_color || DEFAULT_THEME.secondary,
//           font_family: firstBusiness.font_family || DEFAULT_THEME.fontFamily,
//         };
//         setBusinessData(formData);
//         setOriginalData(formData);
//         setOriginalSlug(formData.slug || '');
//         if (formData.slug) {
//           checkSlugAvailability(formData.slug, firstBusiness.id);
//         }

//         // Fetch business page for the selected business
//         await fetchBusinessPage(firstBusiness.id);
//       } else {
//         setBusinesses([]);
//         setShowCreateForm(true);
//       }
//     } catch (error) {
//       console.error("Error fetching businesses:", error);
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Failed to load businesses",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchBusinessPage = async (businessId: string, retryCount = 0, maxRetries = 0) => {
//     try {
//       setIsLoadingBusinessPage(true);
//       const { data, error } = await supabase
//         .from("business_pages")
//         .select("*")
//         .eq("business_id", businessId)
//         .maybeSingle();

//       if (error) throw error;

//       if (data) {
//         // Fetch click count for this business page
//         const { data: clicksData } = await supabase
//           .from('business_page_analytics')
//           .select('id')
//           .eq('business_page_id', data.id)
//           .in('event_type', [
//             'link_click',
//             'phone_click',
//             'email_click',
//             'address_click',
//             'social_click',
//             'website_click',
//           ]);

//         // Add click count to business page data
//         const businessPageWithClicks = {
//           ...data,
//           click_count: clicksData?.length || 0
//         };

//         setBusinessPage(businessPageWithClicks);
//         setIsLoadingBusinessPage(false);
//         return true; // Success
//       } else if (retryCount < maxRetries) {
//         // Page not found, but we have retries left
//         console.log(`Business page not found, retry ${retryCount + 1}/${maxRetries} in 2 seconds...`);
//         setTimeout(() => {
//           fetchBusinessPage(businessId, retryCount + 1, maxRetries);
//         }, 2000);
//         return false; // Will retry
//       } else {
//         // No more retries, set to null
//         setBusinessPage(null);
//         return false; // Failed
//       }
//     } catch (error) {
//       console.error("Error fetching business page:", error);
//       if (retryCount < maxRetries) {
//         console.log(`Error fetching business page, retry ${retryCount + 1}/${maxRetries} in 2 seconds...`);
//         setTimeout(() => {
//           fetchBusinessPage(businessId, retryCount + 1, maxRetries);
//         }, 2000);
//         return false; // Will retry
//       } else {
//         setBusinessPage(null);
//         return false; // Failed
//       }
//     } finally {
//       // Only set loading to false if we're done (no more retries)
//       if (retryCount >= maxRetries) {
//         setIsLoadingBusinessPage(false);
//       }
//     }
//   };

//   const handleChange = (field: keyof BusinessFormData, value: string) => {
//     if (field === "slug") {
//       const formattedSlug = formatSlug(value);
//       setBusinessData((prev) => ({ ...prev, [field]: formattedSlug }));
//       setHasSlugChanges(formattedSlug !== originalSlug);

//       if (formattedSlug && formattedSlug !== originalSlug) {
//         checkSlugAvailability(formattedSlug, selectedBusinessId || undefined);
//       } else {
//         setSlugAvailability({ available: null, message: '' });
//       }
//     } else {
//       setBusinessData((prev) => ({ ...prev, [field]: value }));
//     }
//   };

//   const validateBusinessForm = (
//     data: BusinessFormData,
//     isMinimal = false
//   ): boolean => {
//     if (!data.name?.trim()) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Business name is required",
//       });
//       return false;
//     }

//     if (!data.email?.trim()) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Business email is required",
//       });
//       return false;
//     }

//     if (!isValidEmail(data.email)) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Please enter a valid email address",
//       });
//       return false;
//     }

//     return true;
//   };

//   // Check if a slug is unique (excluding the current business for updates)
//   const checkSlugUnique = async (
//     slug: string,
//     excludeId?: string
//   ): Promise<boolean> => {
//     if (!slug) return false;
//     let query = supabase.from("businesses").select("id").eq("slug", slug);
//     if (excludeId) {
//       query = query.neq("id", excludeId);
//     }
//     const { data, error } = await query;
//     return !data || data.length === 0;
//   };

//   const createBusiness = async () => {
//     if (!validateBusinessForm(businessData)) return;

//     // Use the new slug availability system
//     if (hasSlugChanges && !slugAvailability.available) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Please choose an available business URL before creating",
//       });
//       return;
//     }

//     try {
//       setIsCreating(true);

//       // Create business
//       const { data, error } = await supabase
//         .from("businesses")
//         .insert({ ...businessData })
//         .select()
//         .single();

//       if (error) throw error;

//       // Add business member
//       const { error: memberError } = await supabase.rpc("add_business_member", {
//         p_business_id: data.id,
//         p_user_id: session?.user?.id,
//         p_role: "owner",
//       });

//       if (memberError) throw memberError;

//       // Create default business page
//       const { error: pageError } = await supabase
//         .from("business_pages")
//         .insert({
//           business_id: data.id,
//           created_by: session?.user?.id!,
//           title: `Welcome to ${businessData.name}`,
//           description: businessData.description || '',
//           logo_url: null,
//           page_links: [],
//           social_links: [],
//           is_published: true,
//           contact_info: {
//             email: businessData.email,
//             phone: businessData.phone,
//             address: businessData.street_address ?
//               `${businessData.street_address}${businessData.city ? `, ${businessData.city}` : ''}${businessData.state ? `, ${businessData.state}` : ''}${businessData.zip_code ? ` ${businessData.zip_code}` : ''}` : '',
//             website: businessData.website,
//           },
//           styles: {
//             primary: '#FFFFFF',
//             backgroundColor: '#000000',
//             textColor: '#FFFFFF',
//           },
//         });

//       if (pageError) {
//         console.error("Error creating business page:", pageError);
//         // Don't fail the business creation if page creation fails
//         // But still try to fetch in case it was created despite the error
//       }

//       // Fetch the newly created business page with retry logic
//       // This handles potential replication lag or timing issues
//       await fetchBusinessPage(data.id, 0, 5); // Retry up to 5 times over 10 seconds

//       // Update local state
//       const newBusiness = data as Business;
//       setBusinesses([newBusiness, ...businesses]);
//       setSelectedBusinessId(newBusiness.id);
//       const formData: BusinessFormData = {
//         name: newBusiness.name || "",
//         email: newBusiness.email || "",
//         slug: newBusiness.slug || "",
//         description: newBusiness.description || "",
//         owner_id: newBusiness.owner_id,
//         phone: newBusiness.phone || "",
//         website: newBusiness.website || "",
//         city: newBusiness.city || "",
//         state: newBusiness.state || "",
//         street_address: newBusiness.street_address || "",
//         zip_code: newBusiness.zip_code || "",
//         primary_color: newBusiness.primary_color || DEFAULT_THEME.primary,
//         secondary_color: newBusiness.secondary_color || DEFAULT_THEME.secondary,
//         font_family: newBusiness.font_family || DEFAULT_THEME.fontFamily,
//       };
//       setBusinessData(formData);
//       setOriginalData(formData);
//       setOriginalSlug(formData.slug || '');
//       setSlugAvailability({ available: null, message: '' });
//       setHasSlugChanges(false);
//       setShowCreateForm(false);

//       Toast.show({
//         type: "success",
//         text1: "Success",
//         text2: "Business created successfully",
//       });
//     } catch (error) {
//       console.error("Error creating business:", error);
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Failed to create business",
//       });
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   const updateBusiness = async () => {
//     if (!validateBusinessForm(businessData) || !selectedBusinessId) return;

//     // Use the new slug availability system
//     if (hasSlugChanges && !slugAvailability.available) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Please choose an available business URL before saving",
//       });
//       return;
//     }

//     try {
//       setIsCreating(true);

//       const { data, error } = await supabase
//         .from("businesses")
//         .update(businessData)
//         .eq("id", selectedBusinessId)
//         .select()
//         .single();

//       if (error) throw error;

//       // Update local state
//       const updatedBusiness = data as Business;
//       setBusinesses(
//         businesses.map((b) =>
//           b.id === selectedBusinessId ? updatedBusiness : b
//         )
//       );
//       const formData: BusinessFormData = {
//         name: updatedBusiness.name || "",
//         email: updatedBusiness.email || "",
//         slug: updatedBusiness.slug || "",
//         description: updatedBusiness.description || "",
//         owner_id: updatedBusiness.owner_id,
//         phone: updatedBusiness.phone || "",
//         website: updatedBusiness.website || "",
//         city: updatedBusiness.city || "",
//         state: updatedBusiness.state || "",
//         street_address: updatedBusiness.street_address || "",
//         zip_code: updatedBusiness.zip_code || "",
//         primary_color: updatedBusiness.primary_color || "#000000",
//         secondary_color: updatedBusiness.secondary_color || "#FFFFFF",
//         font_family: updatedBusiness.font_family || "Inter",
//       };
//       setBusinessData(formData);
//       setOriginalData(formData);
//       setOriginalSlug(formData.slug || '');
//       setSlugAvailability({ available: null, message: '' });
//       setHasSlugChanges(false);
//       setIsEditing(false);

//       Toast.show({
//         type: "success",
//         text1: "Success",
//         text2: "Business updated successfully",
//       });
//     } catch (error) {
//       console.error("Error updating business:", error);
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Failed to update business",
//       });
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   const handleSelectBusiness = (business: Business) => {
//     setSelectedBusinessId(business.id);
//     const formData: BusinessFormData = {
//       name: business.name || "",
//       email: business.email || "",
//       slug: business.slug || "",
//       description: business.description || "",
//       owner_id: business.owner_id,
//       phone: business.phone || "",
//       website: business.website || "",
//       city: business.city || "",
//       state: business.state || "",
//       street_address: business.street_address || "",
//       zip_code: business.zip_code || "",
//       primary_color: business.primary_color || "#007AFF",
//       secondary_color: business.secondary_color || "#34C759",
//       font_family: business.font_family || "Inter",
//     };
//     setBusinessData(formData);
//     setOriginalData(formData);
//     setOriginalSlug(formData.slug || '');
//     setSlugAvailability({ available: null, message: '' });
//     setHasSlugChanges(false);
//     setIsEditing(false);

//     // Fetch business page for the selected business
//     fetchBusinessPage(business.id);
//   };

//   const handleEdit = () => {
//     setIsEditing(true);
//   };

//   const handleCancel = () => {
//     setBusinessData(originalData);
//     setSlugAvailability({ available: null, message: '' });
//     setHasSlugChanges(false);
//     setIsEditing(false);
//   };

//   const handleStartCreate = () => {
//     // Reset form data for new business
//     setBusinessData({
//       name: "",
//       email: "",
//       slug: "",
//       description: "",
//       owner_id: session?.user.id,
//       phone: "",
//       website: "",
//       city: "",
//       state: "",
//       street_address: "",
//       zip_code: "",
//       primary_color: DEFAULT_THEME.primary,
//       secondary_color: DEFAULT_THEME.secondary,
//       font_family: DEFAULT_THEME.fontFamily,
//     });
//     setOriginalData({} as BusinessFormData);
//     setOriginalSlug('');
//     setSlugAvailability({ available: null, message: '' });
//     setHasSlugChanges(false);
//     setIsEditing(false);
//     setShowCreateForm(true);
//   };

//   const handleCancelCreate = () => {
//     setBusinessData({
//       name: "",
//       email: "",
//       slug: "",
//       description: "",
//       owner_id: session?.user.id,
//       phone: "",
//       website: "",
//       city: "",
//       state: "",
//       street_address: "",
//       zip_code: "",
//       primary_color: "#007AFF",
//       secondary_color: "#34C759",
//       font_family: "Inter",
//     });
//     setOriginalSlug('');
//     setSlugAvailability({ available: null, message: '' });
//     setHasSlugChanges(false);
//     setShowCreateForm(false);
//   };

//   const openColorPicker = (field: "primary_color" | "secondary_color") => {
//     setColorPickerField(field);
//     setShowColorPicker(true);
//   };

//   const handleColorSelect = (color: {
//     hex: string;
//     rgb: any;
//     hsl: any;
//     hsv: any;
//   }) => {
//     // The color object from reanimated-color-picker has a hex property
//     const hexColor = color.hex;
//     handleChange(colorPickerField, hexColor);
//   };

//   const deleteBusiness = async (businessId: string) => {
//     Alert.alert(
//       "Delete Business",
//       "Are you sure you want to delete this business? This action cannot be undone.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Delete",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const { error } = await supabase
//                 .from("businesses")
//                 .delete()
//                 .eq("id", businessId);

//               if (error) throw error;

//               const updatedBusinesses = businesses.filter(
//                 (b) => b.id !== businessId
//               );
//               setBusinesses(updatedBusinesses);

//               if (selectedBusinessId === businessId) {
//                 if (updatedBusinesses.length > 0) {
//                   handleSelectBusiness(updatedBusinesses[0]);
//                 } else {
//                   setSelectedBusinessId(null);
//                   setShowCreateForm(true);
//                 }
//               }

//               Toast.show({
//                 type: "success",
//                 text1: "Success",
//                 text2: "Business deleted successfully",
//               });
//             } catch (error) {
//               console.error("Error deleting business:", error);
//               Toast.show({
//                 type: "error",
//                 text1: "Error",
//                 text2: "Failed to delete business",
//               });
//             }
//           },
//         },
//       ]
//     );
//   };

//   const handleCreateBusiness = () => {
//     if (!businessData.slug) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Business Unique link/slug is required",
//       });
//       return false;
//     }

//     // Check if slug is available before proceeding
//     if (hasSlugChanges && !slugAvailability.available) {
//       Toast.show({
//         type: "error",
//         text1: "Error",
//         text2: "Please choose an available business URL before creating",
//       });
//       return false;
//     }

//     Alert.alert(
//       "Confirm Business Creation",
//       `Your business will be created with the URL: crownpages.com/${businessData.slug}\n\nThis URL cannot be changed later. Are you sure you want to continue?`,
//       [
//         { text: "Cancel", style: "cancel" },
//         { text: "Create Business", onPress: createBusiness },
//       ]
//     );
//   };

//   const handleEditBusinessPage = () => {
//     if (businessPage) {
//       router.push(`/business-page-editor/${businessPage.id}`);
//     }
//   };

//   const handleShareBusinessPage = async () => {
//     if (!businessData.slug) return;

//     try {
//       const pagesRootUrl = process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com';
//       const baseUrl = pagesRootUrl.replace(/\/$/, '');
//       const businessPageUrl = `${baseUrl}/${businessData.slug}`;

//       // Platform-specific sharing to prevent duplicates on iOS
//       if (Platform.OS === 'ios') {
//         // On iOS, only use message to prevent duplicate content in iMessage
//         await Share.share({
//           message: businessPageUrl,
//         });
//       } else {
//         // On Android, include URL in message AND as separate parameter for rich previews
//         await Share.share({
//           message: businessPageUrl,
//           url: businessPageUrl,
//         });
//       }
//     } catch (error) {
//       console.error('Error sharing business page:', error);
//       Toast.show({
//         type: 'error',
//         text1: 'Error',
//         text2: 'Failed to share business page',
//       });
//     }
//   };

//   if (isLoading) {
//     return <Loader />;
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Business Selector */}
//       {businesses.length >= 1 && !showCreateForm && (
//         <View style={styles.businessSelector}>
//           <Text style={styles.selectorTitle}>Select Business:</Text>
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             style={styles.businessList}
//           >
//             {businesses.map((business) => (
//               <TouchableOpacity
//                 key={business.id}
//                 style={[
//                   styles.businessCard,
//                   selectedBusinessId === business.id &&
//                   styles.selectedBusinessCard,
//                 ]}
//                 onPress={() => handleSelectBusiness(business)}
//               >
//                 <Text
//                   style={[
//                     styles.businessName,
//                     selectedBusinessId === business.id &&
//                     styles.selectedBusinessName,
//                   ]}
//                 >
//                   {business.name}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.businessEmail,
//                     selectedBusinessId === business.id &&
//                     styles.selectedBusinessEmail,
//                   ]}
//                 >
//                   {business.email}
//                 </Text>
//               </TouchableOpacity>
//             ))}

//             {/* Add Business Card */}
//             <TouchableOpacity
//               style={styles.addBusinessCard}
//               onPress={handleStartCreate}
//             >
//               <Ionicons name="add" size={32} color="#007AFF" />
//               <Text style={styles.addBusinessText}>Add Business</Text>
//             </TouchableOpacity>
//           </ScrollView>
//         </View>
//       )}

//       <KeyboardAvoidingView
//         style={styles.keyboardAvoidingView}
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
//       >
//         <ScrollView
//           style={styles.scrollView}
//           showsVerticalScrollIndicator={false}
//           contentInsetAdjustmentBehavior="automatic"
//         >
//           {showCreateForm ? (
//             // Create Business Form
//             <View style={styles.form}>
//               <View style={styles.createFormHeader}>
//                 <Text style={styles.formTitle}>Create New Business</Text>
//                 {businesses.length > 0 && (
//                   <TouchableOpacity onPress={handleCancelCreate}>
//                     <Ionicons name="close" size={24} color="#666" />
//                   </TouchableOpacity>
//                 )}
//               </View>

//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Essential Information</Text>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.labelContainer}>
//                     <Text style={styles.label}>Business Name</Text>
//                     <Text style={styles.requiredAsterisk}>*</Text>
//                   </View>
//                   <TextInput
//                     style={styles.input}
//                     value={businessData.name}
//                     onChangeText={(value) => handleChange("name", value)}
//                     placeholder="e.g., Smith Dental Care"
//                     placeholderTextColor="#999"
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.labelContainer}>
//                     <Text style={styles.label}>Business Email</Text>
//                     <Text style={styles.requiredAsterisk}>*</Text>
//                   </View>
//                   <TextInput
//                     style={styles.input}
//                     value={businessData.email}
//                     onChangeText={(value) => handleChange("email", value)}
//                     placeholder="contact@smithdental.com"
//                     placeholderTextColor="#999"
//                     keyboardType="email-address"
//                     autoCapitalize="none"
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.slugHeader}>
//                     <View style={styles.labelContainer}>
//                       <Text style={styles.label}>Business Unique Link / Slug</Text>
//                       <Text style={styles.requiredAsterisk}>*</Text>
//                     </View>
//                     <TouchableOpacity
//                       style={styles.infoButton}
//                       onPress={() => setShowSlugInfoModal(true)}
//                     >
//                       <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
//                     </TouchableOpacity>
//                   </View>

//                   {/* URL Preview */}
//                   <View style={styles.previewContainer}>
//                     <Text style={styles.previewLabel}>
//                       Your business will be available at:
//                     </Text>
//                     <View style={styles.urlPreview}>
//                       <Text style={styles.urlPrefix}>crownpages.com/</Text>
//                       <Text
//                         style={[
//                           styles.urlSlug,
//                           { color: businessData.slug ? '#007AFF' : '#999' },
//                         ]}
//                       >
//                         {businessData.slug || 'your-business-name'}
//                       </Text>
//                     </View>
//                   </View>

//                   <TextInput
//                     style={[
//                       styles.input,
//                       !isEditing && styles.disabledInput,
//                       slugError && { borderColor: "red" },
//                       {
//                         borderColor:
//                           slugAvailability.available === false
//                             ? '#EF4444'
//                             : slugAvailability.available === true
//                               ? '#10B981'
//                               : '#DDD',
//                       },
//                     ]}
//                     value={businessData.slug}
//                     onChangeText={(value) => {
//                       setSlugError(null); // clear error on change
//                       handleChange("slug", value);
//                     }}
//                     placeholder="your-business-slug"
//                     placeholderTextColor="#999"
//                     autoCapitalize="none"
//                     editable={!isEditing}
//                   />

//                   {/* Generate Button */}
//                   <View style={styles.inputContainer}>
//                     <TouchableOpacity
//                       style={styles.generateButton}
//                       onPress={generateSlugFromName}
//                     >
//                       <Ionicons name="refresh" size={20} color="#007AFF" />
//                       <Text style={styles.generateText}>Generate from Name</Text>
//                     </TouchableOpacity>
//                   </View>

//                   {/* Status Message */}
//                   {(slugAvailability.message || isCheckingSlug) && (
//                     <View style={styles.statusContainer}>
//                       <View style={styles.statusIndicator}>
//                         {isCheckingSlug ? (
//                           <ActivityIndicator size="small" color="#007AFF" />
//                         ) : (
//                           <Ionicons
//                             name={getSlugStatusIcon()}
//                             size={16}
//                             color={getSlugStatusColor()}
//                           />
//                         )}
//                         <Text
//                           style={[styles.statusText, { color: getSlugStatusColor() }]}
//                         >
//                           {isCheckingSlug
//                             ? 'Checking availability...'
//                             : slugAvailability.message}
//                         </Text>
//                       </View>
//                     </View>
//                   )}

//                   <View style={styles.slugRulesContainer}>
//                     <Text style={styles.slugRulesTitle}>URL Rules:</Text>
//                     <Text style={styles.slugRule}>
//                       • Only letters, numbers, and hyphens allowed
//                     </Text>
//                     <Text style={styles.slugRule}>
//                       • Spaces become hyphens automatically
//                     </Text>
//                     <Text style={styles.slugRule}>
//                       • Must be unique across all businesses
//                     </Text>
//                   </View>

//                   {slugError && (
//                     <Text style={{ color: "red", marginTop: 4 }}>
//                       {slugError}
//                     </Text>
//                   )}
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Description (Optional)</Text>
//                   <TextInput
//                     style={[styles.input, styles.textArea]}
//                     value={businessData.description || ""}
//                     onChangeText={(value) => handleChange("description", value)}
//                     placeholder="Brief description of your business"
//                     placeholderTextColor="#999"
//                     multiline
//                     numberOfLines={3}
//                   />
//                 </View>
//               </View>

//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>
//                   Contact Information (Optional)
//                 </Text>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Phone</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={businessData.phone || ""}
//                     onChangeText={(value) => handleChange("phone", value)}
//                     placeholder="(555) 123-4567"
//                     placeholderTextColor="#999"
//                     keyboardType="phone-pad"
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Website</Text>
//                   <TextInput
//                     style={styles.input}
//                     value={businessData.website || ""}
//                     onChangeText={(value) => handleChange("website", value)}
//                     placeholder="https://www.smithdental.com"
//                     placeholderTextColor="#999"
//                     keyboardType="url"
//                     autoCapitalize="none"
//                   />
//                 </View>

//                 <View style={styles.row}>
//                   <View style={[styles.inputGroup, styles.halfWidth]}>
//                     <Text style={styles.label}>City</Text>
//                     <TextInput
//                       style={styles.input}
//                       value={businessData.city || ""}
//                       onChangeText={(value) => handleChange("city", value)}
//                       placeholder="New York"
//                       placeholderTextColor="#999"
//                     />
//                   </View>

//                   <View style={[styles.inputGroup, styles.halfWidth]}>
//                     <Text style={styles.label}>State</Text>
//                     <TextInput
//                       style={styles.input}
//                       value={businessData.state || ""}
//                       onChangeText={(value) => handleChange("state", value)}
//                       placeholder="NY"
//                       placeholderTextColor="#999"
//                     />
//                   </View>
//                 </View>
//               </View>

//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Brand Colors (Optional)</Text>

//                 <View style={styles.colorRow}>
//                   <View style={styles.colorInputGroup}>
//                     <Text style={styles.label}>Primary Color</Text>
//                     <TouchableOpacity
//                       style={styles.colorButton}
//                       onPress={() => openColorPicker("primary_color")}
//                     >
//                       <View
//                         style={[
//                           styles.colorPreview,
//                           {
//                             backgroundColor:
//                               businessData.primary_color || "#007AFF",
//                           },
//                         ]}
//                       />
//                       <Text style={styles.colorText}>
//                         {businessData.primary_color}
//                       </Text>
//                       <Ionicons name="chevron-forward" size={16} color="#666" />
//                     </TouchableOpacity>
//                   </View>

//                   <View style={styles.colorInputGroup}>
//                     <Text style={styles.label}>Secondary Color</Text>
//                     <TouchableOpacity
//                       style={styles.colorButton}
//                       onPress={() => openColorPicker("secondary_color")}
//                     >
//                       <View
//                         style={[
//                           styles.colorPreview,
//                           {
//                             backgroundColor:
//                               businessData.secondary_color || "#34C759",
//                           },
//                         ]}
//                       />
//                       <Text style={styles.colorText}>
//                         {businessData.secondary_color}
//                       </Text>
//                       <Ionicons name="chevron-forward" size={16} color="#666" />
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </View>

//               <TouchableOpacity
//                 style={[styles.createButton, isCreating && styles.disabledButton]}
//                 onPress={handleCreateBusiness}
//                 disabled={isCreating}
//               >
//                 {isCreating ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <>
//                     <Ionicons name="add-circle-outline" size={24} color="#fff" />
//                     <Text style={styles.createButtonText}>Create Business</Text>
//                   </>
//                 )}
//               </TouchableOpacity>
//             </View>
//           ) : selectedBusinessId ? (
//             // View/Edit Business Form
//             <View style={styles.form}>
//               <View style={styles.businessHeader}>
//                 <View style={styles.businessInfo}>
//                   <Text style={styles.businessTitle}>{businessData.name}</Text>
//                   <Text style={styles.businessSubtitle}>
//                     {businessData.email}
//                   </Text>
//                 </View>
//                 <View style={styles.businessActions}>
//                   {!isEditing ? (
//                     <TouchableOpacity
//                       style={styles.editButton}
//                       onPress={handleEdit}
//                     >
//                       <Ionicons name="pencil" size={20} color="#007AFF" />
//                     </TouchableOpacity>
//                   ) : (
//                     <View style={styles.editActions}>
//                       <TouchableOpacity
//                         style={styles.cancelButton}
//                         onPress={handleCancel}
//                       >
//                         <Ionicons name="close-circle" size={20} color="#FF3B30" />
//                       </TouchableOpacity>
//                       <TouchableOpacity
//                         style={styles.saveButton}
//                         onPress={updateBusiness}
//                         disabled={isCreating}
//                       >
//                         {isCreating ? (
//                           <ActivityIndicator size="small" color="#fff" />
//                         ) : (
//                           <Ionicons
//                             name="checkmark-circle"
//                             size={20}
//                             color="#fff"
//                           />
//                         )}
//                       </TouchableOpacity>
//                     </View>
//                   )}
//                 </View>
//               </View>

//               {/* Business Page Section */}
//               <View style={styles.section}>
//                 <View style={styles.sectionHeaderRow}>
//                   <Text style={styles.sectionTitle}>My Business Page</Text>
//                   <TouchableOpacity
//                     style={styles.shareIconButton}
//                     onPress={handleShareBusinessPage}
//                   >
//                     <Ionicons name="share-outline" size={20} color="#007AFF" />
//                   </TouchableOpacity>
//                 </View>

//                 {/* URL Preview Card */}
//                 <View style={styles.urlPreviewCard}>
//                   <View style={styles.urlHeader}>
//                     <Ionicons name="globe-outline" size={20} color="#007AFF" />
//                     <Text style={styles.urlLabel}>Your business page is live at:</Text>
//                   </View>
//                   <Text style={styles.businessPageUrl}>
//                     crownpages.com/{businessData.slug}
//                   </Text>
//                 </View>

//                 {isLoadingBusinessPage ? (
//                   <View style={styles.businessPageLoading}>
//                     <ActivityIndicator size="small" color="#007AFF" />
//                     <Text style={styles.businessPageLoadingText}>Loading business page...</Text>
//                   </View>
//                 ) : businessPage ? (
//                   <View style={styles.businessPageCard}>
//                     <View style={styles.businessPageHeader}>
//                       <View style={styles.businessPageTitleContainer}>
//                         <Text style={styles.businessPageTitle}>
//                           {businessPage.title || 'Welcome to our business'}
//                         </Text>
//                         <Text style={styles.businessPageDescription}>
//                           {businessPage.description || 'Professional services and solutions for your business needs'}
//                         </Text>
//                       </View>
//                     </View>

//                     <View style={styles.businessPageContent}>
//                       <View style={styles.businessPageStatsContainer}>
//                         <View style={styles.businessPageStatItem}>
//                           <View style={styles.statIconContainer}>
//                             <Ionicons name="link-outline" size={16} color="#007AFF" />
//                           </View>
//                           <View style={styles.statContent}>
//                             <Text style={styles.statValue}>{businessPage.page_links?.length || 0}</Text>
//                             <Text style={styles.statLabel}>page links</Text>
//                           </View>
//                         </View>

//                         <View style={styles.businessPageStatItem}>
//                           <View style={styles.statIconContainer}>
//                             <Ionicons name="share-social-outline" size={16} color="#007AFF" />
//                           </View>
//                           <View style={styles.statContent}>
//                             <Text style={styles.statValue}>{businessPage.social_links?.length || 0}</Text>
//                             <Text style={styles.statLabel}>social links</Text>
//                           </View>
//                         </View>
//                       </View>

//                       <TouchableOpacity
//                         style={styles.editBusinessPageButton}
//                         onPress={handleEditBusinessPage}
//                       >
//                         <Ionicons name="create-outline" size={20} color="#fff" />
//                         <Text style={styles.editBusinessPageText}>Edit Page</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </View>
//                 ) : (
//                   <View style={styles.businessPageError}>
//                     <Ionicons name="alert-circle-outline" size={24} color="#FF9500" />
//                     <Text style={styles.businessPageErrorText}>
//                       Business page not found. Please contact support.
//                     </Text>
//                   </View>
//                 )}

//                 {/* Analytics Section */}
//                 {isLoadingBusinessPage ? (
//                   <View style={styles.analyticsLoadingCard}>
//                     <View style={styles.analyticsLoadingContent}>
//                       <ActivityIndicator size="small" color="#007AFF" />
//                       <Text style={styles.analyticsLoadingTitle}>Fetching Page...</Text>
//                       <Text style={styles.analyticsLoadingDescription}>
//                         Loading your business page data
//                       </Text>
//                     </View>
//                   </View>
//                 ) : businessPage ? (
//                   <View style={styles.analyticsCard}>
//                     <View style={styles.analyticsHeader}>
//                       <View style={styles.analyticsIconContainer}>
//                         <Ionicons name="analytics-outline" size={20} color="#007AFF" />
//                       </View>
//                       <Text style={styles.analyticsTitle}>Performance Analytics</Text>
//                     </View>

//                     <View style={styles.analyticsGrid}>
//                       <View style={styles.analyticsMetric}>
//                         <Text style={styles.analyticsMetricValue}>{businessPage.view_count || 0}</Text>
//                         <Text style={styles.analyticsMetricLabel}>Total Views</Text>
//                       </View>

//                       <View style={styles.analyticsMetric}>
//                         <Text style={styles.analyticsMetricValue}>{businessPage.unique_view_count || 0}</Text>
//                         <Text style={styles.analyticsMetricLabel}>Unique Visitors</Text>
//                       </View>

//                       <View style={styles.analyticsMetric}>
//                         <Text style={styles.analyticsMetricValue}>{(businessPage as any)?.click_count || 0}</Text>
//                         <Text style={styles.analyticsMetricLabel}>Total Clicks</Text>
//                       </View>
//                     </View>

//                     <TouchableOpacity
//                       style={styles.viewDetailedAnalyticsButton}
//                       onPress={() => router.push(`/(app)/business-page-analytics/${businessPage.id}` as any)}
//                     >
//                       <Ionicons name="bar-chart-outline" size={18} color="#007AFF" />
//                       <Text style={styles.viewDetailedAnalyticsText}>View Detailed Analytics</Text>
//                       <Ionicons name="chevron-forward" size={16} color="#007AFF" />
//                     </TouchableOpacity>
//                   </View>
//                 ) : (
//                   <View style={styles.analyticsUnavailableCard}>
//                     <View style={styles.analyticsUnavailableContent}>
//                       <Ionicons name="analytics-outline" size={24} color="#ccc" />
//                       <Text style={styles.analyticsUnavailableTitle}>Analytics Coming Soon</Text>
//                       <Text style={styles.analyticsUnavailableDescription}>
//                         Performance analytics will be available once your business page is created and receives traffic
//                       </Text>
//                     </View>
//                   </View>
//                 )}
//               </View>



//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Essential Information</Text>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.labelContainer}>
//                     <Text style={styles.label}>Business Name</Text>
//                     <Text style={styles.requiredAsterisk}>*</Text>
//                   </View>
//                   <TextInput
//                     style={[styles.input, !isEditing && styles.disabledInput]}
//                     value={businessData.name}
//                     onChangeText={(value) => handleChange("name", value)}
//                     placeholder="e.g., Smith Dental Care"
//                     placeholderTextColor="#999"
//                     editable={isEditing}
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.labelContainer}>
//                     <Text style={styles.label}>Business Email</Text>
//                     <Text style={styles.requiredAsterisk}>*</Text>
//                   </View>
//                   <TextInput
//                     style={[styles.input, !isEditing && styles.disabledInput]}
//                     value={businessData.email}
//                     onChangeText={(value) => handleChange("email", value)}
//                     placeholder="contact@smithdental.com"
//                     placeholderTextColor="#999"
//                     keyboardType="email-address"
//                     autoCapitalize="none"
//                     editable={isEditing}
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <View style={styles.slugHeader}>
//                     <View style={styles.labelContainer}>
//                       <Text style={styles.label}>Business Unique Link / Slug</Text>
//                       <Text style={styles.requiredAsterisk}>*</Text>
//                     </View>
//                     <TouchableOpacity
//                       style={styles.infoButton}
//                       onPress={() => setShowSlugInfoModal(true)}
//                     >
//                       <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
//                     </TouchableOpacity>
//                   </View>

//                   {/* URL Preview */}
//                   <View style={styles.previewContainer}>
//                     <Text style={styles.previewLabel}>
//                       Your business is available at:
//                     </Text>
//                     <View style={styles.urlPreview}>
//                       <Text style={styles.urlPrefix}>crownpages.com/</Text>
//                       <Text
//                         style={[
//                           styles.urlSlug,
//                           { color: businessData.slug ? '#000' : '#999' },
//                         ]}
//                       >
//                         {businessData.slug || 'your-business-name'}
//                       </Text>
//                     </View>
//                   </View>

//                   <TextInput
//                     style={[
//                       styles.input,
//                       !isEditing && styles.disabledInput,
//                       slugError && { borderColor: "red" },
//                       {
//                         borderColor:
//                           slugAvailability.available === false
//                             ? '#EF4444'
//                             : slugAvailability.available === true
//                               ? '#10B981'
//                               : '#DDD',
//                       },
//                     ]}
//                     value={businessData.slug}
//                     onChangeText={(value) => {
//                       setSlugError(null); // clear error on change
//                       handleChange("slug", value);
//                     }}
//                     placeholder="your-business-slug"
//                     placeholderTextColor="#999"
//                     autoCapitalize="none"
//                     editable={isEditing}
//                   />

//                   {/* Generate Button - Only show when editing */}
//                   {isEditing && (
//                     <View style={styles.inputContainer}>
//                       <TouchableOpacity
//                         style={styles.generateButton}
//                         onPress={generateSlugFromName}
//                       >
//                         <Ionicons name="refresh" size={20} color="#007AFF" />
//                         <Text style={styles.generateText}>Generate from Name</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}

//                   {/* Status Message */}
//                   {(slugAvailability.message || isCheckingSlug) && (
//                     <View style={styles.statusContainer}>
//                       <View style={styles.statusIndicator}>
//                         {isCheckingSlug ? (
//                           <ActivityIndicator size="small" color="#007AFF" />
//                         ) : (
//                           <Ionicons
//                             name={getSlugStatusIcon()}
//                             size={16}
//                             color={getSlugStatusColor()}
//                           />
//                         )}
//                         <Text
//                           style={[styles.statusText, { color: getSlugStatusColor() }]}
//                         >
//                           {isCheckingSlug
//                             ? 'Checking availability...'
//                             : slugAvailability.message}
//                         </Text>
//                       </View>
//                     </View>
//                   )}

//                   <View style={styles.slugRulesContainer}>
//                     <Text style={styles.slugRulesTitle}>URL Rules:</Text>
//                     <Text style={styles.slugRule}>
//                       • Only letters, numbers, and hyphens allowed
//                     </Text>
//                     <Text style={styles.slugRule}>
//                       • Spaces become hyphens automatically
//                     </Text>
//                     <Text style={styles.slugRule}>
//                       • Must be unique across all businesses
//                     </Text>
//                   </View>

//                   {slugError && (
//                     <Text style={{ color: "red", marginTop: 4 }}>
//                       {slugError}
//                     </Text>
//                   )}
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Description</Text>
//                   <TextInput
//                     style={[
//                       styles.input,
//                       styles.textArea,
//                       !isEditing && styles.disabledInput,
//                     ]}
//                     value={businessData.description || ""}
//                     onChangeText={(value) => handleChange("description", value)}
//                     placeholder="Brief description of your business"
//                     placeholderTextColor="#999"
//                     multiline
//                     numberOfLines={3}
//                     editable={isEditing}
//                   />
//                 </View>
//               </View>

//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Contact Information</Text>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Phone</Text>
//                   <TextInput
//                     style={[styles.input, !isEditing && styles.disabledInput]}
//                     value={businessData.phone || ""}
//                     onChangeText={(value) => handleChange("phone", value)}
//                     placeholder="(555) 123-4567"
//                     placeholderTextColor="#999"
//                     keyboardType="phone-pad"
//                     editable={isEditing}
//                   />
//                 </View>

//                 <View style={styles.inputGroup}>
//                   <Text style={styles.label}>Website</Text>
//                   <TextInput
//                     style={[styles.input, !isEditing && styles.disabledInput]}
//                     value={businessData.website || ""}
//                     onChangeText={(value) => handleChange("website", value)}
//                     placeholder="https://www.smithdental.com"
//                     placeholderTextColor="#999"
//                     keyboardType="url"
//                     autoCapitalize="none"
//                     editable={isEditing}
//                   />
//                 </View>

//                 <View style={styles.row}>
//                   <View style={[styles.inputGroup, styles.halfWidth]}>
//                     <Text style={styles.label}>City</Text>
//                     <TextInput
//                       style={[styles.input, !isEditing && styles.disabledInput]}
//                       value={businessData.city || ""}
//                       onChangeText={(value) => handleChange("city", value)}
//                       placeholder="New York"
//                       placeholderTextColor="#999"
//                       editable={isEditing}
//                     />
//                   </View>

//                   <View style={[styles.inputGroup, styles.halfWidth]}>
//                     <Text style={styles.label}>State</Text>
//                     <TextInput
//                       style={[styles.input, !isEditing && styles.disabledInput]}
//                       value={businessData.state || ""}
//                       onChangeText={(value) => handleChange("state", value)}
//                       placeholder="NY"
//                       placeholderTextColor="#999"
//                       editable={isEditing}
//                     />
//                   </View>
//                 </View>
//               </View>

//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Brand Colors</Text>

//                 <View style={styles.colorRow}>
//                   <View style={styles.colorInputGroup}>
//                     <Text style={styles.label}>Primary Color</Text>
//                     <TouchableOpacity
//                       style={[
//                         styles.colorButton,
//                         !isEditing && styles.disabledColorButton,
//                       ]}
//                       onPress={() =>
//                         isEditing && openColorPicker("primary_color")
//                       }
//                       disabled={!isEditing}
//                     >
//                       <View
//                         style={[
//                           styles.colorPreview,
//                           {
//                             backgroundColor:
//                               businessData.primary_color || "#007AFF",
//                           },
//                         ]}
//                       />
//                       <Text style={styles.colorText}>
//                         {businessData.primary_color}
//                       </Text>
//                       {isEditing && (
//                         <Ionicons name="chevron-forward" size={16} color="#666" />
//                       )}
//                     </TouchableOpacity>
//                   </View>

//                   <View style={styles.colorInputGroup}>
//                     <Text style={styles.label}>Secondary Color</Text>
//                     <TouchableOpacity
//                       style={[
//                         styles.colorButton,
//                         !isEditing && styles.disabledColorButton,
//                       ]}
//                       onPress={() =>
//                         isEditing && openColorPicker("secondary_color")
//                       }
//                       disabled={!isEditing}
//                     >
//                       <View
//                         style={[
//                           styles.colorPreview,
//                           {
//                             backgroundColor:
//                               businessData.secondary_color || "#34C759",
//                           },
//                         ]}
//                       />
//                       <Text style={styles.colorText}>
//                         {businessData.secondary_color}
//                       </Text>
//                       {isEditing && (
//                         <Ionicons name="chevron-forward" size={16} color="#666" />
//                       )}
//                     </TouchableOpacity>
//                   </View>
//                 </View>
//               </View>

//               {businesses.length > 1 && (
//                 <TouchableOpacity
//                   style={styles.deleteButton}
//                   onPress={() => deleteBusiness(selectedBusinessId)}
//                 >
//                   <Ionicons name="trash-outline" size={20} color="#FF3B30" />
//                   <Text style={styles.deleteButtonText}>Delete Business</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           ) : null}
//         </ScrollView>
//       </KeyboardAvoidingView>

//       {/* Full Color Picker Modal */}
//       <Modal
//         visible={showColorPicker}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowColorPicker(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.colorPickerModal}>
//             <View style={styles.colorPickerHeader}>
//               <Text style={styles.colorPickerTitle}>
//                 Select{" "}
//                 {colorPickerField === "primary_color" ? "Primary" : "Secondary"}{" "}
//                 Color
//               </Text>
//               <TouchableOpacity onPress={() => setShowColorPicker(false)}>
//                 <Ionicons name="close" size={24} color="#666" />
//               </TouchableOpacity>
//             </View>

//             <View style={styles.hexInputContainer}>
//               <Text style={styles.hexInputLabel}>#</Text>
//               <TextInput
//                 style={styles.hexInput}
//                 value={businessData[colorPickerField]?.replace("#", "")}
//                 onChangeText={(text) => {
//                   const hexColor = text.startsWith("#") ? text : `#${text}`;
//                   if (/^#[0-9A-Fa-f]{0,6}$/.test(hexColor)) {
//                     handleChange(colorPickerField, hexColor);
//                   }
//                 }}
//                 placeholder="000000"
//                 maxLength={6}
//                 autoCapitalize="characters"
//                 autoCorrect={false}
//                 keyboardType="default"
//               />
//             </View>

//             <ColorPicker
//               style={styles.colorPicker}
//               value={businessData[colorPickerField]}
//               onCompleteJS={handleColorSelect}
//             >
//               <Preview style={styles.colorPreviewPicker} />
//               <Panel1 style={styles.colorPanel} />
//               <HueSlider style={styles.colorSlider} />
//               <OpacitySlider style={styles.colorSlider} />
//               <Swatches style={styles.swatches} />
//             </ColorPicker>

//             <TouchableOpacity
//               style={styles.colorPickerDone}
//               onPress={() => setShowColorPicker(false)}
//             >
//               <Text style={styles.colorPickerDoneText}>Done</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* Business Slug Info Modal */}
//       <Modal
//         visible={showSlugInfoModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowSlugInfoModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.slugModalContent}>
//             <ScrollView showsVerticalScrollIndicator={false}>
//               <View style={styles.slugModalHeader}>
//                 <Text style={styles.slugModalTitle}>About Business URLs</Text>
//                 <TouchableOpacity onPress={() => setShowSlugInfoModal(false)}>
//                   <Ionicons name="close" size={24} color="#666" />
//                 </TouchableOpacity>
//               </View>

//               <View style={styles.slugInfoSection}>
//                 <Text style={styles.slugInfoSectionTitle}>
//                   🏢 What is a Business URL?
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   Your business URL (also called a "slug") is the unique web address
//                   for your entire business on CrownPages. All your pages will be organized under this URL:
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   crownpages.com/<Text style={styles.bold}>your-business-name</Text>/<Text style={styles.bold}>page-name</Text>
//                 </Text>
//               </View>

//               <View style={styles.slugInfoSection}>
//                 <Text style={styles.slugInfoSectionTitle}>✨ Why It Matters</Text>
//                 <Text style={styles.slugInfoText}>
//                   • <Text style={styles.bold}>Brand Identity:</Text> Your business URL represents your brand online
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • <Text style={styles.bold}>Easy to Remember:</Text> Customers can easily find and share your business
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • <Text style={styles.bold}>Professional Appearance:</Text> Clean URLs build trust with visitors
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • <Text style={styles.bold}>SEO Benefits:</Text> Search engines prefer descriptive URLs
//                 </Text>
//               </View>

//               <View style={styles.slugInfoSection}>
//                 <Text style={styles.slugInfoSectionTitle}>📋 Best Practices</Text>
//                 <Text style={styles.slugInfoText}>
//                   • Use your business name when possible
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • Keep it short and professional
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • Use hyphens to separate words
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • Avoid numbers unless part of your brand
//                 </Text>
//                 <Text style={styles.slugInfoText}>
//                   • Make it easy to spell and pronounce
//                 </Text>
//               </View>

//               <View style={styles.slugExampleSection}>
//                 <Text style={styles.slugInfoSectionTitle}>💡 Examples</Text>
//                 <View style={styles.slugExampleItem}>
//                   <Text style={styles.slugExampleGood}>✅ Good:</Text>
//                   <Text style={styles.slugExampleUrl}>smith-dental-care</Text>
//                 </View>
//                 <View style={styles.slugExampleItem}>
//                   <Text style={styles.slugExampleGood}>✅ Good:</Text>
//                   <Text style={styles.slugExampleUrl}>jones-law-firm</Text>
//                 </View>
//                 <View style={styles.slugExampleItem}>
//                   <Text style={styles.slugExampleGood}>✅ Good:</Text>
//                   <Text style={styles.slugExampleUrl}>bella-salon</Text>
//                 </View>
//                 <View style={styles.slugExampleItem}>
//                   <Text style={styles.slugExampleBad}>❌ Avoid:</Text>
//                   <Text style={styles.slugExampleUrl}>business123xyz</Text>
//                 </View>
//               </View>

//               <View style={styles.slugWarningBox}>
//                 <Ionicons name="warning" size={20} color="#F59E0B" />
//                 <Text style={styles.slugWarningText}>
//                   Important: Your business URL cannot be changed once created!
//                   Choose carefully as this will be your permanent web address on CrownPages.
//                 </Text>
//               </View>
//             </ScrollView>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// };

// export default MyBusinessScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f5f5",
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: 16,
//     backgroundColor: "#fff",
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "600",
//     color: "#000",
//   },
//   addButton: {
//     padding: 8,
//   },
//   addBusinessCard: {
//     backgroundColor: "#f8f9fa",
//     padding: 12,
//     borderRadius: 8,
//     marginRight: 12,
//     minWidth: 150,
//     borderWidth: 2,
//     borderColor: "#007AFF",
//     borderStyle: "dashed",
//     alignItems: "center",
//     justifyContent: "center",
//     minHeight: 60,
//   },
//   addBusinessText: {
//     fontSize: 12,
//     color: "#007AFF",
//     marginTop: 4,
//     fontWeight: "500",
//   },
//   businessSelector: {
//     backgroundColor: "#fff",
//     paddingVertical: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   selectorTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 12,
//     paddingHorizontal: 16,
//   },
//   businessList: {
//     paddingHorizontal: 16,
//   },
//   businessCard: {
//     backgroundColor: "#f8f9fa",
//     padding: 12,
//     borderRadius: 8,
//     marginRight: 12,
//     minWidth: 150,
//     borderWidth: 2,
//     borderColor: "transparent",
//   },
//   selectedBusinessCard: {
//     backgroundColor: "#007AFF",
//     borderColor: "#007AFF",
//   },
//   businessName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 4,
//   },
//   selectedBusinessName: {
//     color: "#fff",
//   },
//   businessEmail: {
//     fontSize: 12,
//     color: "#666",
//   },
//   selectedBusinessEmail: {
//     color: "#fff",
//     opacity: 0.8,
//   },
//   keyboardAvoidingView: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   form: {
//     padding: 16,
//   },
//   createFormHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 24,
//   },
//   formTitle: {
//     fontSize: 24,
//     fontWeight: "600",
//     color: "#000",
//   },
//   businessHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 24,
//     padding: 16,
//     backgroundColor: "#fff",
//     borderRadius: 12,
//   },
//   businessInfo: {
//     flex: 1,
//   },
//   businessTitle: {
//     fontSize: 20,
//     fontWeight: "600",
//     color: "#000",
//     marginBottom: 4,
//   },
//   businessSubtitle: {
//     fontSize: 14,
//     color: "#666",
//   },
//   businessActions: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   editButton: {
//     padding: 8,
//     backgroundColor: "#f0f8ff",
//     borderRadius: 8,
//   },
//   editActions: {
//     flexDirection: "row",
//     gap: 8,
//   },
//   cancelButton: {
//     padding: 8,
//     backgroundColor: "#ffe6e6",
//     borderRadius: 8,
//   },
//   saveButton: {
//     padding: 8,
//     backgroundColor: "#007AFF",
//     borderRadius: 8,
//   },
//   section: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#000",
//     marginBottom: 0,
//   },
//   inputGroup: {
//     marginBottom: 16,
//   },
//   labelContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: "500",
//     color: "#333",
//   },
//   requiredStar: {
//     marginLeft: 4,
//   },
//   requiredAsterisk: {
//     color: "red",
//     fontSize: 16,
//     marginLeft: 4,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     backgroundColor: "#fff",
//   },
//   disabledInput: {
//     backgroundColor: "#f8f9fa",
//     color: "#666",
//   },
//   textArea: {
//     minHeight: 80,
//     textAlignVertical: "top",
//   },
//   row: {
//     flexDirection: "row",
//     gap: 12,
//   },
//   halfWidth: {
//     flex: 1,
//   },
//   colorRow: {
//     flexDirection: "row",
//     gap: 16,
//   },
//   colorInputGroup: {
//     flex: 1,
//   },
//   colorButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: "#ddd",
//     borderRadius: 8,
//     padding: 12,
//     backgroundColor: "#fff",
//   },
//   disabledColorButton: {
//     backgroundColor: "#f8f9fa",
//   },
//   colorPreview: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     marginRight: 12,
//     borderWidth: 1,
//     borderColor: "#ddd",
//   },
//   colorText: {
//     flex: 1,
//     fontSize: 14,
//     color: "#333",
//     fontFamily: "monospace",
//   },
//   createButton: {
//     flexDirection: "row",
//     backgroundColor: "#007AFF",
//     padding: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     marginTop: 24,
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   createButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "600",
//   },
//   deleteButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     padding: 16,
//     marginTop: 24,
//     borderWidth: 1,
//     borderColor: "#FF3B30",
//     borderRadius: 12,
//     backgroundColor: "#fff",
//   },
//   deleteButtonText: {
//     color: "#FF3B30",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0, 0, 0, 0.5)",
//     justifyContent: "flex-end",
//   },
//   colorPickerModal: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 20,
//     maxHeight: "90%",
//   },
//   colorPickerHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   colorPickerTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#000",
//   },
//   hexInputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//     borderRadius: 8,
//     padding: 8,
//     marginBottom: 16,
//   },
//   hexInputLabel: {
//     fontSize: 16,
//     color: "#666",
//     marginRight: 4,
//     fontFamily: "monospace",
//   },
//   hexInput: {
//     flex: 1,
//     fontSize: 16,
//     color: "#333",
//     fontFamily: "monospace",
//     padding: 4,
//   },
//   colorPicker: {
//     width: "100%",
//   },
//   colorPreviewPicker: {
//     marginBottom: 16,
//     borderRadius: 8,
//     height: 40,
//   },
//   colorPanel: {
//     borderRadius: 8,
//     marginBottom: 16,
//     height: 200,
//   },
//   colorSlider: {
//     borderRadius: 8,
//     marginBottom: 16,
//     height: 32,
//   },
//   swatches: {
//     marginBottom: 16,
//     gap: 12,
//   },
//   colorPickerDone: {
//     backgroundColor: "#007AFF",
//     padding: 16,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 8,
//   },
//   colorPickerDoneText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   slugHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   infoButton: {
//     padding: 8,
//   },
//   previewContainer: {
//     marginTop: 8,
//     marginBottom: 12,
//   },
//   previewLabel: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 4,
//   },
//   urlPreview: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f8ff",
//     borderRadius: 8,
//     padding: 10,
//   },
//   urlPrefix: {
//     fontSize: 14,
//     color: "#007AFF",
//     fontWeight: "600",
//   },
//   urlSlug: {
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   slugRulesContainer: {
//     marginTop: 8,
//     marginBottom: 12,
//   },
//   slugRulesTitle: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#333",
//     marginBottom: 8,
//   },
//   slugRule: {
//     fontSize: 13,
//     color: "#666",
//     marginBottom: 4,
//   },
//   slugExampleSection: {
//     marginTop: 16,
//     marginBottom: 12,
//   },
//   slugExampleItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   slugExampleGood: {
//     fontSize: 14,
//     color: "#22C55E",
//     fontWeight: "600",
//     marginRight: 8,
//   },
//   slugExampleBad: {
//     fontSize: 14,
//     color: "#EF4444",
//     fontWeight: "600",
//     marginRight: 8,
//   },
//   slugExampleUrl: {
//     fontSize: 14,
//     fontWeight: "600",
//   },
//   slugWarningBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFFBEB",
//     borderRadius: 8,
//     padding: 12,
//     marginTop: 16,
//   },
//   slugWarningText: {
//     fontSize: 14,
//     color: "#D97706",
//     marginLeft: 8,
//     flexShrink: 1,
//   },
//   bold: {
//     fontWeight: "bold",
//   },
//   slugModalContent: {
//     backgroundColor: "#fff",
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 20,
//     maxHeight: "90%",
//   },
//   slugModalHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   slugModalTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#000",
//   },
//   slugInfoSection: {
//     marginBottom: 16,
//   },
//   slugInfoSectionTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#000",
//     marginBottom: 8,
//   },
//   slugInfoText: {
//     fontSize: 14,
//     color: "#333",
//     lineHeight: 22,
//     marginBottom: 8,
//   },
//   inputContainer: {
//     marginTop: 8,
//     marginBottom: 12,
//   },
//   generateButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#f0f8ff",
//     borderRadius: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 15,
//   },
//   generateText: {
//     color: "#007AFF",
//     fontSize: 14,
//     fontWeight: "600",
//     marginLeft: 8,
//   },
//   statusContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#f0f8ff",
//     borderRadius: 8,
//     padding: 10,
//     marginTop: 8,
//   },
//   statusIndicator: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginRight: 8,
//   },
//   statusText: {
//     fontSize: 13,
//     fontWeight: "500",
//   },
//   // Business page styles
//   sectionDescription: {
//     fontSize: 14,
//     color: "#666",
//     marginBottom: 16,
//   },
//   // URL Preview Card Styles
//   urlPreviewCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 16,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   urlHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//     gap: 8,
//   },
//   urlLabel: {
//     fontSize: 14,
//     color: "#666",
//     fontWeight: "500",
//   },
//   businessPageUrl: {
//     fontSize: 16,
//     color: "#007AFF",
//     fontWeight: "600",
//     fontFamily: "monospace",
//   },

//   businessPageLoading: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   businessPageLoadingText: {
//     fontSize: 14,
//     color: "#666",
//     marginLeft: 8,
//   },

//   // Business Page Card Styles
//   businessPageCard: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 0,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.08,
//     shadowRadius: 8,
//     elevation: 4,
//     overflow: "hidden",
//   },
//   businessPageHeader: {
//     padding: 20,
//     backgroundColor: "#f8fafc",
//   },
//   businessPageTitleContainer: {
//     flex: 1,
//   },
//   businessPageTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1a1a1a",
//     marginBottom: 6,
//     lineHeight: 24,
//   },
//   businessPageDescription: {
//     fontSize: 15,
//     color: "#666",
//     lineHeight: 20,
//   },
//   businessPageContent: {
//     padding: 20,
//     paddingTop: 16,
//   },
//   businessPageStatsContainer: {
//     flexDirection: "row",
//     marginBottom: 20,
//     gap: 24,
//   },
//   businessPageStatItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//   },
//   statIconContainer: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: "#f0f8ff",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   statContent: {
//     alignItems: "flex-start",
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#1a1a1a",
//     lineHeight: 20,
//   },
//   statLabel: {
//     fontSize: 13,
//     color: "#666",
//     marginTop: 2,
//   },
//   editBusinessPageButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#007AFF",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 10,
//     gap: 8,
//     shadowColor: "#007AFF",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   editBusinessPageText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },

//   // Legacy styles (keeping for compatibility)
//   businessPageInfo: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#f8f9fa",
//     padding: 16,
//     borderRadius: 8,
//   },
//   businessPageDetails: {
//     flex: 1,
//   },
//   businessPageStats: {
//     flexDirection: "row",
//     gap: 16,
//   },
//   businessPageStat: {
//     fontSize: 12,
//     color: "#999",
//   },
//   businessPageError: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#FFF3CD",
//     padding: 16,
//     borderRadius: 8,
//     gap: 8,
//   },
//   businessPageErrorText: {
//     fontSize: 14,
//     color: "#856404",
//     flex: 1,
//   },

//   // Integrated Analytics Card Styles
//   analyticsCard: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     marginTop: 16,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 2,
//     overflow: "hidden",
//   },
//   analyticsHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 20,
//     backgroundColor: "#f8fafc",
//     gap: 12,
//   },
//   analyticsIconContainer: {
//     width: 32,
//     height: 32,
//     borderRadius: 8,
//     backgroundColor: "#f0f8ff",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   analyticsTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1a1a1a",
//   },
//   analyticsGrid: {
//     flexDirection: "row",
//     padding: 20,
//     paddingTop: 16,
//     gap: 24,
//   },
//   analyticsMetric: {
//     flex: 1,
//     alignItems: "center",
//   },
//   analyticsMetricValue: {
//     fontSize: 24,
//     fontWeight: "700",
//     color: "#1a1a1a",
//     marginBottom: 4,
//   },
//   analyticsMetricLabel: {
//     fontSize: 12,
//     color: "#666",
//     textAlign: "center",
//     lineHeight: 16,
//   },
//   viewDetailedAnalyticsButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#f8fafc",
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//     marginHorizontal: 20,
//     marginBottom: 20,
//     borderRadius: 10,
//     gap: 8,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//   },
//   viewDetailedAnalyticsText: {
//     color: "#007AFF",
//     fontSize: 15,
//     fontWeight: "600",
//   },
//   analyticsLoadingCard: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     marginTop: 16,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   analyticsLoadingContent: {
//     alignItems: "center",
//     padding: 32,
//   },
//   analyticsLoadingTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#007AFF",
//     marginTop: 12,
//     marginBottom: 8,
//   },
//   analyticsLoadingDescription: {
//     fontSize: 14,
//     color: "#666",
//     textAlign: "center",
//     lineHeight: 20,
//   },
//   analyticsUnavailableCard: {
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     marginTop: 16,
//     borderWidth: 1,
//     borderColor: "#e1e5e9",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.04,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   analyticsUnavailableContent: {
//     alignItems: "center",
//     padding: 32,
//   },
//   analyticsUnavailableTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#666",
//     marginTop: 12,
//     marginBottom: 8,
//   },
//   analyticsUnavailableDescription: {
//     fontSize: 14,
//     color: "#999",
//     textAlign: "center",
//     lineHeight: 20,
//   },

//   // Legacy Analytics Styles (keeping for compatibility)
//   analyticsOverview: {
//     backgroundColor: "#f8f9fa",
//     borderRadius: 8,
//     padding: 16,
//   },
//   analyticsPreviewContainer: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 16,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   analyticsPreviewItem: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#f1f3f4",
//   },
//   analyticsPreviewLabel: {
//     fontSize: 16,
//     color: "#333",
//     fontWeight: "500",
//   },
//   analyticsPreviewValue: {
//     fontSize: 18,
//     color: "#000",
//     fontWeight: "700",
//   },
//   viewAnalyticsButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#007AFF",
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     gap: 8,
//   },
//   viewAnalyticsText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   analyticsUnavailable: {
//     alignItems: "center",
//     paddingVertical: 32,
//     paddingHorizontal: 16,
//   },
//   analyticsUnavailableText: {
//     fontSize: 14,
//     color: "#666",
//     textAlign: "center",
//     marginTop: 8,
//   },

//   sectionHeaderRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   shareIconButton: {
//     padding: 8,
//     backgroundColor: "#f0f8ff",
//     borderRadius: 8,
//   },
// });
