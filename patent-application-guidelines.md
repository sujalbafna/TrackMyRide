
# FORM 2: COMPLETE SPECIFICATION (THE PATENT ACT, 1970)

## 1. Header Information
**FORM 2** | **THE PATENT ACT 1970** | **COMPLETE SPECIFICATION**

---

## 2. Title of Invention
**[001] TITLE OF INVENTION**
A Cloud-Native System and Method for Comprehensive Institutional Transportation Management and Real-Time Safety Coordination.

---

## 3. Applicants
**APPLICANTS**
*   **Name:** [Sujal Bafna]
*   **Organization:** MIT Art, Design & Technology University

---

## 4. Detailed Description

**A. Technical Field**
**[002]** The present invention relates to smart transportation systems, specifically a pure-software, cloud-hosted platform that utilizes standard mobile device telemetry to manage institutional vehicle fleets, passenger coordination, and safety protocols without requiring specialized onboard GPS hardware.

**B. Objects of the Invention**
**[011]** 
1. To provide a unified interface for five distinct roles (Admin, Student, Faculty, Driver, Terminal Operator).
2. To enable "Road-Snapped" real-time tracking where vehicle positions are synchronized via a NoSQL backend.
3. To provide a software-based attendance verification system using daily-rotating 4-digit passenger codes.
4. To implement a "Navigation Overlay" that extracts step-by-step metadata from mapping APIs to assist drivers.
5. To facilitate immediate emergency coordination through a centralized SOS alert clearinghouse.

**C. Statement of Invention**
**[013]** The invention provides a system comprising a cloud-hosted database, an authentication service with admin-approval gates, and a multi-tenant web application. The driver's device serves as an IoT node, transmitting GPS coordinates to the database, which are then streamed to passenger clients for visualization on a dynamic map interface alongside a journey timeline.

**D. Method of Operation**
**[016]** 
1. **Approval Workflow**: Users register; their accounts remain dormant until an administrator validates credentials.
2. **Telemetry Loop**: Upon starting a trip, the driver's device invokes a geolocation watch, writing coordinates to a specific vehicle document in the cloud database.
3. **Synchronization**: Passenger clients subscribe to the vehicle document, updating the map UI and "Route Timeline" component instantly.
4. **Attendance Loop**: Passengers present a 4-digit code generated on their device; the terminal operator validates this against the database to record daily participation.

---

## 5. Claims
**We Claim:**
1. A hardware-agnostic transportation system that utilizes standard mobile web browsers to facilitate real-time vehicle tracking through a centralized cloud database.
2. A method for managing passenger attendance through software-generated rotating security codes verified at a vehicle terminal.
3. A driver assistance interface that superimposes Directions API metadata as a persistent navigation overlay on a live tracking map within a web environment.
