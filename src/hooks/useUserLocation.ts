import { useState, useEffect, useCallback } from "react";

interface LocationState {
  city: string;
  region: string;
  displayName: string;
  lat: number | null;
  lng: number | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
  isDetected: boolean;
}

const STORAGE_KEY = "dentzap-user-location";

const INDIAN_CITIES = [
  "Mumbai, Maharashtra",
  "Delhi, NCR",
  "Bangalore, Karnataka",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Hyderabad, Telangana",
  "Pune, Maharashtra",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh",
  "Salem, Tamil Nadu",
  "Coimbatore, Tamil Nadu",
  "Kochi, Kerala",
  "Indore, Madhya Pradesh",
  "Nagpur, Maharashtra",
  "Bhopal, Madhya Pradesh",
  "Visakhapatnam, Andhra Pradesh",
  "Chandigarh, Punjab",
  "Guwahati, Assam",
  "Mangalore, Karnataka",
  "Mysore, Karnataka",
  "Thiruvananthapuram, Kerala",
  "Madurai, Tamil Nadu",
  "Vadodara, Gujarat",
  "Surat, Gujarat",
];

function getSavedLocation(): { city: string; region: string; displayName: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function saveLocation(city: string, region: string, displayName: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ city, region, displayName }));
  } catch {}
}

export function useUserLocation() {
  const saved = getSavedLocation();
  const [location, setLocation] = useState<LocationState>({
    city: saved?.city || "",
    region: saved?.region || "",
    displayName: saved?.displayName || "",
    lat: null,
    lng: null,
    loading: false,
    error: null,
    permissionDenied: false,
    isDetected: false,
  });

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        "Unknown";
      const region = addr.state || "";
      const displayName = region ? `${city}, ${region}` : city;

      setLocation((prev) => ({
        ...prev,
        city,
        region,
        displayName,
        lat,
        lng,
        loading: false,
        error: null,
        isDetected: true,
      }));
      saveLocation(city, region, displayName);
    } catch {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: "Could not determine city name",
      }));
    }
  }, []);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: null, permissionDenied: false }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        reverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setLocation((prev) => ({
          ...prev,
          loading: false,
          permissionDenied: denied,
          error: denied
            ? "Location access is required to show nearby products. You can also select location manually."
            : "Unable to detect your location. Please try again or select manually.",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [reverseGeocode]);

  const setManualLocation = useCallback((displayName: string) => {
    const parts = displayName.split(",").map((s) => s.trim());
    const city = parts[0] || displayName;
    const region = parts[1] || "";
    setLocation((prev) => ({
      ...prev,
      city,
      region,
      displayName,
      lat: null,
      lng: null,
      loading: false,
      error: null,
      permissionDenied: false,
      isDetected: false,
    }));
    saveLocation(city, region, displayName);
  }, []);

  const searchCities = useCallback((query: string): string[] => {
    if (!query.trim()) return INDIAN_CITIES.slice(0, 8);
    const q = query.toLowerCase();
    return INDIAN_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
  }, []);

  return {
    location,
    detectLocation,
    setManualLocation,
    searchCities,
    INDIAN_CITIES,
  };
}
