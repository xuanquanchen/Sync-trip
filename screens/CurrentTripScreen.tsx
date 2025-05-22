// file: screens/CurrentTripScreen.tsx
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import {
  Button,
  Card,
  Dialog,
  IconButton,
  List,
  Portal,
  Text,
  Title,
  TextInput,
  SegmentedButtons,
  Checkbox,
  useTheme
} from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useTrip } from "../context/TripContext";
import { useTabs } from "../navigation/useAppNavigation";
import { Destination } from "../types/Destination";
import {
  deleteDestinationInTrip,
  deleteTrip,
  updateDestination
} from "../utils/tripAPI";
import { removeTripFromAllUsers } from "../utils/userAPI";
import { convertTimestampToDate } from '../utils/dateUtils';
import { TripStatus } from "../types/Trip";
import { generateICS } from "../utils/icsGenerator";

const CurrentTripScreen = () => {
  const {
    currentTrip,
    setCurrentTrip,
    updateTrip,
    checklists,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
  } = useTrip();
  const { setTabIndex } = useTabs();
  const { colors } = useTheme();

  // Trip and destination states
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(currentTrip?.title);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [tripStatus, setTripStatus] = useState(currentTrip?.status || "");
  const [pickerVisible, setPickerVisible] = useState(false);

  const [destinationDialogVisible, setDestinationDialogVisible] = useState(false);
  const [editingDestinationId, setEditingDestinationId] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [destinationDescription, setDestinationDescription] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationDate, setDestinationDate] = useState<Date | null>(null);
  const [destPickerVisible, setDestPickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [destinationTime, setDestinationTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Checklist editing states
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState<string>("");

  // Help modal state for ICS instructions
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  useEffect(() => {
    if (currentTrip && currentTrip.status === TripStatus.ARCHIVED) {
      setCurrentTrip(null);
      setTabIndex(0);
      return;
    }
    if (currentTrip) {
      let needUpdate = false;
      const startDateConverted =
        currentTrip.startDate instanceof Date
          ? currentTrip.startDate
          : convertTimestampToDate(currentTrip.startDate);
      const endDateConverted =
        currentTrip.endDate instanceof Date
          ? currentTrip.endDate
          : convertTimestampToDate(currentTrip.endDate);
      if (!(currentTrip.startDate instanceof Date)) needUpdate = true;
      if (!(currentTrip.endDate instanceof Date)) needUpdate = true;
      const destinationsConverted = currentTrip.destinations.map((dest: any) => {
        if (dest.date && !(dest.date instanceof Date)) {
          needUpdate = true;
          return { ...dest, date: convertTimestampToDate(dest.date) };
        }
        return dest;
      });
      if (needUpdate) {
        setCurrentTrip({
          ...currentTrip,
          startDate: startDateConverted,
          endDate: endDateConverted,
          destinations: destinationsConverted,
        });
      }
      setStartDate(startDateConverted);
      setEndDate(endDateConverted);
    }
  }, [currentTrip]);


  // Helper to generate ALL dates between startDate and endDate
  const generateDateRange = (start: Date, end: Date) => {
    const dates: string[] = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toDateString()); // we use Date object not modify
      current = new Date(current);
      current.setDate(current.getDate() + 1); // move to next day
    }
    return dates;
  };

  const allTripDates = startDate && endDate ? generateDateRange(startDate, endDate) : [];

  useEffect(() => {
    if (allTripDates.length > 0 && !selectedDate) {
      setSelectedDate(allTripDates[0]); // default to first day
    }
  }, [allTripDates, selectedDate]);

  if (!currentTrip) {
    return (
      <View style={styles.emptyContainer}>
        <Title>No Current Trip</Title>
        <Text>You haven't planned a trip yet.</Text>
        <Text>Start planning now by:</Text>
        <Text>1. Creating a new plan</Text>
        <Text>2. Subscribing to an existing plan!</Text>
        <Button mode="contained" onPress={() => setTabIndex(2)} style={styles.emptyButton}>
          Create New Trip
        </Button>
      </View>
    );
  }

  const handleBeginEditCurrentTrip = () => {
    setTitle(currentTrip.title);
    setStartDate(
      currentTrip.startDate instanceof Date
        ? currentTrip.startDate
        : convertTimestampToDate(currentTrip.startDate)
    );
    setEndDate(
      currentTrip.endDate instanceof Date
        ? currentTrip.endDate
        : convertTimestampToDate(currentTrip.endDate)
    );
    setTripStatus(currentTrip.status);
    setEditMode(true);
  };

  const handleSaveTrip = async () => {
    if (!title || !startDate || !endDate || !tripStatus) {
      Alert.alert("Please enter a title and select dates.");
      return;
    }
    const status = tripStatus as TripStatus;
    try {
      await updateTrip({ title, startDate, endDate, status });
      setEditMode(false);
    } catch (error) {
      console.error("Error updating trip:", error);
      Alert.alert("Error", "Failed to update trip.");
    }
  };

  const handleDeleteTrip = async () => {
    if (!currentTrip.id) {
      Alert.alert("Error", "Trip is missing an ID.");
      return;
    }
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this entire trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrip(currentTrip.id);
              await removeTripFromAllUsers(currentTrip.id);
              setCurrentTrip(null);
              setTabIndex(0);
            } catch (err) {
              console.error("Error deleting trip:", err);
              Alert.alert("Error", "Failed to delete trip.");
            }
          },
        },
      ]
    );
  };

  const handleArchiveTrip = async () => {
    if (!currentTrip.id) {
      Alert.alert("Error", "Trip is missing an ID.");
      return;
    }
    Alert.alert(
      "Archive Trip",
      "Are you sure you want to archive this trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: async () => {
            try {
              await updateTrip({
                title: currentTrip.title,
                startDate: currentTrip.startDate,
                endDate: currentTrip.endDate,
                status: TripStatus.ARCHIVED,
              });
              setCurrentTrip(null);
              setTabIndex(0);
            } catch (err) {
              console.error("Error archiving trip:", err);
              Alert.alert("Error", "Failed to archive trip.");
            }
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const openDestinationDialogForEdit = (destination: Destination) => {
    setEditingDestinationId(destination.id || null);
    setDestinationName(destination.name || ""); // Use 'name' for the event title
    setDestinationDescription(destination.description || "");
    setDestinationAddress(destination.address || "");
    if (destination.date) {
      const d = new Date(destination.date);
      setDestinationDate(d);
      setDestinationTime({ hours: d.getHours(), minutes: d.getMinutes() });
    } else {
      setDestinationDate(null);
      setDestinationTime(null);
    }
    setDestinationDialogVisible(true);
  };

  const handleSaveDestination = async () => {
    if (!editingDestinationId) {
      Alert.alert("Error", "No destination is being edited.");
      return;
    }
    if (!destinationName) {
      Alert.alert("Please provide a name for the destination.");
      return;
    }
    if (!destinationDate) {
      Alert.alert("Please select a date for the destination.");
      return;
    }
    let finalDate = new Date(destinationDate.getTime());
    if (destinationTime) {
      finalDate.setHours(destinationTime.hours, destinationTime.minutes, 0, 0);
    }
    const updatedData: Partial<Destination> = {
      name: destinationName, // New event title field
      description: destinationDescription,
      address: destinationAddress,
      date: finalDate,
    };
    try {
      await updateDestination(currentTrip.id!, editingDestinationId, updatedData);
      setDestinationDialogVisible(false);
    } catch (error) {
      console.error("Error saving destination:", error);
      Alert.alert("Error", "Failed to save destination.");
    }
  };

  const handleDeleteDestination = async (destination: Destination) => {
    if (!destination.id) {
      Alert.alert("Error", "Destination missing ID.");
      return;
    }
    Alert.alert(
      "Delete Destination",
      "Are you sure you want to delete this destination?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!currentTrip.id) throw new Error("currentTrip missing ID");
            await deleteDestinationInTrip(currentTrip.id, destination.id);
          },
        },
      ]
    );
  };

  const onConfirmTime = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setDestinationTime({ hours, minutes });
    setTimePickerVisible(false);
  };

  const formatDate = (input: Date | { toDate(): Date } | string) => {
    const d: Date = input instanceof Date
      ? input
      : typeof input === 'string'
        ? new Date(input)
        : input.toDate();

    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');  // month is 0-based
    const dd   = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;  // e.g. "2025-04-28"
  };



  // ICS Export: Generate ICS file locally and share it.
  const handleExportICS = async () => {
    if (!currentTrip || !currentTrip.id) {
      Alert.alert("No current trip found.");
      return;
    }
    try {
      const icsContent = await generateICS(currentTrip);
      const fileUri = FileSystem.documentDirectory + `trip_${currentTrip.id}.ics`;
      await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Sharing not available", "This device does not support sharing files.");
      }
    } catch (err) {
      console.error("Error generating ICS file:", err);
      Alert.alert("Error", "Failed to generate ICS file.");
    }
  };

  return (
    <>
      <ScrollView style={styles.scrollContainer}>
        {editMode ? (
          <View style={styles.form}>
            <TextInput
              label="Trip Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={{ marginBottom: 10 }}
            />
            <Button testID="changeDates" mode="outlined" onPress={() => setPickerVisible(true)}>
              {startDate && endDate
                ? `${startDate.toDateString()} - ${endDate.toDateString()}`
                : "Select Dates"}
            </Button>
            <SegmentedButtons
              value={tripStatus}
              onValueChange={setTripStatus}
              style={{ marginTop: 10 }}
              buttons={[
                { value: TripStatus.PLANNING, label: "plan" },
                { value: TripStatus.ONGOING, label: "ongoing" },
                { value: TripStatus.COMPLETED, label: "complete" },
              ]}
            />
            <DatePickerModal
              locale="en"
              mode="range"
              visible={pickerVisible}
              onDismiss={() => setPickerVisible(false)}
              startDate={startDate || undefined}
              endDate={endDate || undefined}
              onConfirm={({ startDate: newStartDate, endDate: newEndDate }) => {
                setStartDate(newStartDate);
                setEndDate(newEndDate);
                setPickerVisible(false);
              }}
            />
          </View>
        ) : (
          <Card style={styles.card}>
            <Card.Content style={{ alignItems: "center" }}>
                <Title style={styles.sectionTitle}>
                  {currentTrip.title}
                </Title>
              <Text>
                <Text style={styles.bold}>From: </Text>
                  {new Date(currentTrip.startDate).toLocaleDateString()}
                {"  "}
                <Text style={styles.bold}>To: </Text>
                {new Date(currentTrip.endDate).toLocaleDateString()}
              </Text>
            </Card.Content>
          </Card>
        )}
        {editMode ? (
          <>
            <Button testID="saveTripChanges" mode="contained" onPress={handleSaveTrip} style={styles.saveButton}>
              Save Changes
            </Button>
            <Button
              mode="text"
              onPress={handleCancelEdit}
              style={styles.cancelButton}
              textColor="#e53935"
            >
              Cancel
            </Button>
          </>

        ) : (
          <View style={styles.buttonRow}>
            <Button
              testID="editTrip"
              icon="pencil"
              mode="text"
              onPress={handleBeginEditCurrentTrip}
              style={styles.iconTextButton}
            >
              Edit
            </Button>
            <Button
              testID="archiveTrip"
              icon="archive"
              mode="text"
              compact
              onPress={handleArchiveTrip}
              style={styles.iconTextButton}
            >
              Archive
            </Button>
            <Button
              testID="deleteTrip"
              icon="delete"
              mode="text"
              compact
              textColor="#e53935"
              onPress={handleDeleteTrip}
              style={styles.iconTextButton}
            >
              Delete
            </Button>
            </View>
        )}
        {/* ICS Export Row */}
        {currentTrip.destinations.length > 0 && (
          <View style={styles.exportRow}>
            <Button
              testID="exportICS"
              mode="contained"
              onPress={handleExportICS}
              style={styles.exportButton}
            >
              Sync Your Trip to Calendar
            </Button>
            <Button
              testID="helpButton"
              mode="contained"
              onPress={() => setHelpModalVisible(true)}
              style={styles.helpButton}
            >
              ?
            </Button>
          </View>
        )}

        {/* --- Destinations Section --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Itinerary</Text>
        </View>
        {currentTrip.destinations.length === 0 ? (
          <Text style={styles.emptyText}>
            No Destinations Added Yet. {"\n"}
            You Can Use Map to Add New Destinations.
          </Text>
        ) : (
            <>
              {/* Tabs for each date */}
              <View style={{ marginHorizontal: 10, marginBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row' }}>
                    {allTripDates.map(date => {
                      const dateObj = new Date(date);
                      const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase(); // "APR"
                      const day = String(dateObj.getDate()).padStart(2, '0'); // "08"
                      const isSelected = selectedDate === formatDate(date);

                      return (
                        <TouchableOpacity
                          key={date}
                          onPress={() => setSelectedDate(formatDate(date))}
                          style={{
                            backgroundColor: isSelected ? colors.primary : '#f0f0f0',
                            borderRadius: 6,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            marginRight: 8,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: isSelected ? 'white' : 'black', fontSize: 14, fontWeight: 'bold' }}>
                            {month}
                          </Text>
                          <Text style={{ color: isSelected ? 'white' : 'black', fontSize: 16, fontWeight: 'bold' }}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Show destinations for selected date */}
              {currentTrip.destinations
                .filter(dest => dest.date && formatDate(dest.date) === selectedDate)
                .sort((a, b) => (a.date! > b.date! ? 1 : -1)) // sort by time within the day
                .map((destination) => (
                  <View key={destination.id} style={styles.destinationCard}>
                    <List.Item
                      title={destination.name}
                      titleStyle={styles.cardTitle}
                      right={props => (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -25, marginTop: -75 }}>
                          <IconButton
                            {...props}
                            testID="pencil"
                            icon="pencil"
                            size={18}
                            onPress={() => openDestinationDialogForEdit(destination)}
                          />
                          <IconButton
                            {...props}
                            testID="trash"
                            icon="trash-can"
                            size={18}
                            onPress={() => handleDeleteDestination(destination)}
                          />
                        </View>
                      )}
                      description={() => (
                        <Text>
                          {destination.description ? destination.description + "\n" : ""}
                          {destination.address ? destination.address + "\n" : ""}
                          {destination.date
                            ? new Date(destination.date).toLocaleString()
                            : "No date/time"}
                        </Text>
                      )}
                    />
                    <View style={styles.buttonContainer}>
                      <Button
                        testID="addChecklist"
                        icon="plus"
                        onPress={() => addChecklistItem(destination.id, "")}
                        style={styles.addChecklistButton}
                      >
                        TODOs
                      </Button>
                    </View>

                    {/* Checklist rendering (your original logic) */}
                    <View style={styles.checklistContainer}>
                      {checklists[destination.id] &&
                        checklists[destination.id].map((item) => (
                          <View key={item.id} style={styles.checklistItemRow}>
                            <Checkbox
                              testID="checkbox"
                              status={item.completed ? "checked" : "unchecked"}
                              onPress={() =>
                                updateChecklistItem(destination.id, item.id, { completed: !item.completed })
                              }
                            />
                            {editingChecklistItemId === item.id ? (
                              <>
                                <TextInput
                                  testID="checklistInput"
                                  style={styles.checklistInput}
                                  value={editingChecklistText}
                                  onChangeText={setEditingChecklistText}
                                />
                                <IconButton
                                  testID="confirmChecklistItem"
                                  icon="check"
                                  size={16}
                                  style={styles.editButton}
                                  iconColor={colors.primary}
                                  onPress={() => {
                                    updateChecklistItem(destination.id, item.id, { text: editingChecklistText });
                                    setEditingChecklistItemId(null);
                                  }}
                                />
                                <IconButton
                                  testID="cancelChecklistItem"
                                  icon="close"
                                  size={16}
                                  style={styles.deleteButton}
                                  iconColor={styles.deleteButtonText.color}
                                  onPress={() => {
                                    setEditingChecklistItemId(null);
                                    setEditingChecklistText("");
                                  }}
                                />
                              </>
                            ) : (
                              <>
                                <Text
                                  style={[styles.checklistText, item.completed && styles.completedText]}
                                  onLongPress={() => {
                                    setEditingChecklistItemId(item.id);
                                    setEditingChecklistText(item.text);
                                  }}
                                >
                                  {item.text || "Your To-Do Item"}
                                </Text>
                                <IconButton
                                  testID="editChecklistItem"
                                  icon="pencil"
                                  size={16}
                                  onPress={() => {
                                    setEditingChecklistItemId(item.id);
                                    setEditingChecklistText(item.text);
                                  }}
                                />
                                <IconButton
                                  testID="deleteChecklistItem"
                                  icon="trash-can"
                                  size={16}
                                  style={styles.deleteButton}
                                  onPress={() => deleteChecklistItem(destination.id, item.id)}
                                />
                              </>
                            )}
                          </View>
                        ))}
                    </View>
                  </View>
                ))}

              {/* 👇 If no destinations for selected date */}
              {currentTrip.destinations.filter(dest => dest.date && formatDate(dest.date) === selectedDate).length === 0 && (
                <Text style={styles.emptyText}>No Destinations for this day yet.</Text>
              )}
            </>
        )}

      </ScrollView>

      {/* Help Modal for ICS instructions */}
      <Portal>
        <Dialog visible={helpModalVisible} onDismiss={() => setHelpModalVisible(false)}>
          <Dialog.Title>How to Use the ICS File</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 8 }}>
              After exporting, you can share the ICS file with your calendar application.
            </Text>
            <Text style={{ marginBottom: 8 }}>
              For Google Calendar on desktop: Open Google Calendar, click the gear icon, select "Settings" → "Import & export", and then import the downloaded ICS file.
            </Text>
            <Text style={{ marginBottom: 8 }}>
              For Apple Calendar: Open Calendar, choose "File" → "New Calendar Subscription", and paste the link or import the file.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setHelpModalVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Destination Dialog */}
      <Portal>
        <Dialog
          visible={destinationDialogVisible}
          onDismiss={() => setDestinationDialogVisible(false)}
        >
          <Dialog.Title>Edit Destination</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Event / Destination Name"
              value={destinationName}
              onChangeText={setDestinationName}
              mode="outlined"
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="Event / Destination Description"
              value={destinationDescription}
              onChangeText={setDestinationDescription}
              mode="outlined"
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="Address (optional)"
              value={destinationAddress}
              onChangeText={setDestinationAddress}
              mode="outlined"
              style={{ marginBottom: 8 }}
            />
            <Button onPress={() => setDestPickerVisible(true)}>
              {destinationDate
                ? `Date: ${destinationDate.toDateString()}`
                : "Select Date"}
            </Button>
            <DatePickerModal
              locale="en"
              mode="single"
              visible={destPickerVisible}
              onDismiss={() => setDestPickerVisible(false)}
              date={destinationDate || undefined}
              onConfirm={({ date }) => {
                setDestinationDate(date);
                setDestPickerVisible(false);
              }}
              validRange={{
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              }}
            />
            <Button onPress={() => setTimePickerVisible(true)} style={{ marginTop: 8 }}>
              {destinationTime
                ? `Time: ${destinationTime.hours}:${String(destinationTime.minutes).padStart(2, "0")}`
                : "Select Time"}
            </Button>
            <TimePickerModal
              visible={timePickerVisible}
              onDismiss={() => setTimePickerVisible(false)}
              onConfirm={onConfirmTime}
              hours={destinationTime?.hours ?? 12}
              minutes={destinationTime?.minutes ?? 0}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDestinationDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveDestination}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: "#fff"
  },
  card: {
    margin: 10,
  },
  cardTitle: {
    fontSize: 18,         // Bigger
    fontWeight: 'bold',   // Bold
  },
  form: {
    backgroundColor: "white",
    padding: 9,
    borderRadius: 10,
    elevation: 3
  },
  bold: {
    fontWeight: "bold"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold"
  },
  sectionHeader: {
    marginHorizontal: 15,
    marginVertical: 16
  },
  destinationCard: {
    backgroundColor: "white",
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 15,
    borderRadius: 8,
    elevation: 3
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  emptyButton: {
    marginTop: 16
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    margin: 10,
  },
  iconTextButton: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 6,
  },
  checklistContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10
  },
  checklistItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5
  },
  checklistText: {
    flex: 1,
    fontSize: 13,
  },
  checklistInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 4,
    borderRadius: 4
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#999"
  },
  editButton: {
    marginLeft: 5,
    padding: 4
  },
  deleteButton: {
    marginLeft: 5,
    padding: 4,
  },
  deleteButtonText: {
    color: "red"
  },
  addChecklistButton: {
    marginTop: 10
  },
  exportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 15,
    marginRight: 15,
  },
  exportButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 6
  },
  helpButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#BEBEBE"
  },
  emptyText: {
    marginTop: 10,
    textAlign: 'center',
    color: 'gray',
    fontStyle: 'italic',
  },
  saveButton: {
    margin: 15,
  },
  cancelButton: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderColor: '#e53935',
    borderWidth: 1,
  },
});

export default CurrentTripScreen;
