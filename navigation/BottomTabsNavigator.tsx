// src/navigation/BottomTabsNavigator.tsx
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomNavigation} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {TabsProvider, useTabs} from './useAppNavigation';
import CurrentTripScreen from '../screens/CurrentTripScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MapScreen from '../screens/MapScreen'; // New screen for map view
import NewTripScreen from '../screens/NewTripScreen';
import BillScreen from '../screens/BillScreen';
import ProfileScreen from '../screens/ProfileScreen';

const BottomTabsContent = () => {
    const {tabIndex, setTabIndex} = useTabs();

    const routes = [
        {key: 'dashboard', title: 'Dashboard', icon: 'view-dashboard'},
        {key: 'trip', title: 'Trip', icon: 'clipboard-list'},
        {key: 'plus', title: 'New Trip', icon: 'plus'},
        {key: 'map', title: 'Map', icon: 'map-marker'},
        { key: 'bill', title: 'Bills', icon: 'receipt' },
        {key: 'profile', title: 'Profile', icon: 'account'},
    ];

    const renderScene = BottomNavigation.SceneMap({
        dashboard: DashboardScreen,
        trip: CurrentTripScreen,
        map: MapScreen,
        bill: BillScreen,
        profile: ProfileScreen,
        plus: NewTripScreen,
    });

    const renderIcon = ({route, color, focused}: any) => (
        <MaterialCommunityIcons testID={`tab-${route.key}`} name={route.icon} color={color} size={focused ? 28 : 24}/>
    );

    return (
        <View style={styles.container}>
            <BottomNavigation
                navigationState={{index: tabIndex, routes}}
                onIndexChange={setTabIndex}
                renderScene={renderScene}
                renderIcon={renderIcon}
                shifting={false}
                barStyle={styles.barStyle}
            />
        </View>
    );
};

export default function BottomTabsNavigator() {
    return (
        <TabsProvider>
            <BottomTabsContent/>
        </TabsProvider>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1},
    barStyle: {backgroundColor: '#ffffff'},
    fab: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
        backgroundColor: '#6200ee',
    },
});
