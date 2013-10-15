var MACCHINA = (function() {
	var container, canvas, context, 
		aboutOverlay, aboutOverlayTimeout = null,
		synthPlayer, audioContext, jsAudioNode,
		selectedScale = null,
		playing = false,
		txtOrder,
		startTime,
		txtTime,
		txtRepeats,
		numRepeats = 0,
		scenesContainer, scenes = [],
		buttonsTable, buttons = [];

	function animate() {
		requestAnimationFrame( animate );
		TWEEN.update();

		context.clearRect(0, 0, canvas.width, canvas.height);

		var now = Date.now(),
			elapsed = now - startTime;

		for(var i = 0; i < scenes.length; i++) {
			scenes[i].update(now);
		}

		var formatted = Text.formatTime( elapsed * 0.001 );
		if(formatted != txtTime.innerHTML ) {
			txtTime.innerHTML = formatted;
		}
	
	}

	function audioProcess(event) {
		var buffer = event.outputBuffer,
			bufferLeft = buffer.getChannelData(0),
			bufferRight = buffer.getChannelData(1),
			numSamples = bufferLeft.length,
			synthOutputBuffer = [];

		if(playing) {
			synthOutputBuffer = synthPlayer.getBuffer(numSamples);
			for(var i = 0; i < synthOutputBuffer.length; i++) {
				bufferLeft[i] = synthOutputBuffer[i];
				bufferRight[i] = synthOutputBuffer[i];
			}
		}
	}

	function notifyReady() {
		var start = document.querySelector('#start');
		start.addEventListener('click', play, false);
		start.innerHTML = 'START';
	}

	function play() {
		var overlay = document.createElement('div');
		overlay.id = 'overlay';

		document.body.appendChild(overlay);
		var overlaySettings = { opacity: 0 };
		var fadeOutTween = new TWEEN.Tween ( overlaySettings )
				.to( { opacity: 0 } , 500)
				.onStart( function() {
					container.style.visibility = 'visible';
					container.appendChild(canvas);
					container.appendChild(txtOrder);
					container.appendChild(txtTime);
					container.appendChild(txtRepeats);
					container.appendChild(scenesContainer);
					container.appendChild(buttonsTable);
				})
				.onUpdate( function() {
					overlay.style.opacity = overlaySettings.opacity;
				})
				.onComplete( function() {
					document.body.removeChild(overlay);
					scenes.forEach(function(s) {
						s.show();
					});

				});

		new TWEEN.Tween( overlaySettings )
			.to( { opacity: 1 }, 500 )
			.onUpdate( function() {
				overlay.style.opacity = overlaySettings.opacity;
			})
			.chain( fadeOutTween )
			.start();

		//
		aboutOverlay = document.getElementById('about');
		window.addEventListener('mousemove', function(e) {
			aboutOverlay.className = 'visible';

			if(aboutOverlayTimeout !== null) {
				window.clearTimeout(aboutOverlayTimeout);
			}

			aboutOverlayTimeout = window.setTimeout(function() {
				aboutOverlay.className = '';
			}, 10000);
		}, false);

		var randomise = document.getElementById('randomise');
		randomise.addEventListener('click', function(e) {
			globalScale = scales[ (Math.random() * scales.length) >> 0 ];
			randomisePatterns(synthPlayer.patterns, globalScale);
			updateButtonsTable(synthPlayer.patterns[synthPlayer.orderList[synthPlayer.currentOrder]]);

			e.preventDefault();
			return false;
		}, false);
		
		
		
		animate();

		playing = true;
		startTime = Date.now();
	}

	function noteNumberToText(noteNumber) {
		var notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
			key = notes[noteNumber % 12],
			octave = (noteNumber / 12) >> 0;

		if(key.length == 1) {
			key += '-';
		}

		key = key + octave;

		return key;

	}

	function updateButtonsTable(pattern) {
		for(var i = 0; i < pattern.rows.length; i++) {
			var r = pattern.rows[i];

			for(var j = 0; j < r.length; j++) {
				var cell = r[j],
					input = buttons[i][j];
				if(cell.note > -1) {
					input.className = 'active';
					input.value = noteNumberToText(cell.note);
				} else {
					input.className = '';
					if(cell.noteOff) {
						input.value = '===';
					} else {
						input.value = '.';
					}
				}
				
			}
		}
	}

	// Pattern randomisation
	var noteMap = {
		'C': 48,
		'C#': 49,
		'Db': 49,
		'D': 50,
		'D#': 51,
		'Eb': 52,
		'E': 52,
		'F': 53,
		'F#': 54,
		'Gb': 54,
		'G': 55,
		'G#': 56,
		'Ab': 56,
		'A': 57,
		'A#': 58,
		'Bb': 58,
		'B': 59
	};

	var scales = [
		[ 'C', 'D', 'E', 'G', 'A' ], // Major pentatonic
		[ 'Gb', 'Ab', 'Bb', 'Db', 'Eb' ], // Major pentatonic 2
		[ 'C', 'Eb', 'F', 'G', 'Bb' ], // Minor pentatonic
		[ 'Ab', 'Bb', 'Db', 'Eb', 'Gb', 'Ab' ], // Minor pentatonic egyptian suspended
		[ 'A', 'B', 'C', 'D', 'E', 'F#', 'G#'], // heptonia secunda
		[ 'C', 'Db', 'E', 'F', 'G', 'Ab', 'B'], // C Arabic
		[ 'A', 'B', 'C', 'D', 'E', 'F', 'G#'], // harmonic minor
	];

	function randomNote(scale) {
		return noteMap[ scale[ (Math.random() * scale.length) >> 0 ] ];
	}

	function randomisePatterns(patterns, scale) {

		var scaleNotes = [],
			columnNotes = [],
			minNote = noteMap['C'],
			maxNote = noteMap['B'],
			interval = maxNote - minNote;

		scale.forEach(function(noteName) {
			scaleNotes.push( noteMap[noteName] );
		});

		for(var i = 0; i < 8; i++) {
			columnNotes.push(null);
		}

		for(var i = 0; i < patterns.length; i++) {
			
			var pattern = patterns[i];

			for(var j = 0; j < pattern.rows.length; j++) {
				
				var row = pattern.rows[j],
					rowNotes = [];

				for(var k = 0; k < row.length; k++) {

					var cell = row[k],
						previousCell = columnNotes[k],
						note,
						attempts = 0,
						maxAttempts = 3,
						maxNotes;

					cell.reset();

					if(j % 4 == 0) {
						maxNotes = 3;
					} else {
						maxNotes = 1;
					}

					if(Math.random() > 0.7) {
						if(rowNotes.length < maxNotes) {
							note = randomNote(scale);
							if(rowNotes.indexOf(note) === -1) {
								cell.note = note;
								cell.volume = 0.1 + (0.4 - 0.2 * (note - minNote) / interval ) * Math.random();
								cell.noteOff = false;
								rowNotes.push(note);
							}
						}
					} else if(Math.random() > 0.5) {
						if(j == 0 || (j > 0 && !pattern.rows[j-1][k].noteOff)) {
							cell.note = -1;
							cell.noteOff = true;
						}
					}
				}
			}

		}

	}

	// ~~~
	
	this.init = function() {
	
		if(!AudioDetector.detects(['webAudioSupport', 'oggSupport'])) {
			return;
		}

		container = document.createElement('div');
		container.id = 'container';
		container.style.visibility = 'hidden';
		document.body.appendChild(container);

		canvas = document.createElement('canvas');
		context = canvas.getContext('2d');

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		txtOrder = document.createElement('div');
		txtOrder.id = 'order';
		txtOrder.style.fontSize = window.innerHeight + 'px';
		txtOrder.style.lineHeight = ((window.innerHeight * 0.8) >> 0) + 'px';

		txtTime = document.createElement('div');
		txtTime.innerHTML = '';
		txtTime.id = 'time';
		txtTime.style.fontSize = (window.innerHeight >> 2) + 'px';

		txtRepeats = document.createElement('div');
		txtRepeats.id = 'repeats';
		txtRepeats.style.fontSize = (window.innerHeight >> 1) + 'px';
		txtRepeats.style.lineHeight = ((window.innerHeight * 0.4) >> 0) + 'px';
		txtRepeats.innerHTML = '_1';

		scenesContainer = document.createElement('div');
		var s1 = new MACCHINA_Scene01(canvas, { colors: MACCHINA_Colors.saturated });
		scenes.push( s1 );
		for(var i = 0; i < scenes.length; i++) {
			scenes[i].init();
		}
		
		buttonsTable = document.createElement('table'),
			cellWidth = (window.innerWidth / 8) >> 0,
			cellHeight = (window.innerHeight / 8) >> 0;
		
		buttonsTable.id = 'buttonsTable';
		
		for(var i = 0; i < 8; i++) {
			buttons[i] = [];
			var tr = document.createElement('tr');
			for(var j = 0; j < 8; j++) {
				var td = document.createElement('td'),
					input = document.createElement('input');

				input.type = 'text';
				input.disabled = true;

				td.appendChild(input);

				td.style.width = cellWidth + 'px';
				td.style.height = cellHeight + 'px';
				tr.appendChild(td);

				buttons[i][j] = input;
			}

			buttonsTable.appendChild(tr);
		}

		// Audio setup
		audioContext = new AudioContext();

		var convolverNode = audioContext.createConvolver(),
			preCompressorGainNode = audioContext.createGain(),
			compressorNode = audioContext.createDynamicsCompressor();

		compressorNode.threshold.value = -5;

		preCompressorGainNode.gain.value = 0.8;
		preCompressorGainNode.connect(compressorNode);
		compressorNode.connect(audioContext.destination);

		jsAudioNode = audioContext.createScriptProcessor(4096);
		jsAudioNode.onaudioprocess = audioProcess;

		synthPlayer = new MACCHINA_Player(audioContext.sampleRate);
		synthPlayer.repeat = true;

		// Totally invent instruments
		for(var i = 0; i < 8; i++) {
			var voice = new SOROLLET.Voice();
			
			voice.setNoiseAmount(0);
			voice.setVolume1(Math.random() * 0.7);
			voice.setVolume2(Math.random() * 0.7);
			voice.setWave1( (Math.random() * 3) >> 0 );
			voice.setWave2( (Math.random() * 3) >> 0 );
			var octave =  (2 + i/3) >> 0;
			voice.setOctave1( octave );
			voice.setOctave2( octave + 1 );

			voice.getAmpADSR().setAttack(0.1);
			voice.getAmpADSR().setDecay(0.2);
			voice.getAmpADSR().setSustainLevel(0.4 - i*0.05);
			voice.getAmpADSR().setRelease(0);

			synthPlayer.voices.push(voice);
		}

		// Invent patterns
		for(var i = 0; i < 8; i++) {
			var pattern = new MACCHINA_Player_Pattern(8, 8);
			synthPlayer.patterns.push(pattern);
			synthPlayer.orderList.push(i);
		}
		globalScale = scales[ (Math.random() * scales.length) >> 0 ];

		randomisePatterns(synthPlayer.patterns, globalScale);
		txtOrder.innerHTML = synthPlayer.orderList[0];
		updateButtonsTable(synthPlayer.patterns[synthPlayer.orderList[0]]);

		synthPlayer.setBPM(40);

		synthPlayer.addEventListener('orderChanged', function(event) {
			var patternNumber = synthPlayer.orderList[event.order],
				pattern = synthPlayer.patterns[patternNumber];

			updateButtonsTable(pattern);
			txtOrder.innerHTML = (patternNumber + 1);

			txtRepeats.innerHTML = "_" + (numRepeats + 1);

		}, false);

		synthPlayer.addEventListener('patternFinished', function(event) {
			if(event.order + 1 == synthPlayer.orderList.length) {
				
				if((numRepeats+1) % 8 == 0) {
					numRepeats = 0;
					randomisePatterns(synthPlayer.patterns, globalScale);
				} else {
					numRepeats++;
				}

			}
		}, false);

		synthPlayer.addEventListener('rowChanged', function(event) {
			for(var i = 0; i < buttonsTable.rows.length; i++) {
				var row = buttonsTable.rows[i];
				if(i == event.row) {
					row.className = 'active';
				} else {
					row.className = '';
				}
			}
			
			var pattern = synthPlayer.patterns[event.pattern],
				row = pattern.rows[event.row],
				previousPattern = synthPlayer.patterns[event.previousPattern],
				previousRow = previousPattern.rows[event.previousRow],
				values = [],
				minNote = 48,
				maxNote = 59,
				interval = maxNote - minNote;

			for(var i = 0; i < row.length; i++) {
				var cell = row[i],
					previousCell = previousRow[i],
					note = null,
					height = 0.1,
					shrink = false,
					ignore = true;

				if(cell.noteOff) {
					if(!previousCell.noteOff) {
						// shrink the rectangle height but do not move from where it is
						shrink = true;
						ignore = false;
					}
				}
				else if(cell.note > 0) {
					if(previousCell.note != cell.note) {
						// move -> map note to vertical position and volume to height
						note = (cell.note - minNote) / (interval + 1);
						height = cell.volume;
						ignore = false;
					}
				}

				values.push( { note: note, height: height, shrink: shrink, ignore: ignore } );
			}

			s1.setStripesTo(values, synthPlayer.getSecondsPerRow() * 1000 );

		}, false);

		

		// Loading convolver response asynchronously
		var request = new XMLHttpRequest();
		request.open('GET', 'ogg/wildecho.ogg', true);
		request.responseType = 'arraybuffer';

		request.onload = function() {
			audioContext.decodeAudioData( request.response, 
				function(buffer) {
					convolverNode.buffer = buffer;

					jsAudioNode.connect( convolverNode );
					
					convolverNode.connect( preCompressorGainNode );

					notifyReady();
				},
				function(err) {
					// onError
					console.log('errorrrr', err);
				}
			);
		};
		request.send();
	};

	return this;
})();

