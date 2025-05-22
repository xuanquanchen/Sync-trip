# Sync‑Trip

A collaborative group trip planner enabling real‑time itinerary management, offline maps, notifications, and expense tracking.

- [Requirements Specification](./docs/requirements-specification.md)  
- [Project Roadmap](./docs/roadmap.md)  
- [Technical Documentation](./docs/technical-documentation.md)  

## Project Structure

```bash
.
├── App.tsx
├── android
│   ├── build.gradle
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   └── settings.gradle
├── app-env.d.ts
├── app.json
├── assets
│   ├── README.md
│   ├── adaptive-icon.png
│   ├── another_image.png
│   ├── default_bg.jpg
│   ├── favicon.png
│   ├── icon.png
│   ├── logInBackground.jpg
│   ├── profile_pic.png
│   └── splash.png
├── babel.config.js
├── cesconfig.json
├── components
│   ├── BillDetailModal.tsx
│   ├── BillPaymentButton.tsx
│   ├── MessageDialog.tsx
│   └── TransactionModal.tsx
├── context
│   ├── BillAndTransactionContext.tsx
│   ├── NotificationContext.tsx
│   ├── TripContext.tsx
│   └── UserContext.tsx
├── eas.json
├── global.css
├── google-services.json
├── ios
│   ├── Podfile
│   └── Podfile.properties.json
├── maestro
│   ├── announcementTest.yaml
│   ├── billTest.yaml
│   ├── checklistTest.yaml
│   ├── entireTest.yaml
│   ├── profileTest.yaml
│   ├── resetPwd.yaml
│   ├── routeTest.yaml
│   ├── signUpScreen_test.yaml
│   └── tripCreation.yaml
├── metro.config.js
├── nativewind-env.d.ts
├── navigation
│   ├── AppNavigator.tsx
│   ├── BottomTabsNavigator.tsx
│   └── useAppNavigation.tsx
├── package-lock.json
├── package.json
├── prettier.config.js
├── screens
│   ├── AnnounceScreen.tsx
│   ├── ArchivedHistoryScreen.tsx
│   ├── BillScreen.tsx
│   ├── CurrentTripScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LogInScreen.tsx
│   ├── MapScreen.tsx
│   ├── NewTripScreen.tsx
│   ├── ProfileScreen.tsx
│   └── SignUpScreen.tsx
├── styles
│   ├── announce.ts
│   └── loginStyples.ts
├── tailwind.config.js
├── tsconfig.json
├── types
│   ├── Announcement.ts
│   ├── Bill.ts
│   ├── Checklist.ts
│   ├── Destination.ts
│   ├── Transaction.ts
│   ├── Trip.ts
│   └── User.ts
└── utils
    ├── NotificationHandler.tsx
    ├── NotificationService.tsx
    ├── billAndTransactionAPI.ts
    ├── dateUtils.ts
    ├── firebase.ts
    ├── icsGenerator.ts
    ├── map.tsx
    ├── permissions.ts
    ├── tripAPI.tsx
    └── userAPI.tsx
```

## Prerequisites

- **Node.js** v22.14.0  
- **JDK** 17  
- **Android Studio** (with SDK & command‑line tools)  

## Environment Setup

1. Follow the React Native environment guide:  
   https://reactnative.dev/docs/environment-setup  
2. Configure environment variables:  

  ```bash
   export ANDROID_HOME="<path-to-Android-Sdk>"
   export JAVA_HOME="<path-to-JDK-17>"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
  ```

3. Verify setup:  

  ```bash
   npx react-native doctor
  ```

## Local Development

Expo is used for local package management and development. To develop Sync Trip locally:

```bash
git clone https://github.com/cs421sp25-homework/team-06.git
cd sync-trip
npm install --global expo-cli
npx expo install
npx expo prebuild --platform android --clean
npx expo run:android
```

To launch a fast refresh session:

```bash
npx expo start
```

To build a development APK via EAS:

```bash
eas build --profile development --platform android
```

## Firebase Configuration

The Firebase configuration file `google-services.json` has been added to `android/app/` to enable direct connection to Firebase services.

## End‑to‑End Testing

Maestro is used for E2E tests. The flow is defined in `.eas/build/maestro-test.yaml`. To execute:

```bash
brew install maestro
export PATH="$PATH:$HOME/.maestro/bin"
eas init
eas build --profile maestro-test
```

Local E2E test (entire test as an example):

```bash
npx expo run:android
maestro test ./maestro/entireTest.yaml
```

This will run the test suite of YAML files stored in `./maestro`. Specifically:

1. `./maestro/entireTest.yaml` checks the main flow of Sync Trip, including trip CRUD, multi-user editing, map interactions and billing system;
2. `./maestro/restPwd.yaml` checks the login functions, including password reset and email verification;
3. `./maestro/signUpScreen_test.yaml` checks the sign up function based on Firebase email service.
4. `./maestro/profileTest.yaml` checks the profile editing function;
5. `./maestro/tripCreation.yaml` checks the trip creation function;
6. `./maestro/checklistTest.yaml` checks the checklist function;
7. `./maestro/announcementTest.yaml` checks the announcement function;
8. `./maestro/billTest.yaml` checks the billing function;
9. `./maestro/routeTest.yaml` checks the route planning function;

## Automated Test

Continuous integration is configured in `.github/workflows/automated_test.yml`.

GitHub Actions triggers the Maestro E2E suite on pull requests via `.github/workflows/automated_test.yml`.

## Completed Features in Iteration 1

1. Users can sign up with email/password or via Google OAuth.  
2. Users can log in, log out, and delete their account.  
3. Email verification and password‑reset flows enabled.  
4. Profile editing and viewing implemented.  
5. Bottom‑tab navigation configured across core screens.  

## Completed Features in Iteration 2

1. Trip creation (title + date range) in the “+” screen.  
2. Trip metadata editing (title, dates, status) on the detail screen.  
3. Dashboard lists trips; invitations via email input.  
4. Current‑trip selection for editing/viewing.  
5. Long‑press map to add destination markers (persisted).  
6. Tap marker to view/edit destination details.  
7. Date assignment for destinations.  
8. Destination deletion.  
9. Real‑time multi‑user editing of trips & destinations.  

## Completed Features in Iteration 3

1. Notices board with real‑time posting & viewing.  
2. Itinerary update notifications via FCM & Cloud Functions.  
3. Calendar export as .ics files for external apps.  
4. Trip archiving/deletion with status field and UI filters.  
5. POI search & persistent markers via Google Places API.  
6. Visual indicators (colors/avatars) for multi‑user contributions.  
7. Daily weather & itinerary summaries with scheduled notifications and summary screen.  
8. Detailed destination info (attractions, tips, hours) via Places API.  

## Completed Features in Iteration 4

1. Shared expense creation and automatic bill‑splitting.  
2. Activity‑level and total cost summaries.  
3. Final payment summary (“Who Owes Whom”).  
4. Archived trip cost & itinerary review.  
5. Archived‑trips section for dashboard cleanup.  
6. Real‑time Google Maps integration (traffic & dynamic routes).  
7. Expense update notifications via FCM & Cloud Functions.
8. Profile Avatar can be uploaded and stored.

## Tech Stack

1. **Framework:** React Native (Expo)  
2. **UI Components:** Native React Native components  
3. **Backend:** Firebase Firestore (real‑time database)  
4. **Notifications & Functions:** Firebase Cloud Messaging & Cloud Functions  

## Contributing

Refer to [CONTRIBUTING.md](./CONTRIBUTING.md).
