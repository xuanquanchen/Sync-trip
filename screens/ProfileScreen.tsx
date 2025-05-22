import {auth, getUserDocRef, app, firestore} from "../utils/firebase";
import {deleteDoc, doc, onSnapshot, serverTimestamp, setDoc} from '@react-native-firebase/firestore';
import React, {useEffect, useState} from 'react';
import {FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity, View, ImageBackground, Platform} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import {Avatar, Button, Dialog, Divider, Menu, Paragraph, Portal, Snackbar, Text, TextInput,} from 'react-native-paper';

import {useAppNavigation} from '../navigation/useAppNavigation';

import {useUser} from "../context/UserContext";
import {useTrip} from "../context/TripContext";


import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from '@react-native-firebase/storage';
import {launchImageLibrary} from 'react-native-image-picker';
import { ensureGalleryPermission } from '../utils/permissions';
import * as FileSystem from 'expo-file-system';

const ProfileScreen = () => {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [travelPreferences, setTravelPreferences] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [backgroundPicture, setBackgroundPicture] = useState<string | null>(null); // bg picture's link

  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  // Use the hook to get navigation if needed:
  const navigation = useAppNavigation();

  const {logout: userLogout} = useUser();
  const {logout: tripLogout} = useTrip();
  const [paypalEmail, setPaypalEmail] = useState('');

  const storage = getStorage(app);

  const [savedProfile, setSavedProfile] = useState({
    name: '',
    bio: '',
    travelPreferences: '',
    profilePicture: null,
    paypalEmail: '',
    backgroundPicture: null,
  } as {
    name: string;
    bio: string;
    travelPreferences: string;
    profilePicture: string | null;
    paypalEmail: string;
    backgroundPicture: string | null;
  });

  const availableImages = [
    {id: '1', src: require('../assets/profile_pic.png')},
    {id: '2', src: require('../assets/another_image.png')},
  ];

  // travel preference options
  const travelPreferenceOptions = [
    'N/A',
    'Leisurely',
    'Gastronomic',
    'Family-Friendly',
    'Eco-Friendly',
    'Luxury',
    'Budget-Conscious',
  ];


  useEffect(() => {
    if (!auth.currentUser) return;

    const userDocRef = getUserDocRef();

    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists) {
          const data = docSnap.data();
          setName(data?.name || '');
          setBio(data?.bio || '');
          setTravelPreferences(data?.travelPreferences || '');
          setProfilePicture(data?.profilePicture || null);
          setBackgroundPicture(data?.backgroundPicture || null);
          setPaypalEmail(data?.paypalEmail || '');

          setSavedProfile({
            name: data?.name || '',
            bio: data?.bio || '',
            travelPreferences: data?.travelPreferences || '',
            profilePicture: data?.profilePicture || null,
            paypalEmail: data?.paypalEmail || '',
            backgroundPicture: data?.backgroundPicture || null,
          });

          if (data?.name) {
            setIsEditing(false);
          }
        }
      },
      (err) => {
        setError('Error fetching profile data');
        console.error(err);
        setSnackbarVisible(true);
      }
    );

    return () => unsubscribe();
  }, []);

  const pickAndUploadBgPhoto = async () => {
    console.log("invoked");
    try {
      // Make sure we have access
      const ok = await ensureGalleryPermission();
      if (!ok) {
        setError('Gallery permission is required to choose a photo.');
        console.error("permission not enough");
        setSnackbarVisible(true);
        return;
      }

      // Let the user pick
      const res = await launchImageLibrary({ mediaType: 'photo' });
      if (res.didCancel || !res.assets?.length) return;

      const { uri } = res.assets[0];
      console.log('Picked URI:', uri);

      // fetch the local file into a Blob
      const base64 = await FileSystem.readAsStringAsync(uri as string, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Base64 length:', base64.length);


      // Upload to Firebase Storage
      const uid = auth.currentUser!.uid;
      const ref = storage.ref(`backgroundPictures/${uid}.jpg`);
      setError("uploading image");
      const snapshot = await ref.putString(base64, 'base64', {
        contentType: 'image/jpeg',
      });

      console.log('Upload complete:', snapshot.metadata.fullPath);

      const downloadURL = await ref.getDownloadURL();
      console.log('Download URL:', downloadURL);

      // write into Firestore
      await firestore.collection('users').doc(uid).set(
        { backgroundPicture: downloadURL },
        { merge: true }
      );
      console.log('Firestore write complete');

      // update UI
      setBackgroundPicture(downloadURL);
      setError('background photo updated!');
      setSnackbarVisible(true);
      setIsEditing(false);
    } catch (e: any) {
      console.error('Error picking/uploading photo', e);
      setError('Could not upload photo: ' + e.message);
      setSnackbarVisible(true);
    }
  }


  const pickAndUploadProfilePhoto = async () => {
    try {
      // Make sure we have access
      const ok = await ensureGalleryPermission();
      if (!ok) {
        setError('Gallery permission is required to choose a photo.');
        setSnackbarVisible(true);
        return;
      }

      // Let the user pick
      const res = await launchImageLibrary({ mediaType: 'photo' });
      if (res.didCancel || !res.assets?.length) return;

      const { uri } = res.assets[0];
      console.log('Picked URI:', uri);

      // fetch the local file into a Blob
      const base64 = await FileSystem.readAsStringAsync(uri as string, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Base64 length:', base64.length);


      // Upload to Firebase Storage
      const uid = auth.currentUser!.uid;
      const ref = storage.ref(`profilePictures/${uid}.jpg`);
      setError("uploading avatar");
      const snapshot = await ref.putString(base64, 'base64', {
        contentType: 'image/jpeg',
      });
      console.log('Upload complete:', snapshot.metadata.fullPath);

      const downloadURL = await ref.getDownloadURL();
      console.log('Download URL:', downloadURL);

      // 5️⃣ write into Firestore
      await firestore.collection('users').doc(uid).set(
        { profilePicture: downloadURL },
        { merge: true }
      );
      console.log('Firestore write complete');

      // update UI
      setProfilePicture(downloadURL);
      setError('Profile photo updated!');
      setSnackbarVisible(true);
      setIsEditing(false);
    } catch (e: any) {
      console.error('Error picking/uploading photo', e);
      setError('Could not upload photo: ' + e.message);
      setSnackbarVisible(true);
    }
  };

  // save profile
  const handleSaveProfile = async () => {
    if (name.trim() === '') {
      setError('Name is required');
      setSnackbarVisible(true);
      return;
    }

    if (paypalEmail.trim() !== '' &&
      !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(paypalEmail)) {
      setError('Please enter a valid PayPal email');
      setSnackbarVisible(true);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Auth User doesn't exist");
        return;
      }
      const userDocRef = getUserDocRef();
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        name,
        bio,
        travelPreferences,
        profilePicture,
        paypalEmail: paypalEmail.trim() || null,
        updatedAt: serverTimestamp()
      }, {merge: true});

      setSavedProfile({name, bio, travelPreferences, profilePicture, paypalEmail, backgroundPicture});
      setError('Profile saved successfully!');
      setSnackbarVisible(true);
      setIsEditing(false);
    } catch (err) {
      setError('Error saving profile: ' + (err as Error).message);
      setSnackbarVisible(true);
    }
  };

  // cancel editing
  const handleCancelEdit = () => {
    setName(savedProfile.name);
    setBio(savedProfile.bio);
    setTravelPreferences(savedProfile.travelPreferences);
    setProfilePicture(savedProfile.profilePicture);
    setBackgroundPicture(savedProfile.backgroundPicture);
    setIsEditing(false);
    setPaypalEmail(savedProfile.paypalEmail);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      userLogout();
      tripLogout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Login' },   // ← the screen you want to land on
          ],
        })
      );
    } catch (err) {
      setError('Error logging out');
      console.log(err);
      setSnackbarVisible(true);
    }
  };

  // account deletion action
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError('No user logged in');
      setSnackbarVisible(true);
      return;
    }
    try {
      setDeleteDialogVisible(false);
      // delete stored date in firebase
      const userDocRef = getUserDocRef();
      await deleteDoc(userDocRef);
      // delete account
      await user.delete();
      // navigate to home once deletion successful
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Login' },   // ← the screen you want to land on
          ],
        })
      );
    } catch (err) {
      setError('Error deleting account: ' + (err as Error).message);
      setSnackbarVisible(true);
    }
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <ScrollView testID="profileScreen" contentContainerStyle={styles.outerContainer}>
      <View style={styles.root}>
        <ImageBackground
          source={
            backgroundPicture
              ? { uri: backgroundPicture }
              : require('../assets/default_bg.jpg')
          }
          style={styles.topBackground}
          resizeMode="cover"
        >
          {isEditing && (
            <TouchableOpacity
              style={styles.changeBgBtn}
              onPress={pickAndUploadBgPhoto}
            >
              <Text style={styles.changeBgText}>Change Cover</Text>
            </TouchableOpacity>
          )}

        </ImageBackground>
        {/* content layer */}
        <View style={styles.container} pointerEvents="box-none">

          {/* avatar container */}
          <View
            style={styles.avatarContainer}>
            <TouchableOpacity onPress={isEditing ? pickAndUploadProfilePhoto : undefined}>
              <Avatar.Image
                size={100}
                source={
                  profilePicture
                    ? { uri: profilePicture }
                    : require('../assets/profile_pic.png')
                }
              />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <>
              <TextInput testID="name" label="Name" value={name} onChangeText={setName}
                         style={styles.input}/>
              <TextInput
                testID="bio"
                label="Bio"
                value={bio}
                onChangeText={setBio}
                style={styles.input}
                multiline
              />

              <TextInput
                testID="paypalEmail"
                label="PayPal Email (optional)"
                value={paypalEmail}
                onChangeText={setPaypalEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Travel Preferences drop down */}
              <View style={{width: '100%'}}>
                <Menu
                  visible={menuVisible}
                  onDismiss={closeMenu}
                  anchor={
                    <TouchableOpacity onPress={openMenu}>
                      <TextInput
                        testID="travelPreferences"
                        label="Travel Preferences"
                        value={travelPreferences}
                        style={styles.input}
                        editable={false}
                        pointerEvents="none"
                      />
                    </TouchableOpacity>
                  }>
                  {travelPreferenceOptions.map((option) => (
                    <Menu.Item
                      key={option}
                      onPress={() => {
                        setTravelPreferences(option);
                        closeMenu();
                      }}
                      title={option}
                    />
                  ))}
                </Menu>
              </View>
              <Button
                testID="save_profile"
                mode="contained"
                onPress={handleSaveProfile}
                style={[styles.button, {marginTop: '4%'}]}>
                Save Profile
              </Button>
              <Button mode="outlined" onPress={handleCancelEdit} style={styles.button}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoTitle}>Name:</Text>
                <Text style={styles.infoContent}>{name}</Text>
              </View>
              <Divider style={styles.divider}/>
              <View style={styles.infoRow}>
                <Text style={styles.infoTitle}>Bio:</Text>
                <Text style={styles.infoContent}>{bio}</Text>
              </View>
              <Divider style={styles.divider}/>
              <View style={styles.infoRow}>
                <Text style={styles.infoTitle}>PayPal Email:</Text>
                <Text style={styles.infoContent}>
                  {paypalEmail || '—'}
                </Text>
              </View>
              <Divider style={styles.divider}/>
              <View style={styles.infoRow}>
                <Text style={styles.infoTitle}>Travel Preferences:</Text>
                <Text style={styles.infoContent}>{travelPreferences}</Text>
              </View>
              <Divider style={styles.divider}/>
              <Button
                testID="profile_edit"
                mode="contained"
                onPress={() => setIsEditing(true)}
                style={[styles.button, {marginTop: '20%'}]}>
                Edit
              </Button>
            </>
          )}
          <Button testID="logout" mode="outlined" onPress={handleLogout} style={styles.button}>
            Log Out
          </Button>
          {/* delete account button */}
          <Button
            mode="contained"
            buttonColor="#D32F2F" // dark red button
            onPress={() => setDeleteDialogVisible(true)}
            style={styles.button}>
            Delete Account
          </Button>
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}>
            {error}
          </Snackbar>
          {/* Modal select avatar */}
          <Modal
            animationType="slide"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalView}>
              <FlatList
                data={availableImages}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    onPress={() => {
                      setProfilePicture(item.src);
                      setModalVisible(false);
                    }}>
                    <Avatar.Image size={100} source={item.src} style={styles.modalImage}/>
                  </TouchableOpacity>
                )}
                numColumns={3}
              />
              <Button onPress={() => setModalVisible(false)}>Cancel</Button>
            </View>
          </Modal>

          {/* Acc deletion dialog */}
          <Portal>
            <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
              <Dialog.Title style={styles.dialogTitle}>
                <Avatar.Icon icon="alert" size={24} style={styles.warningIcon}/> Confirm Account
                Deletion
              </Dialog.Title>
              <Dialog.Content>
                <Paragraph>
                  Are you sure you want to delete your account? This action cannot be undone.
                </Paragraph>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
                <Button onPress={handleDeleteAccount}>Confirm</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    height: 215
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
    alignItems: 'center',
    marginTop: 100,
  },
  outerContainer: {
    padding: 0,
  },
  avatarContainer: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  infoTitle: {
    width: 200,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
    fontSize: 18,
  },
  input: {
    width: '100%',
    marginBottom: 5,
    marginTop: 5,
  },
  button: {
    marginTop: 10,
    width: '100%',
  },
  label: {
    fontSize: 18,
    marginVertical: 5,
  },
  modalView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  modalImage: {
    margin: 10,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 5,
  },
  dialogTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 8,
  },
  changeBgBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  changeBgText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
