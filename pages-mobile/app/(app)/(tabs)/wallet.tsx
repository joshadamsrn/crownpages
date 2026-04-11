// import { Ionicons } from '@expo/vector-icons';
// import { useFocusEffect } from '@react-navigation/native';
// import { router } from 'expo-router';
// import { useCallback, useState } from 'react';
// import {
//     ActivityIndicator,
//     Alert,
//     FlatList,
//     Image,
//     Modal,
//     Platform,
//     RefreshControl,
//     Share,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View
// } from 'react-native';
// import { useAuth } from '../../../contexts/AuthContext';
// import { Database } from '../../../database.types';
// import { getPublicStorageUrl, supabase } from '../../../utils/supabase';

// type WalletFolder = Database['public']['Tables']['wallet_folders']['Row'];
// type WalletItem = Database['public']['Tables']['wallet_items']['Row'] & {
//   page: Database['public']['Tables']['pages']['Row'] & {
//     business: Database['public']['Tables']['businesses']['Row'];
//   };
//   folder: Database['public']['Tables']['wallet_folders']['Row'] | null;
// };

// type FolderWithItems = WalletFolder & {
//   items: WalletItem[];
//   isExpanded: boolean;
// };

// export default function WalletScreen() {
//   const { session } = useAuth();
//   const [foldersWithItems, setFoldersWithItems] = useState<FolderWithItems[]>([]);
//   const [unfolderItems, setUnfolderItems] = useState<WalletItem[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // Folder management
//   const [showFolderModal, setShowFolderModal] = useState(false);
//   const [editingFolder, setEditingFolder] = useState<WalletFolder | null>(null);
//   const [folderName, setFolderName] = useState('');
//   const [folderDescription, setFolderDescription] = useState('');
//   const [folderColor, setFolderColor] = useState('#007AFF');
//   const [folderIcon, setFolderIcon] = useState('folder');
//   const [isSavingFolder, setIsSavingFolder] = useState(false);

//   // Item management
//   const [selectedItem, setSelectedItem] = useState<WalletItem | null>(null);
//   const [showItemActions, setShowItemActions] = useState(false);
//   const [showMoveModal, setShowMoveModal] = useState(false);

//   const folderColors = [
//     '#007AFF', '#FF3B30', '#FF9500', '#FFCC00',
//     '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92'
//   ];

//   const folderIcons = [
//     'folder', 'folder-open', 'heart', 'star', 'bookmark',
//     'briefcase', 'home', 'car', 'fitness', 'restaurant'
//   ];

//   // Refresh wallet data every time the screen comes into focus
//   useFocusEffect(
//     useCallback(() => {
//       console.log('Wallet screen focused, fetching data...');
//       fetchWalletData();
//     }, [session?.user?.id]) // Add session dependency to ensure it refetches when user changes
//   );

//   const fetchWalletData = async () => {
//     try {
//       if (!session?.user?.id) {
//         console.warn('No user session found');
//         return;
//       }

//       // Fetch folders with proper error handling
//       const { data: folders, error: foldersError } = await supabase
//         .from('wallet_folders')
//         .select('*')
//         .eq('user_id', session.user.id)
//         .order('sort_order', { nullsFirst: false })
//         .order('name');

//       if (foldersError) {
//         console.error('Error fetching folders:', foldersError);
//         throw foldersError;
//       }

//       console.log(`Fetched ${folders?.length || 0} folders for user ${session.user.id}`);

//       // Fetch wallet items with proper error handling
//       const { data: items, error: itemsError } = await supabase
//         .from('wallet_items')
//         .select(`
//           *,
//           page:pages(
//             *,
//             business:businesses(*)
//           ),
//           folder:wallet_folders(*)
//         `)
//         .eq('user_id', session.user.id)
//         .order('saved_at', { ascending: false });

//       if (itemsError) {
//         console.error('Error fetching wallet items:', itemsError);
//         throw itemsError;
//       }

//       // Group items by folder with null safety
//       const foldersWithItems: FolderWithItems[] = (folders || []).map(folder => {
//         const folderItems = (items || []).filter(item => item.folder_id === folder.id);
//         const isNewFolder = new Date(folder.created_at).getTime() > Date.now() - 5000; // Created in last 5 seconds

//         return {
//           ...folder,
//           items: folderItems,
//           isExpanded: folder.is_default || isNewFolder || false, // Expand default folders and newly created ones
//         };
//       });

//       // Items without folder
//       const unfolderItems = (items || []).filter(item => !item.folder_id);

//       // Update state with new data
//       console.log('Updating state with folders:', foldersWithItems.map(f => ({ id: f.id, name: f.name, expanded: f.isExpanded })));
//       setFoldersWithItems(foldersWithItems);
//       setUnfolderItems(unfolderItems);

//     } catch (error) {
//       console.error('Error fetching wallet data:', error);

//       // Always show error to user for better debugging, except during initial load
//       if (!isLoading) {
//         Alert.alert('Error', 'Failed to load wallet data. Please try again.');
//       }
//     } finally {
//       setIsLoading(false);
//       setIsRefreshing(false);
//     }
//   };

//   const handleRefresh = () => {
//     console.log('Manual refresh triggered');
//     setIsRefreshing(true);
//     fetchWalletData();
//   };

//   const toggleFolder = (folderId: string) => {
//     setFoldersWithItems(prev =>
//       prev.map(folder =>
//         folder.id === folderId
//           ? { ...folder, isExpanded: !folder.isExpanded }
//           : folder
//       )
//     );
//   };

//   const openBookmark = (item: WalletItem) => {
//     const business = item.page.business as any;
//     const businessSlug = business?.slug;
//     const pageSlug = item.page.slug;

//     if (businessSlug && pageSlug) {
//       router.push(`/(app)/page-viewer/${businessSlug}/${pageSlug}` as any);
//     } else {
//       Alert.alert('Error', 'Unable to open this page');
//     }
//   };

//   const showItemActionsModal = (item: WalletItem) => {
//     setSelectedItem(item);
//     setShowItemActions(true);
//   };

//   const deleteBookmark = async (item: WalletItem) => {
//     try {
//       const { error } = await supabase
//         .from('wallet_items')
//         .delete()
//         .eq('id', item.id);

//       if (error) throw error;

//       Alert.alert('Deleted', 'Bookmark removed from wallet');
//       fetchWalletData();
//     } catch (error) {
//       console.error('Error deleting bookmark:', error);
//       Alert.alert('Error', 'Failed to delete bookmark');
//     }
//   };

//   const moveBookmark = async (item: WalletItem, newFolderId: string | null) => {
//     try {
//       const { error } = await supabase
//         .from('wallet_items')
//         .update({ folder_id: newFolderId })
//         .eq('id', item.id);

//       if (error) throw error;

//       setShowMoveModal(false);
//       setSelectedItem(null);
//       fetchWalletData();
//     } catch (error) {
//       console.error('Error moving bookmark:', error);
//       Alert.alert('Error', 'Failed to move bookmark');
//     }
//   };

//   const handleShareWalletItem = async (item: WalletItem) => {
//     try {
//       const businessSlug = item.page.business?.slug || '';
//       const pageSlug = item.page.slug || '';

//       if (!businessSlug || !pageSlug) {
//         Alert.alert('Error', 'Unable to share this page - missing information');
//         return;
//       }

//       const pagesRootUrl = process.env.EXPO_PUBLIC_PAGES_ROOT_URL || 'https://crownpages.com';
//       const baseUrl = pagesRootUrl.replace(/\/$/, '');
//       const pageUrl = `${baseUrl}/${businessSlug}/${pageSlug}`;

//       // Platform-specific sharing to prevent duplicates on iOS
//       if (Platform.OS === 'ios') {
//         // On iOS, only use message to prevent duplicate content in iMessage
//         await Share.share({
//           message: pageUrl,
//         });
//       } else {
//         // On Android, include URL in message AND as separate parameter for rich previews
//         await Share.share({
//           message: pageUrl,
//           url: pageUrl,
//         });
//       }
//     } catch (error) {
//       console.error('Error sharing wallet item:', error);
//       Alert.alert('Error', 'Failed to share page');
//     }
//   };

//   const createOrUpdateFolder = async () => {
//     if (!folderName.trim()) {
//       Alert.alert('Error', 'Please enter a folder name');
//       return;
//     }

//     if (isSavingFolder) return; // Prevent double-submission

//     setIsSavingFolder(true);

//     try {
//       let folderData;

//       if (editingFolder) {
//         // Update existing folder
//         const { data, error } = await supabase
//           .from('wallet_folders')
//           .update({
//             name: folderName.trim(),
//             description: folderDescription.trim() || null,
//             color: folderColor,
//             icon: folderIcon,
//             updated_at: new Date().toISOString(),
//           })
//           .eq('id', editingFolder.id)
//           .select()
//           .single();

//         if (error) throw error;
//         folderData = data;
//       } else {
//         // Create new folder
//         const { data, error } = await supabase
//           .from('wallet_folders')
//           .insert({
//             user_id: session?.user?.id,
//             name: folderName.trim(),
//             description: folderDescription.trim() || null,
//             color: folderColor,
//             icon: folderIcon,
//           })
//           .select()
//           .single();

//         if (error) throw error;
//         folderData = data;
//       }

//       setShowFolderModal(false);
//       resetFolderForm();

//       // Force a complete refresh instead of optimistic updates to ensure consistency
//       console.log(`${editingFolder ? 'Updated' : 'Created'} folder:`, folderData);
//       await fetchWalletData();

//       // Show success message
//       Alert.alert('Success', `Folder ${editingFolder ? 'updated' : 'created'} successfully`);

//     } catch (error) {
//       console.error('Error saving folder:', error);
//       Alert.alert('Error', `Failed to ${editingFolder ? 'update' : 'create'} folder. Please try again.`);

//       // Always refresh to ensure we have the correct state
//       await fetchWalletData();
//     } finally {
//       setIsSavingFolder(false);
//     }
//   };

//   const deleteFolder = async (folder: FolderWithItems) => {
//     if (folder.is_default) {
//       Alert.alert('Error', 'Cannot delete the default folder');
//       return;
//     }

//     if (folder.items.length > 0) {
//       Alert.alert(
//         'Folder Not Empty',
//         'This folder contains bookmarks. Move them to another folder first.',
//         [
//           { text: 'Cancel' },
//           {
//             text: 'Move to Default',
//             onPress: async () => {
//               // Move all items to default folder
//               const defaultFolder = foldersWithItems.find(f => f.is_default);
//               if (defaultFolder) {
//                 try {
//                   const { error } = await supabase
//                     .from('wallet_items')
//                     .update({ folder_id: defaultFolder.id })
//                     .eq('folder_id', folder.id);

//                   if (error) throw error;
//                   await deleteEmptyFolder(folder);
//                 } catch (error) {
//                   console.error('Error moving items:', error);
//                   Alert.alert('Error', 'Failed to move items');
//                 }
//               }
//             }
//           }
//         ]
//       );
//       return;
//     }

//     await deleteEmptyFolder(folder);
//   };

//   const deleteEmptyFolder = async (folder: FolderWithItems) => {
//     try {
//       const { error } = await supabase
//         .from('wallet_folders')
//         .delete()
//         .eq('id', folder.id);

//       if (error) throw error;

//       Alert.alert('Deleted', 'Folder deleted successfully');
//       fetchWalletData();
//     } catch (error) {
//       console.error('Error deleting folder:', error);
//       Alert.alert('Error', 'Failed to delete folder');
//     }
//   };

//   const editFolder = (folder: FolderWithItems) => {
//     setEditingFolder(folder);
//     setFolderName(folder.name);
//     setFolderDescription(folder.description || '');
//     setFolderColor(folder.color || '#007AFF');
//     setFolderIcon(folder.icon || 'folder');
//     setShowFolderModal(true);
//   };

//   const resetFolderForm = () => {
//     setEditingFolder(null);
//     setFolderName('');
//     setFolderDescription('');
//     setFolderColor('#007AFF');
//     setFolderIcon('folder');
//     setIsSavingFolder(false);
//   };

//   const renderWalletItem = (item: WalletItem, showFolderName: boolean = false) => (
//     <TouchableOpacity
//       key={item.id}
//       style={styles.walletItem}
//       onPress={() => openBookmark(item)}
//       onLongPress={() => showItemActionsModal(item)}
//     >
//       {/* Page Image/Logo */}
//       <View style={[styles.pageImageContainer, !item.page.og_image_url && styles.logoBackground]}>
//         {item.page.og_image_url && getPublicStorageUrl(item.page.og_image_url) ? (
//           <Image source={{ uri: getPublicStorageUrl(item.page.og_image_url)! }} style={styles.pageImage} />
//         ) : (
//           <Image
//             source={require('../../../assets/images/logo/crown only w.png')}
//             style={styles.logoImage}
//             resizeMode="contain"
//           />
//         )}

//         {/* Favorite Badge */}
//         {item.is_favorite && (
//           <View style={styles.favoriteBadge}>
//             <Ionicons name="star" size={14} color="#FFD700" />
//           </View>
//         )}
//       </View>

//       {/* Page Content */}
//       <View style={styles.itemContent}>
//         <View style={styles.itemHeader}>
//           <Text style={styles.itemTitle} numberOfLines={2}>
//             {item.page.title}
//           </Text>
//           <TouchableOpacity
//             onPress={(e) => {
//               e.stopPropagation();
//               showItemActionsModal(item);
//             }}
//             style={styles.moreButton}
//           >
//             <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
//           </TouchableOpacity>
//         </View>

//         <Text style={styles.businessName}>{item.page.business.name}</Text>
        
//         {item.page.description && (
//           <Text style={styles.itemDescription} numberOfLines={2}>
//             {item.page.description}
//           </Text>
//         )}

//         {/* Folder Tag and Save Date */}
//         <View style={styles.itemFooter}>
//           {showFolderName && item.folder && (
//             <View style={[styles.folderTag, { backgroundColor: (item.folder.color || '#007AFF') + '20' }]}>
//               <Ionicons name={(item.folder.icon || 'folder') as any} size={12} color={item.folder.color || '#007AFF'} />
//               <Text style={[styles.folderName, { color: item.folder.color || '#007AFF' }]}>
//                 {item.folder.name}
//               </Text>
//             </View>
//           )}
//           <Text style={styles.saveDate}>
//             Saved {new Date(item.saved_at).toLocaleDateString()}
//           </Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );

//   const renderFolder = (folder: FolderWithItems) => (
//     <View key={folder.id} style={styles.folderContainer}>
//       <TouchableOpacity
//         style={styles.folderHeader}
//         onPress={() => toggleFolder(folder.id)}
//       >
//         <View style={styles.folderInfo}>
//           <View style={[styles.folderIconContainer, { backgroundColor: folder.color || '#007AFF' }]}>
//             <Ionicons name={(folder.icon || 'folder') as any} size={20} color="#fff" />
//           </View>
//           <View style={styles.folderDetails}>
//             <Text style={styles.folderHeaderName}>{folder.name}</Text>
//             <Text style={styles.folderItemCount}>
//               {folder.items.length} {folder.items.length === 1 ? 'item' : 'items'}
//             </Text>
//           </View>
//         </View>
//         <View style={styles.folderControls}>
//           <TouchableOpacity
//             onPress={(e) => {
//               e.stopPropagation();
//               editFolder(folder);
//             }}
//             style={styles.folderControlButton}
//           >
//             <Ionicons name="pencil" size={16} color="#666" />
//           </TouchableOpacity>
//           {!folder.is_default && (
//             <TouchableOpacity
//               onPress={(e) => {
//                 e.stopPropagation();
//                 deleteFolder(folder);
//               }}
//               style={styles.folderControlButton}
//             >
//               <Ionicons name="trash-outline" size={16} color="#FF3B30" />
//             </TouchableOpacity>
//           )}
//           <Ionicons
//             name={folder.isExpanded ? "chevron-up" : "chevron-down"}
//             size={16}
//             color="#999"
//           />
//         </View>
//       </TouchableOpacity>

//       {folder.isExpanded && (
//         <View style={styles.folderContent}>
//           {folder.items.length > 0 ? (
//             <View style={styles.folderItemsContainer}>
//               {folder.items.map(item => renderWalletItem(item))}
//             </View>
//           ) : (
//             <View style={styles.emptyFolder}>
//               <Ionicons name="folder-open-outline" size={32} color="#ccc" />
//               <Text style={styles.emptyFolderText}>Folder is empty</Text>
//             </View>
//           )}
//         </View>
//       )}
//     </View>
//   );

//   if (isLoading) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   const totalItems = foldersWithItems.reduce((acc, folder) => acc + folder.items.length, 0) + unfolderItems.length;
//   const hasAnyFolders = foldersWithItems.length > 0;
//   const showContent = hasAnyFolders || unfolderItems.length > 0;

//   return (
//     <View style={styles.container}>
//       {!showContent ? (
//         <View style={styles.emptyContainer}>
//           <Ionicons name="wallet-outline" size={64} color="#ccc" />
//           <Text style={styles.emptyTitle}>Your wallet is empty</Text>
//           <Text style={styles.emptyDescription}>
//             Save Crown Pages from others to access them anytime. Tap the wallet icon when viewing a page to save it here.
//           </Text>
//         </View>
//       ) : (
//         <FlatList
//           data={[
//             ...foldersWithItems,
//             ...(unfolderItems.length > 0 ? [{
//               id: 'unfolder',
//               type: 'unfolder',
//               items: unfolderItems
//             }] : [])
//           ]}
//           renderItem={({ item }) => {
//             if ('type' in item && item.type === 'unfolder') {
//               return (
//                 <View style={styles.unfolderSection}>
//                   <View style={styles.unfolderHeader}>
//                     <Text style={styles.unfolderTitle}>Unsorted</Text>
//                     <Text style={styles.folderItemCount}>
//                       {unfolderItems.length} {unfolderItems.length === 1 ? 'item' : 'items'}
//                     </Text>
//                   </View>
//                   <View style={styles.folderItemsContainer}>
//                     {unfolderItems.map(unfolderItem => renderWalletItem(unfolderItem, true))}
//                   </View>
//                 </View>
//               );
//             }
//             return renderFolder(item as FolderWithItems);
//           }}
//           keyExtractor={(item) => 'type' in item ? item.type : item.id}
//           contentContainerStyle={styles.listContent}
//           refreshControl={
//             <RefreshControl
//               refreshing={isRefreshing}
//               onRefresh={handleRefresh}
//               colors={['#007AFF']}
//             />
//           }
//         />
//       )}

//       {/* Floating Action Button */}
//       <TouchableOpacity
//         style={styles.fab}
//         onPress={() => {
//           resetFolderForm();
//           setShowFolderModal(true);
//         }}
//       >
//         <Ionicons name="add" size={24} color="#fff" />
//       </TouchableOpacity>

//       {/* Folder Management Modal */}
//       <Modal
//         visible={showFolderModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowFolderModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>
//                 {editingFolder ? 'Edit Folder' : 'Create Folder'}
//               </Text>
//               <TouchableOpacity onPress={() => setShowFolderModal(false)}>
//                 <Ionicons name="close" size={24} color="#000" />
//               </TouchableOpacity>
//             </View>

//             <View style={styles.formContainer}>
//               <Text style={styles.formLabel}>Name</Text>
//               <TextInput
//                 style={styles.formInput}
//                 value={folderName}
//                 onChangeText={setFolderName}
//                 placeholder="Folder name"
//                 maxLength={50}
//               />

//               <Text style={styles.formLabel}>Description (Optional)</Text>
//               <TextInput
//                 style={styles.formInput}
//                 value={folderDescription}
//                 onChangeText={setFolderDescription}
//                 placeholder="Brief description"
//                 maxLength={100}
//               />

//               <Text style={styles.formLabel}>Color</Text>
//               <View style={styles.colorPicker}>
//                 {folderColors.map(color => (
//                   <TouchableOpacity
//                     key={color}
//                     style={[
//                       styles.colorOption,
//                       { backgroundColor: color },
//                       folderColor === color && styles.selectedColor
//                     ]}
//                     onPress={() => setFolderColor(color)}
//                   />
//                 ))}
//               </View>

//               <Text style={styles.formLabel}>Icon</Text>
//               <View style={styles.iconPicker}>
//                 {folderIcons.map(icon => (
//                   <TouchableOpacity
//                     key={icon}
//                     style={[
//                       styles.iconOption,
//                       folderIcon === icon && styles.selectedIcon
//                     ]}
//                     onPress={() => setFolderIcon(icon)}
//                   >
//                     <Ionicons name={icon as any} size={24} color={folderIcon === icon ? folderColor : "#666"} />
//                   </TouchableOpacity>
//                 ))}
//               </View>

//               <TouchableOpacity
//                 style={[styles.saveButton, isSavingFolder && styles.disabledButton]}
//                 onPress={createOrUpdateFolder}
//                 disabled={isSavingFolder}
//               >
//                 {isSavingFolder ? (
//                   <ActivityIndicator color="#fff" size="small" />
//                 ) : (
//                   <Text style={styles.saveButtonText}>
//                     {editingFolder ? 'Update Folder' : 'Create Folder'}
//                   </Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Item Actions Modal */}
//       <Modal
//         visible={showItemActions}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowItemActions(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.actionModalContent}>
//             {selectedItem && (
//               <>
//                 <View style={styles.itemPreview}>
//                   <Text style={styles.itemPreviewTitle}>{selectedItem.page.title}</Text>
//                   <Text style={styles.itemPreviewBusiness}>{selectedItem.page.business.name}</Text>
//                 </View>

//                 <TouchableOpacity
//                   style={styles.actionButton}
//                   onPress={() => {
//                     setShowItemActions(false);
//                     setShowMoveModal(true);
//                   }}
//                 >
//                   <Ionicons name="folder-outline" size={20} color="#007AFF" />
//                   <Text style={styles.actionButtonText}>Move to Folder</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={styles.actionButton}
//                   onPress={() => {
//                     setShowItemActions(false);
//                     selectedItem && handleShareWalletItem(selectedItem);
//                   }}
//                 >
//                   <Ionicons name="share-outline" size={20} color="#007AFF" />
//                   <Text style={styles.actionButtonText}>Share</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={styles.actionButton}
//                   onPress={() => {
//                     setShowItemActions(false);
//                     Alert.alert(
//                       'Delete Bookmark',
//                       'Are you sure you want to remove this bookmark from your wallet?',
//                       [
//                         { text: 'Cancel' },
//                         {
//                           text: 'Delete',
//                           style: 'destructive',
//                           onPress: () => selectedItem && deleteBookmark(selectedItem)
//                         }
//                       ]
//                     );
//                   }}
//                 >
//                   <Ionicons name="trash-outline" size={20} color="#FF3B30" />
//                   <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[styles.actionButton, styles.cancelButton]}
//                   onPress={() => setShowItemActions(false)}
//                 >
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>
//               </>
//             )}
//           </View>
//         </View>
//       </Modal>

//       {/* Move Item Modal */}
//       <Modal
//         visible={showMoveModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowMoveModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>Move to Folder</Text>
//               <TouchableOpacity onPress={() => setShowMoveModal(false)}>
//                 <Ionicons name="close" size={24} color="#000" />
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity
//               style={styles.moveOption}
//               onPress={() => selectedItem && moveBookmark(selectedItem, null)}
//             >
//               <Ionicons name="bookmark-outline" size={20} color="#666" />
//               <Text style={styles.moveOptionText}>No folder (Unsorted)</Text>
//             </TouchableOpacity>

//             {foldersWithItems.map(folder => (
//               <TouchableOpacity
//                 key={folder.id}
//                 style={styles.moveOption}
//                 onPress={() => selectedItem && moveBookmark(selectedItem, folder.id)}
//               >
//                 <View style={[styles.smallFolderIcon, { backgroundColor: folder.color || '#007AFF' }]}>
//                   <Ionicons name={(folder.icon || 'folder') as any} size={16} color="#fff" />
//                 </View>
//                 <Text style={styles.moveOptionText}>{folder.name}</Text>
//                 <Text style={styles.moveOptionCount}>
//                   {folder.items.length} items
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 32,
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//     marginTop: 16,
//     marginBottom: 8,
//   },
//   emptyDescription: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   listContent: {
//     padding: 16,
//     paddingBottom: 100,
//   },
//   folderContainer: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   folderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//   },
//   folderInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   folderIconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   folderDetails: {
//     flex: 1,
//   },
//   folderHeaderName: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 2,
//   },
//   folderItemCount: {
//     fontSize: 14,
//     color: '#666',
//   },
//   folderControls: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   folderControlButton: {
//     padding: 8,
//   },
//   folderContent: {
//     borderTopWidth: 1,
//     borderTopColor: '#f0f0f0',
//   },
//   folderItemsContainer: {
//     padding: 16,
//   },
//   emptyFolder: {
//     alignItems: 'center',
//     padding: 32,
//   },
//   emptyFolderText: {
//     fontSize: 14,
//     color: '#999',
//     marginTop: 8,
//   },
//   unfolderSection: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   unfolderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   unfolderTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#666',
//   },
//   walletItem: {
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     marginBottom: 16,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   pageImageContainer: {
//     position: 'relative',
//     width: '100%',
//     height: 160,
//     backgroundColor: '#f8f9fa',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logoBackground: {
//     backgroundColor: '#000',
//   },
//   pageImage: {
//     width: '100%',
//     height: '100%',
//   },
//   logoImage: {
//     width: 50,
//     height: 50,
//   },
//   favoriteBadge: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     zIndex: 1,
//   },
//   itemContent: {
//     padding: 16,
//   },
//   itemHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 8,
//   },
//   itemTitle: {
//     flex: 1,
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//     marginRight: 8,
//   },
//   businessName: {
//     fontSize: 14,
//     color: '#007AFF',
//     marginBottom: 8,
//     fontWeight: '500',
//   },
//   itemDescription: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 12,
//     lineHeight: 20,
//   },
//   itemFooter: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   folderTag: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   folderName: {
//     fontSize: 12,
//     fontWeight: '500',
//   },
//   saveDate: {
//     fontSize: 12,
//     color: '#999',
//     fontWeight: '400',
//   },
//   moreButton: {
//     padding: 8,
//   },
//   fab: {
//     position: 'absolute',
//     bottom: 20,
//     right: 20,
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     backgroundColor: '#000',
//     justifyContent: 'center',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 5,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'flex-end',
//   },
//   modalContent: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     maxHeight: '80%',
//     padding: 20,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: '600',
//   },
//   formContainer: {
//     gap: 16,
//   },
//   formLabel: {
//     fontSize: 16,
//     fontWeight: '500',
//     color: '#333',
//     marginBottom: 4,
//   },
//   formInput: {
//     borderWidth: 1,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//   },
//   colorPicker: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   colorOption: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     borderWidth: 3,
//     borderColor: 'transparent',
//   },
//   selectedColor: {
//     borderColor: '#000',
//   },
//   iconPicker: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   iconOption: {
//     width: 44,
//     height: 44,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: 'transparent',
//   },
//   selectedIcon: {
//     borderColor: '#007AFF',
//     backgroundColor: '#f0f8ff',
//   },
//   saveButton: {
//     backgroundColor: '#007AFF',
//     padding: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   saveButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   actionModalContent: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 20,
//   },
//   itemPreview: {
//     padding: 16,
//     backgroundColor: '#f5f5f5',
//     borderRadius: 8,
//     marginBottom: 16,
//   },
//   itemPreviewTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   itemPreviewBusiness: {
//     fontSize: 14,
//     color: '#007AFF',
//   },
//   actionButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     padding: 16,
//     borderRadius: 8,
//     marginBottom: 8,
//     backgroundColor: '#f8f8f8',
//   },
//   actionButtonText: {
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   cancelButton: {
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#ddd',
//     marginTop: 8,
//   },
//   cancelButtonText: {
//     fontSize: 16,
//     color: '#666',
//     textAlign: 'center',
//   },
//   moveOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   moveOptionText: {
//     fontSize: 16,
//     flex: 1,
//   },
//   moveOptionCount: {
//     fontSize: 14,
//     color: '#666',
//   },
//   smallFolderIcon: {
//     width: 24,
//     height: 24,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// }); 