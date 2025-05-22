import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
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
import { useUser } from "../context/UserContext";
import { useTrip } from "../context/TripContext";
import annouceStyles from "../styles/announce";

const AnnouceScreen = () => {
  const {
    currentTrip,
    setCurrentTrip,
    updateTrip,
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useTrip();

  const { uidToNameMap } = useUser();
    
  // Announcement Dialog states
  const [isEditAnnouncementVisible, setEditAnnouncementVisible] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  // Announcement Section
  const groupedAnnouncements = announcements.reduce((groups, announcement) => {
    const dateStr = announcement.updatedAt.toLocaleDateString();
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(announcement);
    return groups;
  }, {} as { [date: string]: typeof announcements });

  const sortedAnnouncementDates = Object.keys(groupedAnnouncements).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const handleEditAnnouncement = async () => {
    if (!editingAnnouncementId) {
      try {
        await createAnnouncement(announcementText);
        setEditAnnouncementVisible(false);
        setAnnouncementText("");
      } catch (err: any) {
        console.error("Error adding announcement:", err);
      }
    }
    else {
      try {
        await updateAnnouncement(editingAnnouncementId, announcementText);
        setEditAnnouncementVisible(false);
        setAnnouncementText("");
        setEditingAnnouncementId(null);
      } catch (err: any) {
        console.error("Error updating announcement:", err);
      }
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      await deleteAnnouncement(announcementId);
    } catch (err: any) {
      console.error("Error deleting announcement:", err);
    }
  };
  
  return (
    <View testID="AnnouceScreen" style={styles.container}>
      <View style={annouceStyles.announcementSection}>
        <View style={annouceStyles.annoucementTitle}>
          <Title style={annouceStyles.announcementHeader}>Announcements</Title>
          <Button
            testID="addAnnouncement"
            icon="plus"
            onPress={() => {
              setAnnouncementText("");
              setEditingAnnouncementId(null);
              setEditAnnouncementVisible(true);
            }}
          >
            Note
          </Button>
        </View>

        {sortedAnnouncementDates.length === 0 ? (
          <Text style={annouceStyles.emptyText}>
            This trip does not have any announcement yet.{"\n"}
            Try to create one for your partner!
          </Text>
        ) : (
          sortedAnnouncementDates.map((dateStr) => (
            <View key={dateStr}>
              <Text style={annouceStyles.dateHeader}>{dateStr}</Text>
              {groupedAnnouncements[dateStr].map((announcement, index) => (
                <View key={announcement.id}>
                  <Card style={annouceStyles.announcementCard}>
                    <Card.Title
                      title={
                        <Text style={annouceStyles.announcementAuthor}>
                          {
                            `${uidToNameMap[announcement.authorID]} says:`
                          }
                        </Text>
                      }
                    />

                    <Card.Content>
                      <Markdown>{announcement.message}</Markdown>
                      <Text style={annouceStyles.emptyText}>
                        {`Last Updated at ${announcement.updatedAt.toLocaleDateString()}`}
                      </Text>
                    </Card.Content>
                    <Card.Actions>
                      <IconButton
                        testID="editAnnouncement"
                        icon="pencil"
                        size={16}
                        onPress={() => {
                          setEditingAnnouncementId(announcement.id);
                          setAnnouncementText(announcement.message);
                          setEditAnnouncementVisible(true);
                        }}
                      />
                      <IconButton
                        testID="deleteAnnouncement"
                        icon="trash-can"
                        size={16}
                        onPress={() => handleDeleteAnnouncement(announcement.id)}
                      />
                    </Card.Actions>
                  </Card>
                  {index < groupedAnnouncements[dateStr].length - 1 && (
                    <View style={annouceStyles.separator} />
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </View>

      {/* Announcement Dialog */}
      <Portal>
        <Dialog
          visible={isEditAnnouncementVisible}
          onDismiss={() => setEditAnnouncementVisible(false)}
        >
          <Dialog.Title>Your Announcement</Dialog.Title>
          <Dialog.Content>
            <TextInput
              //label="Announcement Message"
              testID="announcementInput"
              value={announcementText}
              onChangeText={setAnnouncementText}
              multiline
            />
          </Dialog.Content>
          <Dialog.Actions>
            <IconButton
              testID="confirmAnnoucement"
              icon="check"
              size={16}
              onPress={() => {
                handleEditAnnouncement()
              }}
            />
            <IconButton
              testID="cancelEditAnnoucement"
              icon="close"
              size={16}
              iconColor="red"
              onPress={() => {
                setEditAnnouncementVisible(false)
              }}
            />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default AnnouceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f5f5f5"
  },
});
