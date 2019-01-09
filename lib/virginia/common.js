define( function(){

	var Common = {

		escape_html: function(unsafe) {
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
		},

		money: function(number, options) {
			var result;

			if(options.rate) {
				number = number * options.rate;
			}

			result = Math.abs(number).toFixed(3).replace(/\d$/,'');

			if(options.thousands_separator) {
				result = result.replace(/(\d)(?=(\d{3})+(\.|$))/g, "$1" + options.thousands_separator);
			}

			if(options.currency) {
				if(options.currency_position === 'left') {
					result = options.currency + result;
				} else {
					result = result + options.currency;
				}
			}

			if(number < 0) {
				result = '-' + result;
			}

			return result;
		}

	};

	return Common;

});