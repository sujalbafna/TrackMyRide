
# Project Summary: Track My Ride (MIT ADT Edition)

## 1. Executive Summary
"Track My Ride" is a holistic, cloud-native software platform designed to modernize and optimize institutional transportation for MIT Art, Design & Technology University. It replaces fragmented, hardware-dependent legacy systems with a unified web-based ecosystem that serves administrators, drivers, faculty, students, and terminal operators. The system provides real-time vehicle tracking, automated passenger coordination, and robust emergency response capabilities without requiring specialized GPS hardware.

## 2. Technology Stack
The application is built on a modern, serverless architecture optimized for high-performance real-time updates and mobile responsiveness.

- **Frontend Framework**: Next.js 15 (App Router) with React 18.
- **Styling & UI**: Tailwind CSS for responsive design and ShadCN UI for a professional component library.
- **Backend-as-a-Service (BaaS)**: Firebase.
  - **Authentication**: Secure, role-based access control (RBAC).
  - **Firestore**: Real-time NoSQL database for sub-second location synchronization.
- **Mapping & Geolocation**: Google Maps Platform.
  - **Directions API**: Powers the real-time road-snapped route visualization.
  - **Navigation Overlay**: Provides drivers with live turn-by-turn instruction data.
  - **Places API**: Used for intelligent stop location selection.
- **Icons**: Lucide React.

## 3. Core Features by Role

### A. Administrator Dashboard
- **Joining Requests**: Review and approve/reject new accounts for students, faculty, and drivers.
- **Fleet Management**: Add and edit buses, assigning them to specific drivers.
- **Route Architect**: Define complex routes with ordered stops using an interactive map interface.
- **Live Monitoring**: Visualize the entire fleet's position on a single global map.
- **Analytics**: Track daily attendance trends, bus occupancy rates, and safety alerts.
- **Broadcast System**: Send urgent announcements or delay alerts to all users.

### B. Driver Dashboard
- **Trip Control**: "Start Trip" activation to begin live GPS broadcasting.
- **Navigation Overlay**: A professional, top-mounted bar showing the current street and distance to the next turn.
- **External Navigation**: Direct integration to launch native Android/iOS Google Maps for turn-by-turn voice guidance.
- **Passenger List**: View all students and faculty assigned to each stop on the route.
- **SOS Alert**: Immediate emergency trigger to notify admins of breakdowns or accidents.

### C. Student & Faculty Dashboard
- **Live Tracking**: See the bus's real-time movement on the road relative to their specific stop.
- **Route Timeline**: A vertical sequence showing which stops the bus has passed and where it is currently located.
- **Daily Check-in**: A "Riding / Not Riding" intention toggle to help drivers plan capacity.
- **Daily Code**: A unique 4-digit rotating code used for secure attendance verification.
- **SOS Button**: Personal safety trigger for students.

### D. Bus Terminal Operator
- **Verification Terminal**: A simplified interface to enter the 4-digit daily codes from passengers to mark them present instantly.

## 4. Data Models (Firestore)
- **`users`**: Stores PII, role, `approvalStatus`, and assignments (`busId`, `routeId`, `stopId`).
- **`buses`**: Vehicle specs, driver assignment, and live `currentLatitude`/`currentLongitude`.
- **`routes`**: Collection of stop IDs and metadata.
- **`stops`**: Geocoordinates and names for specific pickup points.
- **`attendance`**: Daily records keyed by date and trip type (Morning/Evening).
- **`sosAlerts`**: Emergency logs with timestamps and status tracking.

## 5. System Design Philosophy
The system is designed for **Resiliency** and **Cost-Efficiency**. By utilizing the driver's own mobile device as the GPS transmitter, the institution avoids thousands of dollars in hardware installation and maintenance costs. The real-time nature of Firestore ensures that students are never left waiting at a stop, as they can see exactly how far the bus is in real-time.
