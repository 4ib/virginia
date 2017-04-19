define( function(){

	var Common = {

		escape_html: function (unsafe) {
			if (!unsafe){
				return unsafe;
			}

			return unsafe.replace(/[&<"']/g, function(m) {
				switch (m) {
					case '&':
						return '&amp;';
					case '<':
						return '&lt;';
					case '"':
						return '&quot;';
					default:
						return '&#039;';
				}
			});
		},

		break_lines: function(s) {
			if (s) {
				return s.replace(/(?:\r\n|\r|\n)/g, '<br />')
			}
			return s;
		}

	};

	return Common;

});