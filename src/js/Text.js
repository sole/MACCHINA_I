var Text = {
	formatTime : function(t) {
		var rem;
		var h = Math.floor(t / 3600.0);
		rem = t - h * 3600;
		var m = Math.floor(rem / 60.0);
		rem = rem - m * 60;
		var s = Math.floor(rem);
		var ms = Math.round((rem - s) * 1000);

		return Text.padNumber(h, 2) + ":" + Text.padNumber(m, 2) + ":" + Text.padNumber(s, 2) ; // + ":" + Text.padNumber(ms, 3);
	},

	padNumber : function(v, amount) {
		v = String(v);
		var s;
		if(v.length < amount) {
			var diff = amount - v.length;
			s = '';
			for(var i = 0; i < diff; i++) {
				s += '0';
			}
			s += v;
			return s;
		}
		return v;
	}
}
