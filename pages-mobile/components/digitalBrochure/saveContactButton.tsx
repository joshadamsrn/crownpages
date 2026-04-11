// import * as Contacts from "expo-contacts";
// import { Alert, Linking, TouchableOpacity, Text, StyleSheet } from "react-native";

// interface SaveContactButtonProps {
//   name: string;
//   phone?: string;
//   email?: string;
//   address?: string;
// }

// const SaveContactButton = ({
//   name,
//   phone,
//   email,
//   address,
// }: SaveContactButtonProps) => {
//   const saveContact = async () => {
//     const { status } = await Contacts.requestPermissionsAsync();

//     if (status !== "granted") {
//       Alert.alert("Permission Denied", "Cannot access contacts.");
//       return;
//     }

//     const contacts: Contacts.Contact = {
//       firstName: name.split(" ")[0],
//       lastName:
//         name.split(" ").length > 1 ? name.split(" ").slice(1).join(" ") : "",
//       name: name,
//       contactType: Contacts.ContactTypes.Person,
//       [Contacts.Fields.PhoneNumbers]: phone
//         ? [{ label: "mobile", number: phone }]
//         : [],
//       [Contacts.Fields.Emails]: email ? [{ label: "work", email }] : [],
//       [Contacts.Fields.Addresses]: address
//         ? [{ label: "work", street: address }]
//         : [],
//     };

//     try {
//       const contactId = await Contacts.addContactAsync(contacts);
//       if (contactId) {
//         Alert.alert("Saved", `${name} added to your contacts`);
//       }

//       // Open the contacts app to view the contact
//       Linking.openURL("content://contacts/people/").catch((error) =>
//         Alert.alert("❌ Error", "Could not open the Contacts app.")
//       );
//     } catch (error) {
//       console.error("Error saving contact:", error);
//       Alert.alert("❌ Error", "Could not save contact.");
//     }
//   };

//   return (
//     <TouchableOpacity style={styles.button} onPress={saveContact}>
//       <Text style={styles.text}>Save to Contact</Text>
//     </TouchableOpacity>
//   );
// };

// const styles = StyleSheet.create({
//   button: {
//     backgroundColor: "#4E7AF8",
//     padding: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     marginTop: 16,
//   },
//   text: {
//     color: "#fff",
//     fontWeight: "600",
//   },
// });

// export default SaveContactButton;

import * as Contacts from "expo-contacts";
import { Alert, Linking } from "react-native";

export const saveContact = async (
  name: string,
  phone?: string,
  email?: string,
  address?: string
) => {
  const { status } = await Contacts.requestPermissionsAsync();

  if (status !== "granted") {
    Alert.alert("Permission Denied", "Cannot access contacts.");
    return;
  }

  const contacts: Contacts.Contact = {
    firstName: name.split(" ")[0],
    lastName:
      name.split(" ").length > 1 ? name.split(" ").slice(1).join(" ") : "",
    name: name,
    contactType: Contacts.ContactTypes.Person,
    [Contacts.Fields.PhoneNumbers]: phone
      ? [{ label: "mobile", number: phone }]
      : [],
    [Contacts.Fields.Emails]: email ? [{ label: "work", email }] : [],
    [Contacts.Fields.Addresses]: address
      ? [{ label: "work", street: address }]
      : [],
  };

  try {
    const contactId = await Contacts.addContactAsync(contacts);
    if (contactId) {
      Alert.alert("Saved", `${name} added to your contacts`);

      // Deep linking disabled - contact saved successfully
      console.log("Contact saved successfully");
    }
  } catch (error) {
    console.error("Error saving contact:", error);
    Alert.alert("❌ Error", "Could not save contact.");
  }
};