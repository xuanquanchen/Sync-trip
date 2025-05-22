import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {NavigationContainer} from '@react-navigation/native';
import SignUpScreen from '../screens/SignUpScreen';
import LogInScreen from '../screens/LogInScreen';
import AnnouceScreen from '../screens/AnnounceScreen';
import BottomTabsNavigator from './BottomTabsNavigator';
import {RootStackParamList} from './useAppNavigation';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                {/*<Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />*/}
                <Stack.Screen name="Login" component={LogInScreen} options={{headerShown: false}}/>
                <Stack.Screen name="SignUp" component={SignUpScreen} options={{headerShown: false}}/>

                <Stack.Screen
                    name="App"
                    component={BottomTabsNavigator}
                    options={{headerShown: false}}
                />
                <Stack.Screen
                    name="Annouce"
                    component={AnnouceScreen}
                    options={{ title: 'Trip Announcement' }}
                />
                {/*<Stack.Screen name="ArchivedHistory" component={ArchivedHistoryScreen} options={{ title: 'Archived Trips' }} />*/}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
