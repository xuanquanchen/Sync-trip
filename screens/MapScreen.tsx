import * as Location from 'expo-location';
import Constants from 'expo-constants';
import React, { useEffect, useState, useRef } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline, LongPressEvent, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ActivityIndicator, Button, Card, Modal, Portal, Text, TextInput, IconButton } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker'
import { Destination, DestinationInfo, LatLng, RouteResponse } from "../types/Destination";
import { useTrip } from "../context/TripContext";
import { useTabs } from "../navigation/useAppNavigation";
import { useUser } from "../context/UserContext";
import { deleteDestinationInTrip } from '../utils/tripAPI'; // or wherever your timestamp => Date converter is
import { convertTimestampToDate } from '../utils/dateUtils';
import { getInfoFromPlaceId, getPlaceFromCoordinates, getRoute, decodePolyline, getAddressFromCoordinates, getCoordinatesFromAddress } from '../utils/map';

import {useAppNavigation} from '../navigation/useAppNavigation';


const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMaps?.apiKey2;

const MapScreen = () => {
  const { currentTrip, addDestinationToTrip, updateDestinationInTrip } = useTrip();
  const { currentUser, getCurrentUserId } = useUser();
  const { tabIndex, setTabIndex } = useTabs();

  // User location & map region
  const [location, setLocation] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState<Region | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // States for adding/editing markers
  const [modalVisible, setModalVisible] = useState(false);       // For adding a new marker
  const [editModalVisible, setEditModalVisible] = useState(false); // For editing an existing marker
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [fetchedPlaceDetails, setFetchedPlaceDetails] = useState<DestinationInfo | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false); // Viewing marker details
  const [currMarker, setCurrMarker] = useState<Destination | null>(null);

  // State for (re)setting marker details
  const [description, setDescription] = useState('');
  const [markerName, setMarkerName] = useState('');
  // We'll store date/time in these states for a marker
  const [markerDate, setMarkerDate] = useState<Date | null>(null);
  const [markerTime, setMarkerTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [markerDatePickerVisible, setMarkerDatePickerVisible] = useState(false);
  const [markerTimePickerVisible, setMarkerTimePickerVisible] = useState(false);

  // If user has no current trip
  const [dialogVisible, setDialogVisible] = useState(true);

  // For places search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // We'll store the trip's start/end date in local states
  const [tripStartDate, setTripStartDate] = useState<Date | null>(null);
  const [tripEndDate, setTripEndDate] = useState<Date | null>(null);

  // 2) Travel mode: DRIVE, WALK, BICYCLE, or TRANSIT
  type TravelMode = 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT'
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE')
  // 3) Departure time as ISO string (you can hook this up to a DatePicker)
  // 4) Decoded route coordinates for your Polyline
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([])

  const mapRef = useRef<MapView | null>(null)
  const [routePlanningMode, setRoutePlanningMode] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteResponse | null>(null)
  const [originId, setOriginId] = useState<string | null>(null)
  const [destinationId, setDestinationId] = useState<string | null>(null)
  const [departureTime, setDepartureTime] = useState<Date | null>(null)
  const [showDeparturePicker, setShowDeparturePicker] = useState(false)
  const [departureDateTime, setDepartureDateTime] = useState<Date | null>(null)

  const navigation = useAppNavigation();

  // 1) redirect away if no user
  useEffect(() => {
    if (!currentUser) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [currentUser, navigation]);



  // Convert trip's start/end to Date objects
  useEffect(() => {
    if (currentTrip) {
      // parse start/end as Dates
      const startDateObj = currentTrip.startDate instanceof Date
        ? currentTrip.startDate
        : convertTimestampToDate(currentTrip.startDate);

      const endDateObj = currentTrip.endDate instanceof Date
        ? currentTrip.endDate
        : convertTimestampToDate(currentTrip.endDate);

      setTripStartDate(startDateObj);
      setTripEndDate(endDateObj);
    }
  }, [currentTrip]);

  // =======================
  // Request location permission and set initial region
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        setLoading(false);
        return;
      }
      const userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation.coords);
      setMapRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // If user is on the 'Map' tab but no current trip is found, show a dialog
    if (!currentTrip && tabIndex === 3) {
      setDialogVisible(true);
    }
  }, [currentTrip, tabIndex]);

  useEffect(() => {
    if (routeCoords.length && mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true
      })
    }
  }, [routeCoords])

  if (!currentUser) {
    // render a null page to avoid error.
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  // Navigate user to the 'New Trip' tab if they have no current trip
  const redirectToNewTrip = () => {
    setTabIndex(2);
    setDialogVisible(false);
  };

  const handlePlanRoute = async () => {
    if (!originId || !destinationId || !currentTrip) return
    const originMarker = currentTrip.destinations.find(m => m.id === originId)
    const destMarker = currentTrip.destinations.find(m => m.id === destinationId)
    if (!originMarker || !destMarker) return

    const origin: LatLng = {
      latitude: Number(originMarker.latitude),
      longitude: Number(originMarker.longitude),
    }
    const destination: LatLng = {
      latitude: Number(destMarker.latitude),
      longitude: Number(destMarker.longitude),
    }

    const depDate = new Date(convertTimestampToDate(originMarker.date))          // e.g. "2025-04-21"
    //console.log('depDate', depDate, originMarker.date)
    if (departureTime) {
      depDate.setHours(
        departureTime.getHours(),
        departureTime.getMinutes(),
        0, 0
      )
    }
    setDepartureDateTime(depDate)

    // 4) pass that full timestamp to the API
    const departureSeconds = Math.floor(depDate.getTime() / 1000)
    //console.log('departureSeconds', departureSeconds)
    const resp = await getRoute(origin, destination, travelMode, departureSeconds)

    setRouteInfo(resp)
    setRouteCoords(decodePolyline(resp.encodedPolyline))
    setOriginId(null)
    setDestinationId(null)
    setRoutePlanningMode(false)
    console.log('route info', resp)
  }

  // Called when user long-presses on the map to add a new marker
  const handleMapLongPress = async (event: LongPressEvent) => {
    if (!currentTrip) {
      Alert.alert(
        "No Trip Found",
        "Please create a trip first.",
        [
          { text: "Create Now", onPress: redirectToNewTrip },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const response = await getPlaceFromCoordinates(latitude, longitude);
    if (response != null) {
      // Instead of directly opening the add marker modal, store the fetched details
      setFetchedPlaceDetails(response);

      // Prepare a marker object
      setCurrMarker({
        latitude: response.latitude,
        longitude: response.longitude,
        place_id: response.place_id,
        address: response.address,
        name: '',
        description: '',
        createdByUid: getCurrentUserId()
      });
    }
    setDescription('');
    setMarkerName('');
    setMarkerDate(null);
    setMarkerTime(null);
    setModalVisible(true);
  };

  // Save a NEW marker (destination) to the trip
  const saveNewMarker = async () => {
    if (!currMarker || !markerName) {
      Alert.alert('Incomplete', 'Please provide a markerName before saving.');
      return;
    }
    // If we want date/time for new markers as well:
    let finalDate: Date | null = null;
    if (markerDate) {
      finalDate = new Date(markerDate.getTime());
      if (markerTime) {
        finalDate.setHours(markerTime.hours, markerTime.minutes, 0, 0);
      }
    }

    // Attach tripId
    if (currentTrip) {
      currMarker.tripId = currentTrip.id;
    }
    const newDestination: Destination = {
      ...currMarker,
      name: markerName,
      description: description,
      date: finalDate || null, // store the combined date/time
    };

    try {
      await addDestinationToTrip(newDestination);
      setModalVisible(false);
      setDescription('');
      setMarkerName('');
    } catch (error) {
      console.error("Error adding destination:", error);
      Alert.alert("Error", "Failed to add destination. Please try again.");
    }
  };

  const handleMarkDestination = () => {
    // Reset any marker-related inputs
    setMarkerName('');
    setDescription('');
    setMarkerDate(null);
    setMarkerTime(null);
    let marker = null;
    if (fetchedPlaceDetails) {
      marker = {
        latitude: fetchedPlaceDetails.latitude,
        longitude: fetchedPlaceDetails.longitude,
        place_id: fetchedPlaceDetails.place_id,
        address: fetchedPlaceDetails.address,
        description: '',
        createdByUid: getCurrentUserId()
      }
      setFetchedPlaceDetails(null);
    }
    setCurrMarker(marker);

    // Close the bottom sheet and open the marker creation modal
    setBottomSheetVisible(false);
    setModalVisible(true);
  };

  const showDetailedInfo = async () => {
    if (currMarker != null) {
      const details = await getInfoFromPlaceId(currMarker.place_id);
      console.log("Place details:", details);
      setFetchedPlaceDetails(details)
      setModalVisible(false);
      setBottomSheetVisible(true);
    }
  };

  // Helper to get today's (or next day’s) opening hours text
  const getOpeningHoursForToday = (weekdayText: string[], open_now: boolean) => {
    // JavaScript getDay() returns 0 for Sunday, 1 for Monday, … 6 for Saturday.
    // Assuming weekdayText[0] corresponds to Monday, convert:
    const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    // If the place is open now, show today's hours; otherwise, show the next day's hours.
    const indexToShow = open_now ? todayIndex : (todayIndex + 1) % 7;
    return weekdayText[indexToShow] || "No hours available";
  };

  // Helper to render rating as stars (full, half, and empty)
  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const stars = [];
    for (let i = 0; i < fullStars; i++) {
      stars.push(<MaterialCommunityIcons key={`full-${i}`} name="star" size={20} color="#4CAF50" />);
    }
    if (halfStar) {
      stars.push(<MaterialCommunityIcons key="half" name="star-half" size={20} color="#4CAF50" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<MaterialCommunityIcons key={`empty-${i}`} name="star-outline" size={20} color="#4CAF50" />);
    }
    return <View style={{ flexDirection: 'row' }}>{stars}</View>;
  };

  // Called when user taps an existing marker
  const handleMarkerPress = (marker: Destination) => {
    setCurrMarker(marker);
    setInfoModalVisible(true);
  };

  // Switch from info modal to edit modal
  const showEditUI = () => {
    if (!currMarker) return;
    setEditModalVisible(true);
    setInfoModalVisible(false);

    // Pre-fill description
    setMarkerName(currMarker.name || '');
    setDescription(currMarker.description || '');

    // Pre-fill date/time if it exists
    if (currMarker.date) {
      const d = new Date(currMarker.date);
      setMarkerDate(d);
      setMarkerTime({ hours: d.getHours(), minutes: d.getMinutes() });
    } else {
      setMarkerDate(null);
      setMarkerTime(null);
    }
  };

  // =======================
  // Update an existing marker (destination)
  const updateMarker = async () => {
    if (!currentTrip) {
      Alert.alert("Error", "Current trip not found");
      return;
    }
    if (!currMarker || !description.trim() || !markerName.trim()) {
      Alert.alert('Incomplete', 'Please fill in all fields before saving.');
      return;
    }

    // Combine date/time
    let finalDate: Date | null = null;
    if (markerDate) {
      finalDate = new Date(markerDate.getTime());
      if (markerTime) {
        finalDate.setHours(markerTime.hours, markerTime.minutes, 0, 0);
      }
    }

    // If marker has an ID, we can call updateDestinationInTrip
    const markerId = (currMarker as any).id;
    if (!markerId) {
      Alert.alert("Error", "Destination ID not found.");
      return;
    }

    try {
      await updateDestinationInTrip(markerId, {
        name: markerName,
        description: description,
        date: finalDate || null,
      });
    } catch (error) {
      console.error("Error updating destination:", error);
      Alert.alert("Error", "Failed to update destination.");
      return;
    }

    setEditModalVisible(false);
    setDescription('');
  };

  const handleDeleteDestination = async () => {
    const markerId = (currMarker as any).id;
    if (!markerId) {
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
            await deleteDestinationInTrip(currentTrip.id, markerId);
            setInfoModalVisible(false)
          },
        },
      ]
    );
  };

  // --- Google Places Search (Autocomplete) ---
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.status === 'OK') {
        setSearchResults(data.predictions);
      } else {
        console.error("Place autocomplete error:", data.status);
      }
    } catch (error) {
      console.error("Error searching places:", error);
    }
  };

  const handleSelectPlace = async (placeId: string) => {
    try {
      const response = await getInfoFromPlaceId(placeId);
      if (response != null) { }
      setMapRegion({
        latitude: response.latitude,
        longitude: response.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setFetchedPlaceDetails(response);
      setBottomSheetVisible(true);
      setSearchResults([]);
      setSearchQuery('');
    }
    catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  // Time & Date pickers for markers
  const onConfirmMarkerTime = ({ hours, minutes }: { hours: number; minutes: number }) => {
    setMarkerTime({ hours, minutes });
    setMarkerTimePickerVisible(false);
  };

  return (
    <View style={styles.container}>

      <View style={styles.searchContainer}>
        {!routePlanningMode ? (
          <>
            <TextInput
              testID="searchPlaces"
              label="Search Places"
              value={searchQuery}
              onChangeText={handleSearch}
              mode="outlined"
              style={styles.searchInput}
            />
            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={item => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleSelectPlace(item.place_id)}
                    style={styles.searchResultItem}
                  >
                    <Text>{item.description}</Text>
                  </TouchableOpacity>
                )}
                style={styles.searchResultsList}
              />
            )}
          </>
        ) : (
          <View style={styles.routePlanningContainer}>
            <View style={styles.modeSelector}>
              {(['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'] as const).map((mode) => {
                const icons = { DRIVE: 'car', WALK: 'walk', BICYCLE: 'bike', TRANSIT: 'bus' }
                const selected = travelMode === mode
                return (
                  <View
                    key={mode}
                    style={[
                      styles.modeButton,
                      selected && styles.modeButtonSelected
                    ]}
                  >
                    <IconButton
                      testID={`mode-${mode}`}
                      icon={icons[mode]}
                      color={selected ? '#fff' : '#666'}
                      size={20}
                      onPress={() => setTravelMode(mode)}
                    />
                  </View>
                )
              })}
            </View>
            <Picker
              testID="routeOriginPicker"
              selectedValue={originId}
              onValueChange={value => setOriginId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select start" value={currMarker.id} />
              {currentTrip.destinations.map(m => (
                <Picker.Item
                  key={m.id}
                  label={m.address}
                  value={m.id}
                />
              ))}
            </Picker>

            <Picker
              testID="routeDestinationPicker"
              selectedValue={destinationId}
              onValueChange={value => setDestinationId(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select destination" value={null} />
              {currentTrip.destinations.map(m => (
                <Picker.Item
                  key={m.id}
                  label={m.address}
                  value={m.id}
                />
              ))}
            </Picker>

            <View style={styles.buttonRow}>
              <IconButton
                testID="confirmRoute"
                icon="directions"
                size={24}
                onPress={handlePlanRoute}
              />
              <IconButton
                testID="selectDepartureTime"
                icon="clock-outline"
                onPress={() => setShowDeparturePicker(true)}
              />
              <IconButton
                testID="cancelRoute"
                icon="close"
                size={24}
                onPress={() => {
                  setRoutePlanningMode(false)
                  setTravelMode('DRIVE')
                }
                }
              />
            </View>
          </View>
        )}
      </View>


      <MapView
        ref={mapRef}
        testID="map"
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton
        onLongPress={handleMapLongPress}
        region={mapRegion}
      >
        {/* Existing destination markers */}
        {(currentTrip?.destinations || []).map((marker, index) => {
          const lat = Number(marker.latitude)
          const lng = Number(marker.longitude)
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Skipping marker at index ${index} - invalid coords:`, marker)
            return null
          }
          const isCreatedByCurrentUser = marker.createdByUid === getCurrentUserId()
          const pinColor = isCreatedByCurrentUser ? 'red' : 'green'
          return (
            <Marker
              key={index}
              coordinate={{ latitude: lat, longitude: lng }}
              description={`${marker.description}\nDate: ${marker.date}`}
              pinColor={pinColor}
              onPress={() => handleMarkerPress(marker)}
            />
          )
        })}


        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#3366FF"
            geodesic={true}
          />
        )}
      </MapView>
      <TimePickerModal
        visible={showDeparturePicker}
        onDismiss={() => setShowDeparturePicker(false)}
        onConfirm={({ hours, minutes }) => {
          const now = new Date()
          now.setHours(hours, minutes, 0, 0)
          setDepartureTime(now)
          setShowDeparturePicker(false)
        }}
        hours={departureTime?.getHours() ?? 8}
        minutes={departureTime?.getMinutes() ?? 0}
      />
      {routeInfo && (
        <Card style={styles.routeCard}>
          <Card.Title
            title="Route Details"
            right={props => (
              <IconButton
                {...props}
                testID="closeRouteInfo"
                icon="close"
                onPress={() => setRouteInfo(null)}
              />
            )}
          />
          <Card.Content>
            {/* Travel Mode */}
            <View style={styles.row}>
              <IconButton
                icon={
                  travelMode === 'DRIVE' ? 'car' :
                    travelMode === 'WALK' ? 'walk' :
                      travelMode === 'BICYCLE' ? 'bike' :
                        'bus'
                }
                size={20}
              />
              <Text>{travelMode}</Text>
            </View>

            {/* Distance */}
            <Text>
              Distance:{' '}
              {(routeInfo.distanceMeters / 1000).toFixed(1)} km
            </Text>

            {/* Duration */}
            {(() => {
              const secs = routeInfo.duration
              const h = Math.floor(secs / 3600)
              const m = Math.floor((secs % 3600) / 60)
              return (
                <Text>
                  Duration:{' '}
                  {h > 0 && `${h} hour `}
                  {m} mins
                </Text>
              )
            })()}

            <Text>
              Start Time:{' '}
              {departureTime
                ? departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>

            {/* Arrival Time */}
            <Text>
              Arrival Time:{' '}
              {departureTime && routeInfo
                ? new Date(departureTime.getTime() + routeInfo.duration * 1000)
                  .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>

            {/* Warnings or Tips */}
            {routeInfo.routeLabels?.length > 0 && routeInfo.routeLabels[0] != 'DEFAULT_ROUTE' ? (
              <Text style={styles.warning}>
                Warnings: {routeInfo.routeLabels.join(', ')}
              </Text>
            ) : (
              <Text style={styles.tips}>
                Tips: No tolls or highways on this route—everything should go smoothly!
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      )}

      <Portal>
        {/* Modal for adding a new marker */}
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.card}>
            <Card.Title title="Add a New Marker" right={props => (
              <IconButton
                {...props}
                testID="closeInfo"
                icon="close"
                onPress={() => setModalVisible(false)}
              />
            )}
            />
            <Card.Content>
              <Text style={styles.addressText}>{currMarker?.address}</Text>
              <TextInput
                testID="markerName"
                label="Name"
                value={markerName}
                mode="outlined"
                onChangeText={setMarkerName}
                style={styles.input}
              />
              <TextInput
                testID="description"
                label="Description"
                value={description}
                mode="outlined"
                onChangeText={setDescription}
                style={styles.input}
              />

              {/* Optionally pick date/time for a new marker */}
              <Button testID="selectDate" onPress={() => setMarkerDatePickerVisible(true)}>
                {markerDate
                  ? `Date: ${markerDate.toDateString()}`
                  : "Select Date"
                }
              </Button>
              <DatePickerModal
                locale="en"
                mode="single"
                visible={markerDatePickerVisible}
                onDismiss={() => setMarkerDatePickerVisible(false)}
                previous='Previous'
                next={'Next', testID = "nextMonth"}
                date={markerDate || tripStartDate}
                onConfirm={({ date }) => {
                  setMarkerDate(date);
                  setMarkerDatePickerVisible(false);
                }}
                // restrict selection to trip range if you want:
                validRange={{
                  startDate: tripStartDate || undefined,
                  endDate: tripEndDate || undefined,
                }}
              />

              <Button testID="selectTime" onPress={() => setMarkerTimePickerVisible(true)}>
                {markerTime
                  ? `Time: ${markerTime.hours}:${String(markerTime.minutes).padStart(2, '0')}`
                  : "Select Time"
                }
              </Button>
              <TimePickerModal
                testID="timePicker1"
                visible={markerTimePickerVisible}
                onDismiss={() => setMarkerTimePickerVisible(false)}
                onConfirm={onConfirmMarkerTime}
                hours={markerTime?.hours || 12}
                minutes={markerTime?.minutes || 0}
              />
            </Card.Content>
            <Card.Actions>
              <IconButton testID="confirmDestination" icon="check" mode="contained" onPress={saveNewMarker}
              />
              <IconButton
                testID="showInfo" mode="contained" icon="information" onPress={showDetailedInfo}
              />

            </Card.Actions>
          </Card>
        </Modal>

        {/* Modal for editing a marker */}
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.card}>
            <Card.Title
              title="Edit Destination"
              right={props => (
                <IconButton
                  {...props}
                  testID="closeInfo"
                  icon="close"
                  onPress={() => setModalVisible(false)}
                />
              )}
            />
            <Card.Content>
              <Text style={styles.addressText}>{currMarker?.address}</Text>
              <TextInput
                testID="editMarkerName"
                label="Name"
                value={markerName}
                mode="outlined"
                onChangeText={setMarkerName}
                style={styles.input}
              />
              <TextInput
                testID="editDescription"
                label="Description"
                value={description}
                mode="outlined"
                onChangeText={setDescription}
                style={styles.input}
              />

              {/* Date/time pickers for editing */}
              <Button testID="editDate" onPress={() => setMarkerDatePickerVisible(true)}>
                {markerDate
                  ? `Date: ${markerDate.toDateString()}`
                  : "Select Date"
                }
              </Button>
              <DatePickerModal
                locale="en"
                mode="single"
                visible={markerDatePickerVisible}
                onDismiss={() => setMarkerDatePickerVisible(false)}
                date={markerDate || tripStartDate}
                onConfirm={({ date }) => {
                  setMarkerDate(date);
                  setMarkerDatePickerVisible(false);
                }}
                validRange={{
                  startDate: tripStartDate || undefined,
                  endDate: tripEndDate || undefined,
                }}
              />

              <Button testID="editTime" onPress={() => setMarkerTimePickerVisible(true)}>
                {markerTime
                  ? `Time: ${markerTime.hours}:${String(markerTime.minutes).padStart(2, '0')}`
                  : "Select Time"
                }
              </Button>
              <TimePickerModal
                testID="timePicker2"
                visible={markerTimePickerVisible}
                onDismiss={() => setMarkerTimePickerVisible(false)}
                onConfirm={onConfirmMarkerTime}
                hours={markerTime?.hours || 12}
                minutes={markerTime?.minutes || 0}
              />
            </Card.Content>
            <Card.Actions>
              <IconButton
                icon="check" testID="saveChanges" mode="contained" onPress={updateMarker}
              />

            </Card.Actions>
          </Card>
        </Modal>

        {/* Modal for marker details (existing marker) */}
        <Modal
          visible={infoModalVisible}
          onDismiss={() => setInfoModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.card}>
            <Card.Title title="Marker Details"
              right={props => (
                <IconButton
                  {...props}
                  testID="closeInfo"
                  icon="close"
                  onPress={() => setInfoModalVisible(false)}
                />
              )}
            />
            <Card.Content>
              <Text style={styles.addressText}>{currMarker?.address}</Text>
              <Text>Name: {currMarker?.name}</Text>
              <Text>Description: {currMarker?.description}</Text>
              {/* If marker has a date, show it */}
              {currMarker?.date && (
                <Text>Date: {new Date(currMarker.date).toLocaleString()}</Text>
              )}
            </Card.Content>
            <Card.Actions>
              <IconButton
                testID="showInfo" mode="contained" icon="information" onPress={showDetailedInfo}
              />
              <IconButton
                testID="editMarker" icon="pencil" onPress={showEditUI}
              />
              <IconButton
                testID="trash"
                icon="trash-can"
                onPress={() => handleDeleteDestination()}
              />
            </Card.Actions>
          </Card>
        </Modal>

        <Modal
          visible={bottomSheetVisible}
          onDismiss={() => setBottomSheetVisible(false)}
          contentContainerStyle={[styles.modalContainer, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}
        >
          <Card style={styles.card}>
            <Card.Title
              title={fetchedPlaceDetails?.name || "Place Details"}
              right={props => (
                <View style={{ flexDirection: 'row' }}>
                  <IconButton
                    {...props}
                    mode="contained-tonal"
                    testID="markPlace"
                    icon="plus"
                    onPress={handleMarkDestination}
                  />
                  <IconButton
                    {...props}
                    testID="closeBottomSheet"
                    mode="contained-tonal"
                    icon="close"
                    onPress={() => setBottomSheetVisible(false)}
                  />
                </View>
              )}
            />
            <Card.Content>
              <Text style={styles.addressText}>{fetchedPlaceDetails?.address}</Text>
              <Text style={styles.infoText}>Phone: {fetchedPlaceDetails?.phone || "N/A"}</Text>
              <Text style={styles.infoText}>Website: {fetchedPlaceDetails?.website || "N/A"}</Text>
              {fetchedPlaceDetails?.openingHours && (
                <View style={styles.openingHoursContainer}>
                  {fetchedPlaceDetails.openingHours.open_now ? (
                    <Text style={[styles.openStatus, { color: 'green' }]}>Open Now</Text>
                  ) : (
                    <Text style={[styles.openStatus, { color: 'red' }]}>Closed Now</Text>
                  )}
                  <Text style={styles.infoText}>
                    {getOpeningHoursForToday(fetchedPlaceDetails.openingHours.weekday_text, fetchedPlaceDetails.openingHours.open_now)}
                  </Text>
                </View>
              )}
              <View style={styles.ratingContainer}>
                {renderStars(fetchedPlaceDetails?.rating)}
                <Text style={styles.ratingText}>
                  {fetchedPlaceDetails?.rating ? fetchedPlaceDetails.rating.toFixed(1) : "No Rating"}
                </Text>
              </View>
            </Card.Content>
            <Card.Actions style={{ flexDirection: 'row' }}>
              <IconButton
                testID="openRoutePlanning"
                icon="car"
                onPress={() => {
                  setBottomSheetVisible(false)
                  setInfoModalVisible(false)
                  setRoutePlanningMode(true)
                }}
              />
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warning: {
    color: 'red',
    marginTop: 6,
  },
  tips: {
    color: '#444',
    marginTop: 6,
  },
  picker: {
    marginVertical: 4,
    backgroundColor: '#f5f5f5',
  },
  textInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '90%',
    padding: 10,
  },
  addressText: {
    fontSize: 14,
    marginBottom: 10,
    color: 'gray',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 5,
  },
  openingHoursContainer: {
    marginVertical: 5,
  },
  openStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
  },
  input: {
    marginBottom: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  // Search bar styles
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 60,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 5,
    padding: 5,
  },
  searchInput: {
    backgroundColor: 'white',
  },
  searchResultsList: {
    backgroundColor: 'white',
    maxHeight: 200,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  routePlanningContainer: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 8,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  modeButton: {
    borderRadius: 24,
    padding: 4,
  },
  modeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  routeCard: {
    position: 'absolute',
    top: '40%',          // middle of screen
    left: 20,
    right: 20,
    elevation: 4,
  },
});
