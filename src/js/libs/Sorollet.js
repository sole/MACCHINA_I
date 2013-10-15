// sorollet.js - http://github.com/sole/sorollet.js
var SOROLLET = SOROLLET || { 
	REVISION: '1',
	NOTE_NULL: -1
};
SOROLLET.Math = {

	randSeed : 1,

	normalize: function(value, minimum, maximum) {
		return (value - minimum) / (maximum - minimum);
	},

	interpolate: function(normValue, minimum, maximum) {
		return minimum + (maximum - minimum) * normValue;
	},

	map: function(value, in_min, in_max, out_min, out_max) {

		if(in_min == in_max) {
			return out_min;
		}

		return out_min + (out_max - out_min) * (value - in_min) / (in_max - in_min);
	},

	randf : function() {
		this.randSeed *= 16807;
		return (this.randSeed) / 0x80000000;
	},

	clip: function(value, minV, maxV) {
		return Math.max(Math.min(value, maxV), minV);
	}

}
SOROLLET.Voice = function() {
	var samplingRate = 44100,
		inverseSamplingRate = 1 / samplingRate,
		internalSamplePosition = 0,
		position = 0,
		currentNote = 0,
		currentVolume = 0,
		buffer = [],
		wave1Function = getSineBuffer,
		wave1Octave = 5,
		wave1Volume = 0.5,
		wave1Phase = 0,
		wave2Function = getSquareBuffer,
		wave2Octave = 4,
		wave2Volume = 0.5,
		wave2Phase = 0,
		waveMixType = SOROLLET.WaveMixType.add,
		waveMixFunction = mixAdd,
		noiseAmount = 0.5,
		noiseMixFunction = noiseAdd,
		ampADSR = new SOROLLET.ADSR(0, 0, 0.8, 0, 1),
		pitchADSR = new SOROLLET.ADSR(0, 0, 0.5, 0, 1);

	ampADSR.setAcceptableMinMaxValues(0, 0.66);
	pitchADSR.setAcceptableMinMaxValues(-48, 48);
	pitchADSR.setMinValue(0);
	pitchADSR.setMaxValue(1);

	function noteToFrequency(note, octave) {
		return 440.0 * Math.pow(2, ((note - 57.0 + (octave - 4.0) * 12.0) / 12.0));
	}

	function zeroBuffer(buffer, numSamples) {
		for(var i = 0; i < numSamples; i++) {
			buffer[i] = 0;
		}
	}

	function getTime() {
		return internalSamplePosition * inverseSamplingRate;
	}

	function getSineBuffer(buffer, numSamples, pos, frequency, phase) {
		var value,
			cst = 2.0 * Math.PI * frequency * inverseSamplingRate;

		for(var i = 0; i < numSamples; ++i) {
			value = Math.sin(cst * pos + phase);
			buffer[i] = value;

			pos++;
		}
	}

	function getTriangleBuffer(buffer, numSamples, pos, frequency, phase) {
		var period = 1.0 / frequency,
			semiperiod = period * 0.5,
			value,
			ft = semiperiod * 0.5;

		for(var i = 0; i < numSamples; ++i) {
			var t = (i + pos + phase) * inverseSamplingRate + ft;

			if(t % period < semiperiod) {
				value = 2.0 * ((t % semiperiod) / semiperiod) - 1.0;
			} else {
				value = 1.0 - 2.0 * (t % semiperiod) / semiperiod;
			}

			buffer[i] = value;
		}
	}

	function getSquareBuffer(buffer, numSamples, pos, frequency, phase) {
		var period = 1.0 / frequency,
			halfPeriod = period * 0.5,
			value;

		for(var i = 0; i < numSamples; i++) {
			var t = (i + pos + phase) * inverseSamplingRate;

			if(t % period < halfPeriod) {
				value = 1.0;
			} else {
				value = -1.0;
			}

			buffer[i] = value;
		}
	}

	function getSawtoothBuffer(buffer, numSamples, pos, frequency, phase) {
		var period = 1.0 / frequency,
			value;

		for(var i = 0; i < numSamples; i++) {
			var t = (pos + phase) * inverseSamplingRate;

			value = 2.0 * ((t % period) * frequency) - 1.0;

			buffer[i] = value;

			pos++;
		}
	}

	function waveTypeToFunction(waveType) {
		switch(waveType) {
			case SOROLLET.WaveMap.triangle:
				return getTriangleBuffer;
			case SOROLLET.WaveMap.square:
				return getSquareBuffer;
			case SOROLLET.WaveMap.sawtooth:
				return getSawtoothBuffer;
			case SOROLLET.WaveMap.sine:
			default:
				return getSineBuffer;
		}
	}

	function waveFunctionToType(waveFunction) {
		var map = {
			getTriangleBuffer: 'triangle',
			getSquareBuffer: 'square',
			getSawtoothBuffer: 'sawtooth',
			getSineBuffer: 'sine'
		};

		return map[waveFunction.name];
	}

	function mixAdd(v1, v2) {
		return v1 + v2;
	}

	function mixSubstract(v1, v2) {
		return v1 - v2;
	}

	function mixMultiply(v1, v2) {
		return v1 * v2;
	}

	function mixDivide(v1, v2) {
		if(v2 == 0) {
			v2 = 0.0001;
		}

		return v1 / v2;
	}

	function waveMixTypeToFunction(mix) {
		switch(mix) {
			case SOROLLET.WaveMixType.add:
				return mixAdd;
			case SOROLLET.WaveMixType.substract:
				return mixSubstract;
			case SOROLLET.WaveMixType.multiply:
				return mixMultiply;
			case SOROLLET.WaveMixType.divide:
				return mixDivide;
		}
	}

	function noiseAdd(noiseValue, waveValue, notNoiseAmount) {
		return noiseValue + waveValue;
	}

	function noiseMix(noiseValue, waveValue, notNoiseAmount) {
		return waveValue * notNoiseAmount + noiseValue;
	}

	function noiseMultiply(noiseValue, waveValue, notNoiseAmount) {
		return noiseValue * waveValue;
	}
	
	function getNoiseBuffer(buffer, numSamples) {
		for(var i = 0; i < numSamples; i++) {
			buffer[i] = Math.random() * 2 - 1; 
		}
	}

	function noiseMixTypeToFunction(type) {
		switch(type) {
			case SOROLLET.NoiseMixType.add:
				return noiseAdd;
			case SOROLLET.NoiseMixType.mix:
				return noiseMix;
			case SOROLLET.NoiseMixType.multiply:
				return noiseMultiply;
		}
	}

	// ~~~ public methods ~~~

	this.setSamplingRate = function(value) {
		samplingRate = value;
		inverseSamplingRate = 1.0 / value;
	}

	this.setWave1 = function(waveType) {
		wave1Function = waveTypeToFunction(waveType);
	}

	this.getWave1Type = function() {
		return waveFunctionToType(wave1Function);
	}

	this.setVolume1 = function(value) {
		wave1Volume = value;
	}

	this.getVolume1 = function() {
		return wave1Volume;
	}

	this.setOctave1 = function(value) {
		wave1Octave = value;
	}

	this.getOctave1 = function() {
		return wave1Octave;
	}

	this.setPhase1 = function(value) {
		wave1Phase = value;
	}

	this.getPhase1 = function() {
		return wave1Phase;
	}
	
	this.setWave2 = function(waveType) {
		wave2Function = waveTypeToFunction(waveType);
	}

	this.getWave2Type = function() {
		return waveFunctionToType(wave2Function);
	}

	this.setVolume2 = function(value) {
		wave2Volume = value;
	}

	this.getVolume2 = function() {
		return wave2Volume;
	}

	this.setOctave2 = function(value) {
		wave2Octave = value;
	}

	this.getOctave2 = function() {
		return wave2Octave;
	}

	this.setPhase2 = function(value) {
		wave2Phase = value;
	}

	this.getPhase2 = function() {
		return wave2Phase;
	}
	
	this.setWaveMixType = function(value) {
		waveMixFunction = waveMixTypeToFunction(value);
	}

	this.setNoiseAmount = function(value) {
		noiseAmount = value;
	}

	this.setNoiseMixType = function(value) {
		noiseMixFunction = noiseMixTypeToFunction(value);
	}
	
	this.sendNoteOn = function(note, volume) {
		position = 0;
		currentNote = note;
		currentVolume = volume;
		var t = getTime();
		ampADSR.beginAttack(t);
		pitchADSR.beginAttack(t);
	}

	this.sendNoteOff = function() {
		var t = getTime();
		ampADSR.beginRelease(t);
		pitchADSR.beginRelease(t);
	}

	this.getAmpADSR = function() {
		return ampADSR;
	}

	this.getPitchADSR = function() {
		return pitchADSR;
	}

	this.getBuffer = function(numSamples) {
		
		var wave1Buffer = [],
			wave2Buffer = [],
			noiseBuffer = [],
			notNoiseAmount = 1 - noiseAmount,
			bufferPitch1 = [],
			bufferPitch2 = [],
			bufferAmp = [],
			tmpBuffer = [],
			currentTime = getTime();

		zeroBuffer(buffer, numSamples);

		if(ampADSR.getState() == SOROLLET.ADSR_States.done) {
			currentNote = SOROLLET.NOTE_NULL;
			return buffer;
		}

		if(currentNote <= 0) {
			return buffer;
		}

		zeroBuffer(wave1Buffer, numSamples);
		zeroBuffer(wave2Buffer, numSamples);
		zeroBuffer(noiseBuffer, numSamples);
		zeroBuffer(bufferPitch1, numSamples);
		zeroBuffer(bufferPitch2, numSamples);
		zeroBuffer(bufferAmp, numSamples);

		// Fill the amp and pitch buffers for this run
		var bufferTime = currentTime;

		for (var i = 0; i < numSamples; i++) {
			var pitchEnv = pitchADSR.update(bufferTime);
			bufferPitch1[i] = noteToFrequency(currentNote + pitchEnv, wave1Octave);
			bufferPitch2[i] = noteToFrequency(currentNote + pitchEnv, wave2Octave);
			bufferAmp[i] = ampADSR.update(bufferTime);
			bufferTime += inverseSamplingRate;
		}


		if(wave1Volume > 0) {
			var pos = position;
			
			for(var i = 0; i < numSamples; i++) {
				var frequency = bufferPitch1[i];
				wave1Function(tmpBuffer, 1, pos, frequency, wave1Phase);
				wave1Buffer[i] = tmpBuffer[0];
				pos++;
			}
		}

		if(wave2Volume > 0) {
			var pos = position;

			for(var i = 0; i < numSamples; i++) {
				var frequency = bufferPitch2[i];
				wave2Function(tmpBuffer, 1, pos, frequency, wave2Phase);
				wave2Buffer[i] = tmpBuffer[0];
				pos++;
			}
		}

		if(noiseAmount > 0) {
			getNoiseBuffer(noiseBuffer, numSamples);
		}

		for(var i = 0; i < numSamples; i++) {
			var osc1 = wave1Buffer[i] * wave1Volume,
				osc2 = wave2Buffer[i] * wave2Volume;

			buffer[i] = waveMixFunction(osc1, osc2);

			if(noiseAmount > 0) {
				var noiseValue = noiseBuffer[i] * noiseAmount;
				buffer[i] = noiseMixFunction(noiseValue, buffer[i], notNoiseAmount);
			}

			// Apply amp envelope
			buffer[i] *= bufferAmp[i];

			// Clamp
			buffer[i] = SOROLLET.Math.clip(buffer[i], -1, 1);//Math.max(-1, Math.min(1, buffer[i]));
		}

		position += numSamples;
		internalSamplePosition += numSamples;

		return buffer;
	};

	this.getNote = function() {
		return currentNote;
	}
}


SOROLLET.WaveMap = {
	sine: 0,
	triangle: 1,
	square: 2,
	sawtooth: 3
}

SOROLLET.WaveMixType = {
	add: 0,
	substract: 1,
	multiply: 2,
	divide: 3
}

SOROLLET.NoiseMixType = {
	add: 0,
	mix: 1,
	multiply: 2
}
SOROLLET.ADSR = function(attackT, decayT, sustainL, releaseT, timeS) {
	var state = SOROLLET.ADSR_States.attack,
		baseAttack,
		startTime,
		attackTime,
		attackEndTime,
		baseDecay,
		decayTime,
		decayEndTime,
		sustainLevel,
		baseRelease,
		releaseTime,
		releaseStartTime,
		releaseEndTime,
		timeScale,
		minValue = -1,
		realMinValue = 0,
		maxValue = 1,
		realMaxValue = 1,
		acceptableMinValue = -1,
		acceptableMaxValue = 1,
		value = 0;

	function updateRealValues() {
		realMinValue = SOROLLET.Math.map(minValue, 0, 1, acceptableMinValue, acceptableMaxValue);
		realMaxValue = SOROLLET.Math.map(maxValue, 0, 1, acceptableMinValue, acceptableMaxValue);

	}

	this.setAttack = function(value) {
		baseAttack = value;
		attackTime = baseAttack * timeScale;
	}

	this.setDecay = function(value) {
		baseDecay = value;
		decayTime = baseDecay * timeScale;
		decayEndTime = attackEndTime + decayTime;
	}

	this.setSustainLevel = function(value) {
		sustainLevel = value;
	}

	this.setRelease = function(value) {
		baseRelease = value;
		releaseTime = baseRelease * timeScale;
		releaseEndTime = releaseStartTime + releaseTime;
	}

	this.setTimeScale = function(scale) {
		timeScale = scale;
		attackTime = baseAttack * timeScale;
		decayTime = baseDecay * timeScale;
		releaseTime = baseRelease * timeScale;
	}

	this.setMinValue = function(value) {
		minValue = value;
		updateRealValues();
	}

	this.setMaxValue = function(value) {
		maxValue = value;
		updateRealValues();
	}

	this.setAcceptableMinMaxValues = function(minV, maxV) {
		acceptableMinValue = minV;
		acceptableMaxValue = maxV;
		updateRealValues();
	}

	this.getState = function() {
		return state;
	}

	this.beginAttack = function(t) {
		state = SOROLLET.ADSR_States.attack;
		startTime = t;
		attackEndTime = startTime + attackTime;
		decayEndTime = attackEndTime + decayTime;
		value = realMinValue;
	}

	this.beginRelease = function(t) {
		/*if(state == SOROLLET.ADSR_States.done) {
			return;
		}*/
		
		state = SOROLLET.ADSR_States.release;
		releaseStartTime = t;
		releaseEndTime = t + releaseTime;
		
	}

	this.update = function(t) {
		var realSustainLevel;

		if(state != SOROLLET.ADSR_States.attack || state != SOROLLET.ADSR_States.done) {
			realSustainLevel = SOROLLET.Math.map(sustainLevel, 0, 1, realMinValue, realMaxValue);
		}

		// Update state ~~~
		// Note how we don't switch to release here because that only happens
		// when we get a key_off/release event
		// (and the change is triggered outside this class)
		if((state == SOROLLET.ADSR_States.attack) && (t >= attackEndTime)) {
			state = SOROLLET.ADSR_States.decay;
		} else if((state == SOROLLET.ADSR_States.decay) && (t >= decayEndTime)) {
			state = SOROLLET.ADSR_States.sustain;
		} else if((state == SOROLLET.ADSR_States.release) && (t >= releaseEndTime)) {
			state = SOROLLET.ADSR_States.done;
		}

		// and calculate the value
		switch(state) {
			case SOROLLET.ADSR_States.attack:
				value = SOROLLET.Math.map(t, startTime, attackEndTime, realMinValue, realMaxValue);
				break;

			case SOROLLET.ADSR_States.decay:
				value = SOROLLET.Math.map(t, attackEndTime, decayEndTime, realMaxValue, realSustainLevel);
				break;

			case SOROLLET.ADSR_States.sustain:
				value = realSustainLevel;
				break;

			case SOROLLET.ADSR_States.release:
				value = SOROLLET.Math.map(t, releaseStartTime, releaseEndTime, realSustainLevel, realMinValue);
				break;

			case SOROLLET.ADSR_States.done:
				value = realMinValue;
				break;
		}

		return value;

	}

	this.getValue = function() {
		return value;
	}

	this.getState = function() {
		return state;
	}

	// continuing 'constructor' tasks here
	this.setTimeScale(timeS);
	this.setAttack(attackT);
	this.setDecay(decayT);
	this.setSustainLevel(sustainL);
	this.setRelease(releaseT);
	this.setMinValue(0);
	this.setMaxValue(1);
}

SOROLLET.ADSR_States = {
	attack: 0,
	decay: 1,
	sustain: 2,
	release: 3,
	done: 4
};
	

