export interface Destination {
    id?: string;
    latitude: number;
    longitude: number;
    place_id?: string;
    tripId?: string;
    address?: string;
    description?: string;
    date?: Date | null;
    name?: string;
    createdByUid: string;
}


export interface DestinationInfo {
    latitude?: number,
    longitude?: number,
    place_id: string,
    name?: string | null,
    address?: string | null,
    phone?: string | null,
    website?: string | null,
    rating?: string | null,
    openingHours?: string | null,
}

export interface LatLng {
    latitude: number,
    longitude: number,
};

export type RouteResponse = {
    encodedPolyline: string
    distanceMeters: number
    duration: number            // seconds
    routeLabels?: string[]      // e.g. ['TOLL_ROAD','HIGHWAY']
}
