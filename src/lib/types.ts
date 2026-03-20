
export type UserProfile = {
  id: string;
  userType: 'student' | 'faculty' | 'driver' | 'admin' | 'buses';
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';

  // Student & Faculty specific
  rollNumber?: string; // Also used as College ID
  department?: string;
  year?: number;
  stopName?: string; // Requested stop name during registration
  
  // Assigned data (post-approval)
  stopId?: string;
  busId?: string;

  // Faculty & Admin & Driver & Buses specific
  employeeCode?: string;
  designation?: string;
  
  // Driver Specific
  licenseNumber?: string;
  yearsOfExperience?: number;
  hasLicense?: boolean; // For driver request form

  // Faculty and Drivers are assigned to routes
  routeId?: string;
};

export type Bus = {
  id: string;
  busNumber: string;
  capacity: number;
  driverId?: string;
  routeId?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  passengerIds?: string[];
  status?: 'idle' | 'on_trip' | 'completed';
  currentStopId?: string;
};

export type Route = {
    id: string;
    name: string;
    description?: string;
    busId?: string;
    driverId?: string;
    stopOrder?: string[];
    status?: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
};

export type Stop = {
    id: string;
    name: string;
    routeId?: string;
    address?: string;
    placeId?: string;
    stopOrder?: number;
    latitude?: number;
    longitude?: number;
};

export type Attendance = {
    id: string;
    userId: string;
    busId: string;
    routeId: string;
    attendanceDate: string; // "YYYY-MM-DD"
    status: 'Present' | 'Absent';
    tripType?: 'morning' | 'evening';
    intention?: 'riding' | 'not_riding'; // Student/Faculty intention for the day
    markedBy: string; // UID of faculty/admin/bus_operator
    markedAt: any; // Firestore Timestamp
};

export type Notification = {
    id: string;
    userId: string; // 'all' for broadcast
    message: string;
    type: 'announcement' | 'delay_alert' | 'emergency' | 'general';
    sentAt: any; // Firestore Timestamp
    isRead: boolean;
    sentBy: string; // UID of admin
};

export type SOSAlert = {
    id: string;
    userId: string;
    timestamp: any; // Firestore Timestamp
    status: 'active' | 'acknowledged' | 'resolved';
    location?: {
        latitude: number;
        longitude: number;
    };
    message?: string;
};

export type Chat = {
  id: string;
  participantIds: string[];
  lastMessage?: ChatMessage;
}

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any; // Firestore Timestamp
}

export type WithId<T> = T & { id: string };
