// import {auth} from "../utils/firebase";
// @ts-ignore
import {GoogleAuthProvider} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import React, {useEffect, useState} from 'react';
import {Image, ImageStyle, KeyboardAvoidingView, ScrollView, TouchableOpacity, View,} from 'react-native';
import {ActivityIndicator, Button, IconButton, Snackbar, Text, TextInput,} from 'react-native-paper';

import {useMessageDialog} from '../components/MessageDialog';
import {useAppNavigation} from '../navigation/useAppNavigation';
import loginStyles from '../styles/loginStyples';

import {auth, getUserDocRef} from "../utils/firebase";
import { useNotification } from '../context/NotificationContext';
import {serverTimestamp, setDoc} from "@react-native-firebase/firestore";

const LogInScreen = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useAppNavigation();
  const {showMessage} = useMessageDialog();

  const { expoPushToken } = useNotification(); // Get the expo push token from context

  const handleLogIn = async () => {
    setLoading(true);

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await auth.signOut();
        showMessage('Please verify your email before logging in.');
        setSnackbarVisible(true);
        navigation.navigate('Login');
      } else {
        // Update user document with email and expoPushToken
        const userDocRef = getUserDocRef();
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          expoPushToken: expoPushToken,
          updatedAt: serverTimestamp()
        }, {merge: true});

        setMessage('Login successful!');
        setSnackbarVisible(true);
        navigation.navigate('App'); // to dashboard
      }
    } catch (err) {
      showMessage('log in error, check information again');
      console.error('Login Error: ', err);
      setSnackbarVisible(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '902651100900-eira13inc6alf5d9jqs7t4q38v4hutjc.apps.googleusercontent.com', // Web Client ID from Firebase
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      console.log('Checking Play Services...');
      await GoogleSignin.hasPlayServices();

      await GoogleSignin.signOut(); // Ensure fresh account selection

      console.log('Signing in...');
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In response:', userInfo);

      // Extract the idToken from userInfo.data
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('No ID Token received');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      console.log('Authenticating with Firebase...');
      const userCredential = await auth.signInWithCredential(googleCredential);
      const user = userCredential.user;

      // Update user document with email and expoPushToken
      const userDocRef = getUserDocRef();
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        expoPushToken: expoPushToken,
        updatedAt: serverTimestamp()
      }, {merge: true});

      console.log('Google Sign-In Successful!');
      setMessage('Google Sign-In Successful!');
      setSnackbarVisible(true);
      navigation.navigate('App');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      showMessage('Google Sign in Error');
      setSnackbarVisible(true);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showMessage('Please enter your email first');
      setSnackbarVisible(true);
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      showMessage('A password reset email has been sent');
      setSnackbarVisible(true);
    } catch (error: any) {
      showMessage(error.message);
      setSnackbarVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView style={loginStyles.container}>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <Image
          testID="logInBackground"
          source={require('../assets/logInBackground.jpg')}
          style={loginStyles.backgroundImage as ImageStyle}
        />

        <View style={loginStyles.overlay}>
          <Text variant="headlineLarge" style={loginStyles.title}>
            Let's <Text style={loginStyles.highlight}>Get</Text> Started!
          </Text>

          <Text variant="bodyMedium" style={loginStyles.subtitle}>
            Discover the World with Every Sign In
          </Text>

          <TextInput
            testID="account"
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            // style={loginStyles.textInput}
          />

          <TextInput
            testID="password"
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            // style={loginStyles.textInput}
          />

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={loginStyles.forgotPassword}>Forgot password?</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator animating size="large" color="#007A8C"/>
          ) : (
            <Button testID="login" mode="contained" onPress={handleLogIn} style={loginStyles.signInButton}>
              Sign In
            </Button>
          )}

          <View style={loginStyles.dividerContainer}>
            <View style={loginStyles.line}/>
            <Text style={loginStyles.orText}>or sign in with</Text>
            <View style={loginStyles.line}/>
          </View>

          <View style={loginStyles.socialIconsContainer}>
            <TouchableOpacity style={loginStyles.iconWarpper} onPress={handleGoogleSignIn}>
              <IconButton icon="google" size={30}/>
            </TouchableOpacity>
          </View>

          <Text style={loginStyles.noAccount}>I don’t have an account?</Text>
        </View>

        <View>
          <Button
            testID="signUp"
            mode="outlined"
            onPress={() => navigation.navigate('SignUp')}
            style={loginStyles.signUpButton}>
            <Text style={loginStyles.signUpText}>Sign Up</Text>
          </Button>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}>
            {message}
          </Snackbar>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LogInScreen;
