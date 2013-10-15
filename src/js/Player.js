// A *very* naive simple player-patterns and notes, no effects...
var MACCHINA_Player = function(_samplingRate) {
	var samplingRate = _samplingRate, inverseSamplingRate = 1.0 / samplingRate,
		secondsPerRow, secondsPerTick,
		lastPlayedTime = 0,
		lastRowTime = 0,
		outBuffer = [];

	this.bpm = 100;
	this.linesPerBeat = 4;
	this.ticksPerLine = 12;
	this.currentRow = 0;
	this.currentOrder = 0;
	this.currentPattern = 0;
	this.repeat = false;

	this.voices = [];
	this.patterns = [];
	this.orderList = [];

	// So that we're able to dispatch events, DOM style
	EventTarget.call( this );

	this.updateRowTiming = function() {
		secondsPerRow = 60.0 / (this.linesPerBeat * this.bpm);
		secondsPerTick = secondsPerRow / this.ticksPerLine;
	}

	this.getBuffer = function(numSamples) {
		
		for(var i = 0; i < numSamples; i++) {
			outBuffer[i] = 0;
		}

		var samplesPerRow = (secondsPerRow * samplingRate + 0.5) >> 0,
			now = Date.now() / 1000,
			deltaTime = now - lastPlayedTime,
			deltaRowTime = now - lastRowTime,
			previousPattern = this.currentPattern,
			previousRow = this.currentRow;
		
		lastPlayedTime = now;

		if(deltaRowTime >= secondsPerRow) {
			// New row!
			var row = this.currentRow + 1,
				pattern = this.patterns[this.currentPattern],
				order = this.currentOrder;

			if(row == pattern.rows.length) {
				this.dispatchEvent({ type: 'patternFinished', order: order });
			}

			if(row >= pattern.rows.length) {
				// Next order! as we have finished with the current pattern
				// TODO this always loops - this.repeats is not honored
				order = ++order % this.orderList.length;

				this.dispatchEvent({ type: 'orderChanged', order: order });

				row = 0;
				patternNumber = this.orderList[order];
				pattern = this.patterns[patternNumber];
				this.currentPattern = patternNumber;
				this.dispatchEvent({ type: 'patternChanged', pattern: patternNumber });
			}
		
			this.dispatchEvent({ type: 'rowChanged', order: order, pattern: this.currentPattern, row: row, previousPattern: previousPattern, previousRow: previousRow });

			this.currentRow = row;
			this.currentOrder = order;

			// Fire all notes & etc in this row
			
			for(var i = 0, currentRow = pattern.rows[row]; i < currentRow.length; i++) {
				var cell = currentRow[i],
					voice = this.voices[i];

				// one track <-> one voice
				if(cell.noteOff) {
					voice.sendNoteOff();
				} else if(cell.note > -1) {
					voice.sendNoteOn(cell.note, cell.volume);
					// TODO dispatch note on event
					this.dispatchEvent({ type: 'noteOn', row: row, track: i, note: cell.note });
				}
			}

			lastRowTime = now;
		}


		for(var j = 0; j < this.voices.length; j++) {
			var tmpBuffer = this.voices[j].getBuffer(numSamples);

			for(var i = 0; i < numSamples; i++) {
				outBuffer[i] += tmpBuffer[i];
			}
		}

		return outBuffer;

	}

	this.setBPM = function(value){
		this.bpm = value;
		this.updateRowTiming();
	}

	this.getSecondsPerRow = function() {
		return secondsPerRow;
	}

	// Finishing constructor here
	this.updateRowTiming();
};

var MACCHINA_Player_Pattern_Cell = function() {
	this.note = -1;
	this.noteOff = false;
	this.volume = -1;

	this.reset = function() {
		this.note = -1;
		this.noteOff = false;
		this.volume = -1;
	}

	this.reset();
}

var MACCHINA_Player_Pattern = function(numRows, numTracks) {
	this.rows = [];

	for(var i = 0; i < numRows; i++) {
		var row = [];
		for(var j = 0; j < numTracks; j++) {
			row.push(new MACCHINA_Player_Pattern_Cell());
		}
		this.rows[i] = row;
	}
}
