import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {DatePickerModal} from 'react-native-paper-dates';
import {useTrip} from "../context/TripContext";
import {CalendarDate} from "react-native-paper-dates/lib/typescript/Date/Calendar";
import {useMessageDialog} from '../components/MessageDialog';
import {useTabs} from '../navigation/useAppNavigation';
import {auth} from '../utils/firebase';
import {Trip, TripStatus} from '../types/Trip';


const TripCreationScreen = () => {
  const {showMessage} = useMessageDialog();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<CalendarDate>(undefined);
  const [endDate, setEndDate] = useState<CalendarDate>(undefined);
  const [visible, setVisible] = useState(false);

  const {createTrip} = useTrip();
  const {setTabIndex} = useTabs();

  const onDismiss = () => setVisible(false);

  const openDatePicker = () => {
    setVisible(false); // Force reset
    setTimeout(() => setVisible(true), 10); // Small delay ensures state updates
  };

  const onConfirm = (params: { startDate: CalendarDate; endDate: CalendarDate }) => {
    setStartDate(params.startDate);
    setEndDate(params.endDate);
    setVisible(false);
  };

  const handleCreateTrip = async () => {
    if (title && startDate && endDate && auth.currentUser) {
      const newTrip: Trip = {
        title: title,
        startDate: startDate,
        endDate: endDate,
        ownerId: auth.currentUser.uid, // Ensure a user is signed in
        collaborators: [],
        destinations: [],
        status: TripStatus.PLANNING
      };
      try {
        await createTrip(newTrip);
      } catch (err) {
        console.error('Error creating trip');
      }
      setTabIndex(1);
    } else {
      showMessage("Please enter a title and select dates.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          testID="tripTitle"
          label="Trip Title"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
        />

        <Button testID="selectDates" onPress={openDatePicker} mode="outlined" style={styles.input}>
          {startDate && endDate
            ? `${startDate.toDateString()} - ${endDate.toDateString()}`
            : 'Select Dates'}
        </Button>

        {/*<Portal>*/}
        <DatePickerModal
          locale={"en"}
          mode="range"
          visible={visible}
          onDismiss={onDismiss}
          startDate={startDate}
          endDate={endDate}
          onConfirm={onConfirm}
          validRange={{ startDate: new Date(new Date().setDate(new Date().getDate())) }}
        />
        {/*</Portal>*/}

        <Button testID="createTrip" mode="contained" onPress={handleCreateTrip}>
          Create Trip
        </Button>
      </View>
    </View>
  );
};

export default TripCreationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9', // Light background for better contrast
  },
  form: {
    width: '90%',
    maxWidth: 400, // Keep it from getting too wide
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 3, // Adds a shadow effect
  },
  input: {
    marginBottom: 15,
  },
});
