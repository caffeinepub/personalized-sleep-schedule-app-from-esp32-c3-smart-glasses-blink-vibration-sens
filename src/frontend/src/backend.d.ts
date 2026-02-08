import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type DeviceId = string;
export interface BlinkRateMeasurement {
    userPrincipal?: Principal;
    deviceId: DeviceId;
    timestamp: Timestamp;
    blinkRate: BlinkRate;
}
export type Timestamp = bigint;
export type VibrationEventId = bigint;
export interface VibrationEvent {
    eventId: VibrationEventId;
    userPrincipal?: Principal;
    deviceId: DeviceId;
    timestamp: Timestamp;
}
export interface SleepRecommendation {
    suggestedBedtime: Timestamp;
    analysisWindowEnd: Timestamp;
    analysisWindowStart: Timestamp;
    suggestedWakeup: Timestamp;
}
export interface UserProfile {
    name: string;
}
export type BlinkRate = bigint;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearOldData(deviceId: DeviceId, thresholdTime: Timestamp): Promise<void>;
    generateSleepRecommendation(deviceId: DeviceId, analysisWindowStart: Timestamp, analysisWindowEnd: Timestamp): Promise<SleepRecommendation>;
    getBlinkRates(deviceId: DeviceId): Promise<Array<BlinkRateMeasurement>>;
    getBlinkRatesInTimeRange(deviceId: DeviceId, startTime: Timestamp, endTime: Timestamp): Promise<Array<BlinkRateMeasurement>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVibrationEvents(deviceId: DeviceId): Promise<Array<VibrationEvent>>;
    getVibrationEventsInTimeRange(deviceId: DeviceId, startTime: Timestamp, endTime: Timestamp): Promise<Array<VibrationEvent>>;
    isCallerAdmin(): Promise<boolean>;
    recordBlinkRate(deviceId: DeviceId, blinkRate: BlinkRate): Promise<void>;
    recordVibrationEvent(deviceId: DeviceId): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
