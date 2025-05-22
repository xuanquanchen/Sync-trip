import {Destination} from "./Destination";

export enum TripStatus {
    PLANNING = "planning",
    ONGOING = "ongoing",
    COMPLETED = 'completed',
    ARCHIVED = "archived",
}

export interface Trip {
    id?: string;
    title: string;
    startDate: Date;
    endDate: Date;
    destinations: Destination[];
    ownerId: string;
    collaborators: string[];
    status: TripStatus;
}
