import {Trip} from "../types/Trip";
import {firestore} from "./firebase";
import {Bill} from "../types/Bill";
// import axios from 'axios';

export interface NotificationPayload {
  expoPushToken: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

async function sendMessages(messages: { to: string; sound: string; title: string; body: string; data: {}; }[]) {
  for (const message of messages) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      if (!response.ok) {
        throw new Error('Failed to send push notification');
      }
      console.log('Push notification sent successfully');
      console.log(message);
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }
}

export async function sendBillUpdateNotification(bill:Bill) {
  const tokens: string[] = [];
  for (const participant of bill.participants) {
    try {
      const userDoc = await firestore.collection('users').doc(participant).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data && data.expoPushToken) {
          tokens.push(data.expoPushToken);
        }
      } else {
        console.warn(`No user found for uid: ${participant}`);
      }
    } catch (error) {
      console.error('Error retrieving user for uid:', participant, error);
    }
  }

  if (tokens.length === 0) {
    console.log('No push tokens found for the bill participants.');
    return;
  }

  const messageTitle = 'Your bill has been updated';
  const messageBody = "your bill '" + bill.title + "has been updated";

  // Build the notification message payload for each token.
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: messageTitle,
    body: messageBody,
    data: {},
  }));

  // Send notifications to each token via Expo's push endpoint.
  await sendMessages(messages);

}


export async function sendBillCreateNotification(bill:Bill) {
  const tokens: string[] = [];
  for (const participant of bill.participants) {
    try {
      const userDoc = await firestore.collection('users').doc(participant).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data && data.expoPushToken) {
          tokens.push(data.expoPushToken);
        }
      } else {
        console.warn(`No user found for uid: ${participant}`);
      }
    } catch (error) {
      console.error('Error retrieving user for uid:', participant, error);
    }
  }

  if (tokens.length === 0) {
    console.log('No push tokens found for the bill participants.');
    return;
  }

  const messageTitle = 'You got a new bill';
  const messageBody = "you got a new bill: '" + bill.title;

  // Build the notification message payload for each token.
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: messageTitle,
    body: messageBody,
    data: {},
  }));

  // Send notifications to each token via Expo's push endpoint.
  await sendMessages(messages);

}

export async function sendTripUpdateNotification(
  trip: Trip
) {
  const tokens: string[] = [];

  //add owner to the notices
  const userDoc = await firestore.collection('users').doc(trip.ownerId).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    if (data && data.expoPushToken) {
      tokens.push(data.expoPushToken);
    }
  }

  // Loop through collaborator emails
  for (const collaboratorId of trip.collaborators) {
    try {
      // Query the users collection to find the document with the given email.
      const userDoc = await firestore.collection('users').doc(collaboratorId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data && data.expoPushToken) {
          tokens.push(data.expoPushToken);
        }
      } else {
        console.warn(`No user found for uid: ${collaboratorId}`);
      }
    } catch (error) {
      console.error('Error retrieving user for uid:', collaboratorId, error);
    }
  }

  if (tokens.length === 0) {
    console.log('No push tokens found for the trip collaborators.');
    return;
  }

  const messageTitle = 'Trip updated';
  const messageBody = "your '" + trip.title + "' trip has been updated.";

  // Build the notification message payload for each token.
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title: messageTitle,
    body: messageBody,
    data: { tripId: trip.id },
  }));

  // Send notifications to each token via Expo's push endpoint.
  await sendMessages(messages);
}


export async function sendPushNotification(expoPushToken: string, title: string, body: string, data = {}): Promise<void> {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error('Failed to send push notification');
    }
    console.log('Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
