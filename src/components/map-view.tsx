
'use client';

import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { Stop, WithId, Bus } from '@/lib/types';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface MapViewProps {
  stops?: WithId<Stop>[];
  bus?: WithId<Bus>;
  userStop?: WithId<Stop>;
  onNavigationUpdate?: (data: { instruction: string; distance: string } | null) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  fullscreenControl: true,
  streetViewControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

const libraries: ("places")[] = ["places"];

export function MapView({ stops = [], bus: initialBus, userStop, onNavigationUpdate }: MapViewProps) {
  const firestore = useFirestore();
  
  const busRef = useMemoFirebase(
    () => (initialBus?.id ? doc(firestore, 'buses', initialBus.id) : null),
    [firestore, initialBus?.id]
  );
  const { data: liveBus } = useDoc<Bus>(busRef);
  const currentBus = liveBus || initialBus;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyA_zfRnZdq83nF6g6-LLYR3Uy3AM8wqAZ4',
    libraries,
  });

  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => (a.stopOrder || 0) - (b.stopOrder || 0));
  }, [stops]);

  const center = useMemo(() => {
    if (currentBus?.currentLatitude && currentBus?.currentLongitude) {
      return { lat: currentBus.currentLatitude, lng: currentBus.currentLongitude };
    }
    if (userStop?.latitude && userStop?.longitude) {
        return { lat: userStop.latitude, lng: userStop.longitude };
    }
    if (sortedStops.length > 0 && sortedStops[0].latitude && sortedStops[0].longitude) {
        return { lat: sortedStops[0].latitude, lng: sortedStops[0].longitude };
    }
    return { lat: 18.4912, lng: 74.0255 }; 
  }, [currentBus, sortedStops, userStop]);

  useEffect(() => {
    if (!isLoaded || sortedStops.length < 2) {
        setDirectionsResponse(null);
        if (onNavigationUpdate) onNavigationUpdate(null);
        return;
    }

    const validStops = sortedStops.filter(s => s.latitude && s.longitude);
    if (validStops.length < 2) return;

    const origin = { lat: validStops[0].latitude!, lng: validStops[0].longitude! };
    const destination = { lat: validStops[validStops.length - 1].latitude!, lng: validStops[validStops.length - 1].longitude! };
    
    const waypoints = validStops.slice(1, -1).map(stop => ({
      location: { lat: stop.latitude!, lng: stop.longitude! },
      stopover: true,
    }));

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          
          // Extract current step info for the navigation overlay
          // If we have a currentStopId, we find the leg after that stop
          if (onNavigationUpdate && result.routes[0]?.legs) {
            const currentStopIndex = currentBus?.currentStopId 
              ? sortedStops.findIndex(s => s.id === currentBus.currentStopId)
              : 0;
            
            const activeLeg = result.routes[0].legs[currentStopIndex] || result.routes[0].legs[0];
            const firstStep = activeLeg.steps[0];
            
            if (firstStep) {
              // Strip HTML tags from instruction
              const cleanInstruction = firstStep.instructions.replace(/<[^>]*>?/gm, '');
              onNavigationUpdate({
                instruction: cleanInstruction,
                distance: firstStep.distance?.text || '-- km'
              });
            }
          }
        }
      }
    );
  }, [isLoaded, sortedStops, currentBus?.currentStopId, onNavigationUpdate]);

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading Map Components...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={mapOptions}
    >
      {directionsResponse && (
        <DirectionsRenderer
          directions={directionsResponse}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#3F51B5",
              strokeWeight: 6,
              strokeOpacity: 0.7,
            },
          }}
        />
      )}

      {sortedStops.map((stop, index) => {
          if (!stop.latitude || !stop.longitude) return null;
          const isUserStop = userStop?.id === stop.id;
          const isCurrentBusStop = currentBus?.currentStopId === stop.id;
          
          return (
            <MarkerF
                key={stop.id}
                position={{ lat: stop.latitude, lng: stop.longitude }}
                label={{
                    text: (index + 1).toString(),
                    color: "white",
                    fontWeight: "bold"
                }}
                icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: isUserStop ? "#FF9800" : isCurrentBusStop ? "#E91E63" : "#3F51B5",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "white",
                    scale: isUserStop || isCurrentBusStop ? 15 : 11,
                }}
                title={stop.name}
            />
          );
      })}

      {currentBus?.currentLatitude && currentBus?.currentLongitude && (
        <MarkerF
          position={{ lat: currentBus.currentLatitude, lng: currentBus.currentLongitude }}
          title={`Bus: ${currentBus.busNumber}`}
          zIndex={1000}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#E91E63" width="48px" height="48px"><circle cx="12" cy="12" r="10" fill="white" stroke="%23E91E63" stroke-width="2"/><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5s-1.5.67-1.5 1.5zM18 11H6V6h12v5z" transform="scale(0.6) translate(8, 8)"/></svg>')}`,
            scaledSize: new window.google.maps.Size(50, 50),
            anchor: new window.google.maps.Point(25, 25),
          }}
        />
      )}
    </GoogleMap>
  );
}
