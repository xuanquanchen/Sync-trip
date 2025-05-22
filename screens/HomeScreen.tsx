import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, Text} from 'react-native-paper';

import {useAppNavigation} from '../navigation/useAppNavigation';

const HomeScreen = () => {
  const navigation = useAppNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to the Trip Planner</Text>
      <Button mode="contained" onPress={() => navigation.navigate('SignUp')} style={styles.button}>
        Sign Up
      </Button>

      <Text style={styles.subtitle}>Already have an account?</Text>

      <Button mode="contained" onPress={() => navigation.navigate('Login')} style={styles.button}>
        Log in
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    marginVertical: 10,
  },
});

export default HomeScreen;
