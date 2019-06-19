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
			var opts_default = {
				currency: '$',
				currency_position: 'left',
				thousands_separator: ',',
				rate: ''
			}
			var opts = options;

			if( window.SiteSettings && window.SiteSettings.Currency ) {
				opts_default = window.SiteSettings.Currency;
			}

			opts = _.mapObject( opts, function( val, key ) {
				if( _.isNull(val) ) {
					return opts_default[key];
				}
			} );

			if(opts.rate && opts.rate.length) {
				number = number * parseFloat(opts.rate);
			}

			result = Math.abs(number).toFixed(3).replace(/\d$/,'');

			if(opts.thousands_separator) {
				result = result.replace(/(\d)(?=(\d{3})+(\.|$))/g, "$1" + opts.thousands_separator);
			}

			if(opts.currency) {
				if(opts.currency_position === 'left') {
					result = opts.currency + result;
				} else {
					result = result + '\xa0' + opts.currency;
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