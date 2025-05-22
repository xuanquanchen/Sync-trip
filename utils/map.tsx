import * as Location from 'expo-location';
import Constants from 'expo-constants';
import polyline from '@mapbox/polyline'
import { DestinationInfo, Destination, LatLng, RouteResponse } from "../types/Destination";

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMaps?.apiKey2;
// Convert formatted address → latitude & longitude using `expo-location`
export const getCoordinatesFromAddress = async (address: string): Promise<{ latitude: number, longitude: number } | null> => {
    try {
        const geocodeResults = await Location.geocodeAsync(address);

        if (geocodeResults.length > 0) {
            const { latitude, longitude } = geocodeResults[0];
            return { latitude: latitude, longitude: longitude };
        } else {
            console.error("[Geocode] No results found for address:", address);
            return null;
        }
    } catch (error) {
        console.error("[Geocode] Error converting address to coordinates:", address, error);
        return null;
    }
};

// Convert latitude & longitude → formatted address using `expo-location`
export const getAddressFromCoordinates = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        const reverseGeocodeResults = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (reverseGeocodeResults.length > 0) {
            const formattedAddress = reverseGeocodeResults[0].formattedAddress || "Unknown Location";
            return formattedAddress;
        } else {
            console.error("[ReverseGeocode] No address found for coordinates:", { latitude, longitude });
            return null;
        }
    } catch (error) {
        console.error("[ReverseGeocode] Error converting coordinates to address:", error);
        return null;
    }
};

export const getPlaceFromCoordinates = async (latitude: number, longitude: number): Promise<DestinationInfo | null> => {
    try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
            console.log("[Geocode] Response Data:", geocodeData.results[0].types[0]);
            const address = geocodeData.results[0].formatted_address || "Unknown Place";
            const place_id = geocodeData.results[0].place_id || "";
            const response = {
                latitude: latitude,
                longitude: longitude,
                place_id: place_id,
                address: address,
            }
            return response;
        }
        return null;
    } catch (error) {
        console.log("[Error] Fetching geocode/place details failed:", error);
        return null;
    }
}

export const getInfoFromPlaceId = async (placeId: string): Promise<DestinationInfo | null> => {
    try {
        const fields = "name,formatted_address,geometry,international_phone_number,website,rating,opening_hours";
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(detailsUrl);
        const data = await response.json();
        if (data.status === 'OK') {
            const details = data.result;
            const { lat, lng } = details.geometry.location;
            const result = {
                latitude: lat,
                longitude: lng,
                place_id: placeId,
                name: details.name,
                address: details.formatted_address,
                phone: details.international_phone_number,
                website: details.website,
                rating: details.rating,
                openingHours: details.opening_hours
            }
            return result;
        } else {
            console.error("Place details error:", data.status);
            return null;
        }
    } catch (error) {
        console.error("Error fetching place details:", error);
        return null;
    }
};

export async function getRoute(
    origin: LatLng,
    destination: LatLng,
    travelMode: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT' = 'DRIVE',
    departureTimeSeconds?: number
): Promise<RouteResponse> {
    // request only the fields we need
    const url =
        `https://routes.googleapis.com/directions/v2:computeRoutes` +
        `?key=${GOOGLE_API_KEY}` +
        `&fields=routes.polyline.encodedPolyline,` +
        `routes.distanceMeters,` +
        `routes.duration,` +
        `routes.routeLabels`

    const body: any = {
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode
    }
    if (departureTimeSeconds != null) {
        //body.routingPreference = 'TRAFFIC_AWARE'
        //body.departureTime = { seconds: departureTimeSeconds }
    }
    console.log('body', body)

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    const data = await resp.json()
    if (!resp.ok || !data.routes) {
        throw new Error(`Routes API error ${resp.status}: ${JSON.stringify(data)}`)
    }

    const r = data.routes[0]
    const rawDuration = r.duration
    const durationSecs =
        typeof rawDuration === 'string'
            ? parseInt(rawDuration.replace(/[^0-9]/g, ''), 10)
            : rawDuration
    return {
        encodedPolyline: r.polyline.encodedPolyline,
        distanceMeters: r.distanceMeters,
        duration: durationSecs,
        routeLabels: r.routeLabels
    }
}

export function decodePolyline(encoded: string): LatLng[] {
    return polyline
        .decode(encoded)
        .map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
}
