import {auth} from "../utils/firebase";
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ActivityIndicator, Button, Snackbar, Text, TextInput} from 'react-native-paper';

import {useAppNavigation} from '../navigation/useAppNavigation';

const SignUpScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const navigation = useAppNavigation();

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await userCredential.user.sendEmailVerification();
      setError('Signup successful! Please check your email to verify your account.');
      setSnackbarVisible(true);
      navigation.navigate('Login');
    } catch (err) {
      const er = err as Error;
      setError(er.message);
      setSnackbarVisible(true);
    }
    setLoading(false);
  };

  return (
    <View testID="signUpScreen" style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        testID="email"
        label="Email"
        mode="outlined"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        testID="pwd"
        label="Password"
        mode="outlined"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        testID="confirmPwd"
        label="Confirm Password"
        mode="outlined"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator animating size="large"/>
      ) : (
        <Button mode="contained" onPress={handleSignUp} style={styles.button}>
          Sign Up
        </Button>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}>
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
});

export default SignUpScreen;
