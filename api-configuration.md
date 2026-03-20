
# API Configuration Guide

To ensure all features of "Track My Ride" work correctly, you need to enable specific APIs in your Google Cloud Console.

## 1. Google Maps Platform

Navigate to the [Google Cloud Console](https://console.cloud.google.com/), select your project, and enable the following APIs from the **API Library**:

1.  **Maps JavaScript API** (Required): Used to render the map, markers, and live bus positions.
2.  **Places API** (Required): Used for location search and address autocomplete.
3.  **Directions API** (Required): Used to calculate paths between stops and show navigation instructions.
4.  **Geolocation API**: Used to track the bus driver's real-time position.
5.  **Navigation SDK (Android/iOS)**: Enabled for native-style turn-by-turn guidance.

### API Key Restrictions (Crucial for Security)
In the **Google Cloud Console > Keys & Credentials** page, click on your API Key and set the following:

- **Application restrictions**: 
  - **For Production**: Select **Websites**. Enter your domain (e.g., `*.web.app/*`, `*.firebaseapp.com/*`).
- **API restrictions**: Select **Restrict key**.
  - From the dropdown, select the APIs mentioned above.

### Troubleshooting: "For Development Purposes Only"
If you see this watermark on your map, check the following:
1.  **Enable Billing**: Google Maps requires a valid billing account linked to the project, even if you stay within the free tier. This is the #1 cause of the watermark.
2.  **Enable APIs**: Ensure **Maps JavaScript API**, **Directions API**, and **Places API** are all status: "Enabled".
3.  **Key Restrictions**: If you restricted the key to specific domains, ensure the domain you are testing on (including Firebase App Hosting domains) is added to the allowed list.
4.  **Environment Variable**: Ensure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in your Firebase App Hosting configuration or your `.env` file.

---

## 2. Firebase Configuration

Ensure you have enabled:
1.  **Authentication**: Email/Password provider and **Phone Authentication** (for OTP).
2.  **Firestore Database**: Native mode.
3.  **Security Rules**: Ensure rules allow reads/writes for authenticated users.
