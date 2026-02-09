import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  type DeviceId = Text;
  type Timestamp = Int;
  type BlinkRate = Nat;
  type VibrationEventId = Nat;

  public type SmartGlassesEvent = {
    deviceId : DeviceId;
    timestamp : Timestamp;
    userPrincipal : ?Principal;
  };

  public type BlinkRateMeasurement = SmartGlassesEvent and {
    blinkRate : BlinkRate;
  };

  public type VibrationEvent = SmartGlassesEvent and {
    eventId : VibrationEventId;
  };

  public type SleepRecommendation = {
    suggestedBedtime : Timestamp;
    suggestedWakeup : Timestamp;
    analysisWindowStart : Timestamp;
    analysisWindowEnd : Timestamp;
  };

  public type UserProfile = {
    name : Text;
  };

  module SmartGlassesEvent {
    public func compare(a : SmartGlassesEvent, b : SmartGlassesEvent) : Order.Order {
      switch (
        Principal.compare(
          switch (a.userPrincipal) {
            case (?principal) { principal };
            case (null) { Principal.fromText("") };
          },
          switch (b.userPrincipal) {
            case (?principal) { principal };
            case (null) { Principal.fromText("") };
          },
        )
      ) {
        case (#equal) {
          switch (Text.compare(a.deviceId, b.deviceId)) {
            case (#equal) { Int.compare(a.timestamp, b.timestamp) };
            case (ordering) { ordering };
          };
        };
        case (ordering) { ordering };
      };
    };
  };

  // New BlinkSummary type and storage
  public type BlinkSummary = {
    deviceId : DeviceId;
    timestamp : Timestamp;
    userPrincipal : ?Principal;
    totalBlinks : Nat;
    averageBlinkRate : ?Nat;
    maxBlinkRate : ?Nat;
    minBlinkRate : ?Nat;
    // Add additional summary metrics as needed
  };

  let blinkRatesMap = Map.empty<DeviceId, List.List<BlinkRateMeasurement>>();
  let vibrationEventsMap = Map.empty<DeviceId, List.List<VibrationEvent>>();
  let blinkSummariesMap = Map.empty<DeviceId, List.List<BlinkSummary>>(); // New map for summaries
  var nextVibrationEventId = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Helper function to filter data by ownership
  func filterByOwnership(caller : Principal, measurements : List.List<BlinkRateMeasurement>) : List.List<BlinkRateMeasurement> {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return measurements;
    };

    measurements.filter(
      func(m) {
        switch (m.userPrincipal) {
          case (?principal) { Principal.equal(principal, caller) };
          case (null) { false };
        };
      }
    );
  };

  func filterVibrationsByOwnership(caller : Principal, events : List.List<VibrationEvent>) : List.List<VibrationEvent> {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return events;
    };

    events.filter(
      func(e) {
        switch (e.userPrincipal) {
          case (?principal) { Principal.equal(principal, caller) };
          case (null) { false };
        };
      }
    );
  };

  func filterSummariesByOwnership(caller : Principal, summaries : List.List<BlinkSummary>) : List.List<BlinkSummary> {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return summaries;
    };

    summaries.filter(
      func(s) {
        switch (s.userPrincipal) {
          case (?principal) { Principal.equal(principal, caller) };
          case (null) { false };
        };
      }
    );
  };

  // Blink rate storage and retrieval
  public shared ({ caller }) func recordBlinkRate(deviceId : DeviceId, blinkRate : BlinkRate) : async () {
    // Allow all callers (including guests/ESP32 devices) to record data
    let measurement : BlinkRateMeasurement = {
      deviceId;
      timestamp = Time.now();
      userPrincipal = if (AccessControl.hasPermission(accessControlState, caller, #user)) { ?caller } else { null };
      blinkRate;
    };
    let existing = blinkRatesMap.get(deviceId);
    let measurements = switch (existing) {
      case (null) { List.empty<BlinkRateMeasurement>() };
      case (?list) { list };
    };
    measurements.add(measurement);
    blinkRatesMap.add(deviceId, measurements);
  };

  public query ({ caller }) func getBlinkRates(deviceId : DeviceId) : async [BlinkRateMeasurement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access device data");
    };

    let measurements = switch (blinkRatesMap.get(deviceId)) {
      case (null) { List.empty<BlinkRateMeasurement>() };
      case (?list) { list };
    };

    let filtered = filterByOwnership(caller, measurements);
    filtered.toArray();
  };

  // Vibration event storage and retrieval
  public shared ({ caller }) func recordVibrationEvent(deviceId : DeviceId) : async () {
    // Allow all callers (including guests/ESP32 devices) to record data
    let event : VibrationEvent = {
      deviceId;
      eventId = nextVibrationEventId;
      timestamp = Time.now();
      userPrincipal = if (AccessControl.hasPermission(accessControlState, caller, #user)) { ?caller } else { null };
    };
    nextVibrationEventId += 1;
    let existing = vibrationEventsMap.get(deviceId);
    let events = switch (existing) {
      case (null) { List.empty<VibrationEvent>() };
      case (?list) { list };
    };
    events.add(event);
    vibrationEventsMap.add(deviceId, events);
  };

  public query ({ caller }) func getVibrationEvents(deviceId : DeviceId) : async [VibrationEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access device data");
    };

    let events = switch (vibrationEventsMap.get(deviceId)) {
      case (null) { List.empty<VibrationEvent>() };
      case (?list) { list };
    };

    let filtered = filterVibrationsByOwnership(caller, events);
    filtered.toArray();
  };

  // New backend summary recording method
  public shared ({ caller }) func recordBlinkSummary(deviceId : DeviceId, summary : BlinkSummary) : async () {
    let summaryWithTimestamp = { summary with timestamp = Time.now() };

    let existing = blinkSummariesMap.get(deviceId);
    let summaries = switch (existing) {
      case (null) { List.empty<BlinkSummary>() };
      case (?list) { list };
    };
    summaries.add(summaryWithTimestamp);
    blinkSummariesMap.add(deviceId, summaries);
  };

  // Query summaries in time range
  public query ({ caller }) func getBlinkSummariesInTimeRange(deviceId : DeviceId, startTime : Timestamp, endTime : Timestamp) : async [BlinkSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access device data");
    };

    let summaries = switch (blinkSummariesMap.get(deviceId)) {
      case (null) { List.empty<BlinkSummary>() };
      case (?list) { list };
    };

    let ownedData = filterSummariesByOwnership(caller, summaries);

    let filtered = ownedData.values().filter(
      func(s) {
        s.timestamp >= startTime and s.timestamp <= endTime
      }
    );

    filtered.toArray();
  };

  // Example query functions for filtering in time range
  public query ({ caller }) func getBlinkRatesInTimeRange(deviceId : DeviceId, startTime : Timestamp, endTime : Timestamp) : async [BlinkRateMeasurement] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access device data");
    };

    let measurements = switch (blinkRatesMap.get(deviceId)) {
      case (null) { List.empty<BlinkRateMeasurement>() };
      case (?list) { list };
    };

    let ownedData = filterByOwnership(caller, measurements);

    let filtered = ownedData.values().filter(
      func(m) {
        m.timestamp >= startTime and m.timestamp <= endTime
      }
    );

    filtered.toArray();
  };

  public query ({ caller }) func getVibrationEventsInTimeRange(deviceId : DeviceId, startTime : Timestamp, endTime : Timestamp) : async [VibrationEvent] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access device data");
    };

    let events = switch (vibrationEventsMap.get(deviceId)) {
      case (null) { List.empty<VibrationEvent>() };
      case (?list) { list };
    };

    let ownedData = filterVibrationsByOwnership(caller, events);

    let filtered = ownedData.values().filter(
      func(e) {
        e.timestamp >= startTime and e.timestamp <= endTime
      }
    );

    filtered.toArray();
  };

  public shared ({ caller }) func generateSleepRecommendation(deviceId : DeviceId, analysisWindowStart : Timestamp, analysisWindowEnd : Timestamp) : async SleepRecommendation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate sleep recommendations");
    };

    // Verify caller has data for this device in the analysis window
    let measurements = switch (blinkRatesMap.get(deviceId)) {
      case (null) { List.empty<BlinkRateMeasurement>() };
      case (?list) { list };
    };

    let ownedData = filterByOwnership(caller, measurements);

    let relevantData = ownedData.values().filter(
      func(m) {
        m.timestamp >= analysisWindowStart and m.timestamp <= analysisWindowEnd
      }
    );

    let hasData = relevantData.size() > 0 or AccessControl.isAdmin(accessControlState, caller);

    // Check for blink summaries if no measurements are found
    if (not hasData) {
      let summaries = switch (blinkSummariesMap.get(deviceId)) {
        case (null) { List.empty<BlinkSummary>() };
        case (?list) { list };
      };

      let ownedSummaries = filterSummariesByOwnership(caller, summaries);

      let relevantSummaries = ownedSummaries.values().filter(
        func(s) {
          s.timestamp >= analysisWindowStart and s.timestamp <= analysisWindowEnd
        }
      );

      if (relevantSummaries.size() == 0) {
        Runtime.trap("Unauthorized: No data found for your device in the specified time range");
      };
    };

    // In a real implementation, you'd analyze blink rates, summaries, and vibration events here
    // For now, return a dummy recommendation

    {
      suggestedBedtime = analysisWindowStart + 8 * 3600 * 1000000000;
      suggestedWakeup = analysisWindowStart + 16 * 3600 * 1000000000;
      analysisWindowStart;
      analysisWindowEnd;
    };
  };

  public shared ({ caller }) func clearOldData(deviceId : DeviceId, thresholdTime : Timestamp) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can clear old data");
    };

    switch (blinkRatesMap.get(deviceId)) {
      case (?measurements) {
        let filtered = measurements.filter(
          func(measurement) {
            measurement.timestamp >= thresholdTime
          }
        );
        blinkRatesMap.add(deviceId, filtered);
      };
      case (null) {};
    };

    switch (vibrationEventsMap.get(deviceId)) {
      case (?events) {
        let filtered = events.filter(
          func(event) {
            event.timestamp >= thresholdTime
          }
        );
        vibrationEventsMap.add(deviceId, filtered);
      };
      case (null) {};
    };

    switch (blinkSummariesMap.get(deviceId)) {
      case (?summaries) {
        let filtered = summaries.filter(
          func(summary) {
            summary.timestamp >= thresholdTime
          }
        );
        blinkSummariesMap.add(deviceId, filtered);
      };
      case (null) {};
    };
  };
};
