var MACCHINA_Scene01 = function(canvas, options) {

	MACCHINA_Scene.call(this);

	options = options || {};

	var dstCanvas = canvas,
		dstContext = dstCanvas.getContext('2d'),
		stripes = [],
		colors = options.colors || [ '#000000', '#ff0000', '#00ff00' ],
		num = options.num || 8,
		tweenLength = options.tweenLength || 2500,
		tweenDelayMax = options.tweenDelayMax || 250;

	this.init = function() {

		for(var i = 0; i < num; i++) {

			var y1 = Math.random(),
				y2 = Math.random(),
				height1 = (1 - y1) * Math.random(),
				height2 = Math.random(),
				obj = {
					x: i * 1.0 / num,
					y: y1,
					y1: y1,
					y2: y2,
					width: 1.0 / num,
					height1: height1,
					height2: height2,
					height: height1,
					color: i % 2 == 0 ? colors[0] : colors[ 1 + i % (colors.length-1) ]
				};

				obj.tween = new TWEEN.Tween(obj).to( {
					y: y2,
					height: height2,
				}, tweenLength)
				//.delay( tweenDelayMax * Math.random() )
				.easing( TWEEN.Easing.Cubic.InOut );

				obj.tweenBack = new TWEEN.Tween(obj).to( {
					y: y1,
					height: height1
				}, tweenLength)
				//.delay( tweenDelayMax * Math.random() )
				.easing( TWEEN.Easing.Cubic.InOut );

				//obj.tween.chain(obj.tweenBack);
				//obj.tweenBack.chain(obj.tween);
				
				/*obj.tween.onComplete(function() {
					this.tweenBack.to({ y: Math.random(), height: Math.random() }, tweenLength);
				});

				obj.tweenBack.onComplete(function() {
					//console.log('complete', this);
					this.tween.to({ y: Math.random(), height: Math.random() }, tweenLength).delay(Math.random() * 100);
					//this.tween.to({ y: 0, height: 1}, tweenLength);
				});*/

			stripes.push(obj);
		}
	}

	this.show = function() {
		for(var i = 0; i < num; i++) {
			stripes[i].tween.start();
		}
	}

	this.hide = function() {
		for(var i = 0; i < num; i++) {
			stripes[i].tween.stop();
			stripes[i].tweenBack.stop();
		}
	}

	this.update = function(time) {
		var w = dstCanvas.width,
			h = dstCanvas.height;

		for( var i = 0; i < num; i++ ) {
			var o = stripes[i],
				x = o.x * w,
				width = o.width * w,
				y = o.y * h,
				height = o.height * h;

			if(o.height == 0) {
				continue;
			}

			dstContext.fillStyle = o.color;
			dstContext.fillRect(x, y, width, height);

		}
	}
	
	this.setTweenLength = function(value) {
		tweenLength = value;
	}

	this.setStripesTo = function(values, _tweenLength) {
		tweenLength = _tweenLength;

		for(var i = 0; i < values.length; i++) {
			var stripe = stripes[i],
				value = values[i],
				noteValue = value.note,
				heightValue = value.height,
				ignore = value.ignore,
				shrink = value.shrink;

			if(ignore) {
				// Stop it right here, right now
				stripe.tween.stop();
				continue;
			}

			if(shrink) {
				noteValue = stripe.y + stripe.height / 2;
				heightValue = 0;
			}

			stripe.tween.stop();
			stripe.tween.to({y: noteValue, height: heightValue }, _tweenLength);
			stripe.y1 = stripe.y; // from
			stripe.y2 = noteValue; // to
			stripe.tween.start();
		}
	}
}
