import React, { useEffect, useState } from "react";
import { ScrollView, FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  IconButton,
  Card,
  Dialog,
  Paragraph,
  Portal,
  SegmentedButtons,
  Text,
  Title,
  TextInput,
} from "react-native-paper";
import Markdown from 'react-native-markdown-display';
import annouceStyles from "../styles/announce";
import { useAppNavigation } from "../navigation/useAppNavigation";
import { useUser } from "../context/UserContext";
import { useTrip } from "../context/TripContext";
import { addCollaboratorByEmail, setCurrentTripId, getUserById } from "../utils/userAPI";
import { TripStatus } from "../types/Trip";
import { doc, onSnapshot, updateDoc } from "@react-native-firebase/firestore";
import { firestore } from "../utils/firebase";
import { useTabs } from "../navigation/useAppNavigation";
import { convertTimestampToDate } from '../utils/dateUtils';

const DashboardScreen = () => {
  const { currentUser, getCurrentUserId } = useUser();
  const [trips, setTrips] = useState<any[]>([]);
  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [tripIdForInvite, setTripIdForInvite] = useState<string | null>(null);
  const [selectedSegment, setSelectedSegment] = useState("Active");
  const { setTabIndex } = useTabs();
  const { currentTrip, announcements } = useTrip();
  const { uidToNameMap, setUidToNameMap } = useUser();

  const navigation = useAppNavigation();

  // get all the collaborators
  useEffect(() => {
    // collect every ownerId + collaboratorId from all trips
    const allIds = trips.flatMap(t => [t.ownerId, ...(t.collaborators || [])]);
    const uniqueIds = Array.from(new Set(allIds));
    // only fetch the ones we haven’t resolved yet
    const toFetch = uniqueIds.filter(id => !uidToNameMap[id]);
    if (!toFetch.length) return;

    (async () => {
      const users = await Promise.all(toFetch.map(uid => getUserById(uid)));
      const newEntries = users.reduce((acc, u, i) => {
        acc[toFetch[i]] = u.name || "Unknown";
        return acc;
      }, {} as Record<string, string>);
      setUidToNameMap(m => ({ ...m, ...newEntries }));
    })();
  }, [trips]);

  useEffect(() => {
    if (!currentUser || !currentUser.tripsIdList) return;

    // Array to hold unsubscribe functions
    const unsubscribeFuncs: Array<() => void> = [];
    // Object to accumulate trips data by trip ID
    const tripsMap: { [key: string]: any } = {};

    // Listener for each trip
    currentUser.tripsIdList.forEach((tripId: string) => {
      const tripRef = doc(firestore, "trips", tripId);
      const unsubscribe = onSnapshot(tripRef, (docSnap) => {
        if (!docSnap || !docSnap.exists) {
          console.warn(`Trip document with ID ${tripId} does not exist.`);
          // Remove trip from the map if it was deleted
          delete tripsMap[tripId];
          setTrips(Object.values(tripsMap));
          return;
        }
        tripsMap[tripId] = { id: tripId, ...docSnap.data() };
        setTrips(Object.values(tripsMap));
      });
      unsubscribeFuncs.push(unsubscribe);
    });

    // Cleanup all listeners on unmount or when tripsIdList changes
    return () => {
      unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser]);

  // Separate active and archived trips
  const activeTrips = trips.filter((trip) => trip.status !== TripStatus.ARCHIVED);
  const archivedTrips = trips.filter((trip) => trip.status === TripStatus.ARCHIVED);

  const sortCurrentTripFirst = (trips: any[]) => {
    return [...trips].sort((a, b) => {
      const aIsCurrent = a.id === currentUser?.currentTripId;
      const bIsCurrent = b.id === currentUser?.currentTripId;
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      // If neither is the current trip, sort by startDate ascending
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // For active trips, further categorize them by status and place the current trip at the top
  const categorizedTrips = {
    planning: sortCurrentTripFirst(activeTrips.filter((trip) => trip.status === TripStatus.PLANNING)),
    ongoing: sortCurrentTripFirst(activeTrips.filter((trip) => trip.status === TripStatus.ONGOING)),
    completed: sortCurrentTripFirst(activeTrips.filter((trip) => trip.status === TripStatus.COMPLETED)),
  };

  const handleJumpToTrip = (trip: any, index: number) => {
    setCurrentTripId(getCurrentUserId(), trip.id);
    setTabIndex(index);
  };

  // Function to handle setting a trip as the current trip
  const handleSetCurrentTrip = (trip: any) => {
    setCurrentTripId(getCurrentUserId(), trip.id);
  };

  // Open the invite dialog for a specific trip.
  const showInviteDialog = (tripId: string) => {
    setTripIdForInvite(tripId);
    setInviteDialogVisible(true);
  };

  // Close the invite dialog and reset state.
  const hideInviteDialog = () => {
    setInviteDialogVisible(false);
    setInviteEmail("");
    setTripIdForInvite(null);
  };

  // Send an invitation by email for the given trip.
  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) {
      alert("Please enter a valid email");
      return;
    }
    try {
      await addCollaboratorByEmail(tripIdForInvite!, inviteEmail.trim());
      alert(`Invitation sent to ${inviteEmail.trim()}`);
      hideInviteDialog();
    } catch (error: any) {
      //alert(`Error inviting collaborator: ${error.message}`);
    }
  };

  const handleRestoreTrip = async (trip: any) => {
    try {
      const tripRef = doc(firestore, "trips", trip.id);
      await updateDoc(tripRef, { status: TripStatus.PLANNING });
      alert("Trip restored successfully!");
    } catch (error) {
      console.error("Error restoring trip: ", error);
      alert("Error restoring trip");
    }
  };

  // Render each trip as a Card.
  const renderItem = ({ item }: { item: any }) => {
    const isCurrentTrip = item.id === currentUser?.currentTripId;
    const startDate = convertTimestampToDate(item.startDate).toLocaleDateString();
    const endDate = convertTimestampToDate(item.endDate).toLocaleDateString();
    const names = [item.ownerId, ...(item.collaborators || [])]
      .map(uid => uidToNameMap[uid] || "…")
      .join(", ");
    return (
      <Card style={styles.card} elevation={3}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 }}>
          <Text style={styles.cardTitle}>
            {item.title}
          </Text>
          {selectedSegment !== "Archived" && (
            <Button
              mode="text"
              icon="account-multiple-plus"
              onPress={() => showInviteDialog(item.id)}
              compact
            >
              Invite
            </Button>
          )}
        </View>

        <Card.Content>
          <Text>{`Start Date: ${startDate}`}</Text>
          <Text>{`End Date: ${endDate}`}</Text>
          <Text>{isCurrentTrip ? `Members: ${names}` : `Members: ${names.split(",").length}`}</Text>
        </Card.Content>

        <Card.Actions style={styles.cardActions}>
          {selectedSegment !== "Archived" && !isCurrentTrip && (
            <Button mode="contained" icon="eye" onPress={() => handleSetCurrentTrip(item)}>
              View
            </Button>
          )}
          {selectedSegment !== "Archived" && isCurrentTrip && (
            <Button mode="contained" icon="pencil" onPress={() => handleJumpToTrip(item, 1)}>
              Edit
            </Button>
          )}
          {selectedSegment !== "Archived" && isCurrentTrip && (
            <Button mode="contained" icon="wallet" onPress={() => handleJumpToTrip(item, 4)}>
              Bills
            </Button>
          )}
          {selectedSegment === "Archived" && (
            <Button mode="outlined" onPress={() => handleRestoreTrip(item)}>
              Restore
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  // Render a section of trips with a title.
  const renderSection = (title: string, trips: any[]) => {
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {trips.length > 0 ? (
          trips.map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              {renderItem({ item })}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No {title} Trip Here</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView testID="dashboardScreen" style={styles.container}>
      {/* Announcements Section */}
      {selectedSegment === "Active" && <View style={annouceStyles.announcementSection}>
        <View style={annouceStyles.annoucementTitle}>
          <Title style={annouceStyles.announcementHeader}>
            {`Announcement for ${currentTrip?.title || "You"}`}
          </Title>
          <Button
            testID="gotoAnnouceScreen"
            onPress={() => {
              navigation.navigate("Annouce");
            }}
          >
            View All
          </Button>
        </View>

        {announcements.length === 0 ? (
          <Text style={styles.emptyText}>
            This trip does not have any announcement yet.{"\n"}
            Try to create one for your partner!
          </Text>
        ) : (
          <Card style={annouceStyles.announcementCard}>
            <Card.Title
              title={
                <Text style={annouceStyles.announcementAuthor}>
                  {`${uidToNameMap[announcements[0].authorID]} says:`}
                </Text>
              }
            />

            <Card.Content>
              <Markdown>{announcements[0].message}</Markdown>
              <Text style={styles.emptyText}>
                {`Last Updated at ${announcements[0].updatedAt.toLocaleDateString()}`}
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
      }

      {selectedSegment === "Active" ? (
        <>
          {renderSection("Planning", categorizedTrips.planning)}
          {renderSection("Ongoing", categorizedTrips.ongoing)}
          {renderSection("Completed", categorizedTrips.completed)}
        </>
      ) : (
        renderSection("Archived", archivedTrips)
      )}

      <Portal>
        <Dialog visible={inviteDialogVisible} onDismiss={hideInviteDialog}>
          <Dialog.Title>Invite Collaborator</Dialog.Title>
          <Dialog.Content>
            <TextInput
              testID="inviteEmailInput"
              label="Email"
              mode="outlined"
              defaultValue={inviteEmail}
              autoCapitalize="none"
              onChangeText={setInviteEmail}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideInviteDialog}>Cancel</Button>
            <Button testID="confirmInvitation" onPress={handleInviteCollaborator}>
              Invite
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* SegmentedButtons placed at the bottom */}
      <View style={styles.segmentedControlContainer}>
        <SegmentedButtons
          value={selectedSegment}
          onValueChange={setSelectedSegment}
          buttons={[
            { value: "Active", label: "Active" },
            { value: "Archived", label: "Archived" },
          ]}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#f5f5f5" },
  card: { marginBottom: 10 },
  cardActions: { justifyContent: "flex-end" },
  cardTitle: {
    fontSize: 18,         // Bigger
    fontWeight: 'bold',   // Bold
  },
  emptyText: {
    textAlign: "center",
    marginTop: 10,
    color: 'gray',
    fontStyle: 'italic',
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  segmentedControlContainer: {
    marginTop: "auto",
    marginBottom: 10,
  },
});

export default DashboardScreen;
