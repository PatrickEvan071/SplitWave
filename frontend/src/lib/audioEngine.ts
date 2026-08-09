import * as Tone from 'tone';

// ==========================================
// GLOBAL AUDIO GRAPH (THE MASTER BUS)
// ==========================================
export const masterBus = new Tone.Gain(1);
export const masterPitchShift = new Tone.PitchShift(0);

masterBus.connect(masterPitchShift);
masterPitchShift.toDestination();