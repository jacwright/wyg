
var wygToolbar;

(function() {

	var toolbar = wygToolbar = document.createElement('div');
	wygToolbar.className = 'wyg-toolbar';


	toolbar.types = {
		text: '',
		simple: 'bold|italic',
		header: 'italic',
		full: 'bold|italic|underline,ol|ul,(indent|outdent),(block:h1|h2|h3|p),(hr|clear|cancel)',
		repeat: false
	};

	wyg.on('enable', function(event) {
		var type = event.detail.type;
		if (type == 'header') {
			this.addEventListener('keydown', preventNewlines);
		}
		return toolbar.types.hasOwnProperty(type) && toolbar.types[type] !== false
	});

	wyg.on('disable', function(event) {
		var type = event.detail.type;
		if (type == 'header') {
			this.removeEventListener('keydown', preventNewlines);
		}
		return toolbar.types.hasOwnProperty(type) && toolbar.types[type] !== false
	});

	wyg.on('command', function(event) {
		// if the command isn't allowed for this editable field then stop
		var command = event.detail.command;
		var type = wyg.getType(this);
		return toolbar.types.hasOwnProperty(type) && toolbar.types[type].match(new RegExp('\\b' + command + '\\b')) != null;
	});

	wyg.on('selectionChange', function() {
		if (this.hasAttribute('no-toolbar')) return;
		var range = wyg.range;
		if (range && !range.collapsed && range.toString() && !toolbar.parentNode) {
			document.body.appendChild(toolbar);
		} else if ((!range || range.collapsed) && toolbar.parentNode) {
			document.body.removeChild(toolbar);
		}

		if (toolbar.parentNode) {
			populateFor(this);
			updateState();
			positionAgainst(range);
		}
	});

	wyg.on('stateChange', function() {
		if (toolbar.parentNode) updateState();
	});

	window.addEventListener('resize', function() {
		if (toolbar.parentNode) {
			positionAgainst(wyg.range);
		}
	});
	
	toolbar.addEventListener('mousedown', function(event) {
		if (event.target == toolbar) return;
		var stop = function() {return false};
		wyg.on('blur', stop);
		setTimeout(function() {
			wyg.off('blur', stop);
		})
	});


	function populateFor(element) {
		var html = [];
		var type = toolbar.types[wyg.getType(element)];
		if (!type) {
			document.body.removeChild(toolbar);
			return;
		} else if (toolbar.getAttribute('data-type') == type) {
			return;
		}

		toolbar.setAttribute('data-type', type);
		var state = wyg.state.current;
		type.split(',').forEach(function(group) {
			if (/^[\[\(]/.test(group)) return;
			html.push('<div class="group">');
			group.split('|').forEach(function(command) {
				html.push('<button data-command="' + command + '" onclick="wyg.exec(\'' + command + '\')"><i class="wyg-icon-' + command + '"></i></button>');
			});
			html.push('</div>');
		});
		toolbar.innerHTML = html.join(' ');
	}

	function positionAgainst(range) {
		var selRect = range.getBoundingClientRect();
		var toolRect = toolbar.getBoundingClientRect();
		var left = selRect.left, top = window.scrollY + selRect.bottom + 10;
		// if the range can't be bounded put the toolbar off-screen
		if (selRect.width == 0 && selRect.height == 0) {
			left = -1000;
			top = -1000;
		} else {
			if (left + toolRect.width + 10 > window.innerWidth) left = window.innerWidth - toolRect.width - 10;
			if (top - window.scrollY + toolRect.height + 10 > window.innerHeight) top = window.scrollY + selRect.top - toolRect.height - 10;
		}
		toolbar.style.left = left + 'px';
		toolbar.style.top = top + 'px';
	}

	function updateState() {
		var state = wyg.state.current, buttons = toolbar.querySelectorAll('button[data-command]');
		for (var i = 0; i < buttons.length; i++) {
			var button = buttons[i];
			button.className = state[button.getAttribute('data-command')] ? 'active' : '';
		}
	}

	function preventNewlines(event) {
		if (event.which == 13) event.preventDefault();
	}

})();
