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
				return s.replace(/(?:\r\n|\r|\n)/g, '<br />');
			}
			return s;
		},

		format_money: function(number, options) {
			var result;

			if(options.decimals && typeof options.decimals === 'string') {
				options.decimals = parseInt(options.decimals);
			}

			if(options.multiplier && options.multiplier.length) {
				number = number * parseFloat(options.multiplier);
			}

			if(options.rate && options.rate.length) {
				number = parseFloat( number / parseFloat(options.rate) ).toFixed(options.decimals);
			}

			result = Math.abs(number).toFixed(options.decimals);

			if(options.trim_zero_cents && options.trim_zero_cents !== 'false') {
				result = parseFloat(result).toString();
			}

			if(options.thousands_separator) {
				result = result.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + options.thousands_separator);
			}

			if (result.indexOf('.') >= 0 && result.indexOf(',') > result.indexOf('.')) {
				result = result.replace(/,/g, '');
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
				rate: '',
				decimals: 3
			};
			var opts = options;

			if( window.SiteSettings && window.SiteSettings.Currency ) {
				opts_default = window.SiteSettings.Currency;
			}

			_.each(_.keys(opts_default), function( key ) {
				if( _.isNull(opts[key]) || _.isUndefined(opts[key]) ) {
					opts[key] = opts_default[key];
				}
			} );

			result = this.format_money(number, opts);

			if( window.SiteSettings && window.SiteSettings.CurrencyExchange ) {
				exchange = this.format_money(number, window.SiteSettings.CurrencyExchange);
				result += '\xa0\/ ' + exchange;
			}

			return result;
		},

		is_bad_request: function(xhr){
			return (xhr && xhr.status === 400) && ( (xhr.responseJSON && xhr.responseJSON.Type === 'BadRequestException') || (xhr.responseJSON.data && xhr.responseJSON.data.Type === 'BadRequestException') );
		},

		get_bad_request_error_message: function(xhr){
			try {
				if (xhr && xhr.status === 400){
					return xhr.responseJSON.Message || xhr.responseJSON.data.Message;
				}
			} catch(e){
				console.warn('Could not get "Bad Request" error message', e);
			}

			return null;
		}

	};

	return Common;

});