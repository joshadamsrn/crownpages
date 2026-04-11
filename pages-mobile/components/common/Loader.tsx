import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const Loader = () => {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Loader; 