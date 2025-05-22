import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const ArchivedHistoryScreen = () => {
  return (
    <View testID="archivedHistoryScreen" style={styles.container}>
      <Text style={styles.title}>Archived Trips</Text>
      <Text style={styles.placeholderText}>
        This is your archived trips placeholder. You can show archived trips, archived itineraries,
        and expense summaries here.
      </Text>
    </View>
  );
};

export default ArchivedHistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
});
