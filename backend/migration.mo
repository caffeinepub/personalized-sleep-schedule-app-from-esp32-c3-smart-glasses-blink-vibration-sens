module {
  type OldActor = {};
  type NewActor = { var lastEyeClosedTimestamp : ?Int; var mostRecentActuationLatency : ?Int };

  public func run(old : OldActor) : NewActor {
    { var lastEyeClosedTimestamp = null; var mostRecentActuationLatency = null };
  };
};
