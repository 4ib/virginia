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

		format_money: function(number, options) {
			var result;

			if(options.multiplier && options.multiplier.length) {
				number = number * parseFloat(options.multiplier);
			}

			if(options.rate && options.rate.length) {
				number = parseFloat( number / parseFloat(options.rate) ).toFixed(2);
			}

			result = Math.abs(number).toFixed(3).replace(/\d$/,'');

			if(options.thousands_separator) {
				result = result.replace(/(\d)(?=(\d{3})+(\.|$))/g, "$1" + options.thousands_separator);
			}

			if(options.currency) {
				if(options.currency_position === 'left') {
					result = options.currency + result;
				} else {
					result = result + '\xa0' + options.currency;
				}
			}

			if(number < 0) {
				result = '-' + result;
			}
			return result;
		},

		money: function(number, options) {
			var result;
			var exchange;
			var opts_default = {
				currency: '$',
				currency_position: 'left',
				thousands_separator: ',',
				multiplier: '',
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

			result = this.format_money(number, opts);

			if( window.SiteSettings && window.SiteSettings.CurrencyExchange ) {
				exchange = this.format_money(number, window.SiteSettings.CurrencyExchange);
				result += '\xa0\/ ' + exchange;
			}

			return result;
		}

	};

	return Common;

});