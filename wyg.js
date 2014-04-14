/*
 * wyg
 * 
 * Uses hotkeys from jQuery Hotkeys Plugin by John Resig
 * https://github.com/jeresig/jquery.hotkeys/
 *
 * Uses some functions from Adam Sanderson's WYSIWYG
 * https://github.com/adamsanderson/wysiwyg/
 */


var wyg;

(function() {
	var events = {};

	wyg = {
		attribute: 'data-editable',
		current: null,
		range: null,

		enable: function(element, type) {
			var elements;
			if (element) {
				element.setAttribute(wyg.attribute, type || '');
				elements = [element];
			} else {
				elements = document.querySelectorAll('[' + wyg.attribute + ']');
			}

			for (var i = 0; i < elements.length; i++) {
				element = elements[i];
				type = wyg.getType(element);
				if (wyg.dispatchFrom(element, 'enable', true, { type: type })) {
					element.setAttribute('contenteditable', 'true');
					element.addEventListener('keydown', handleShortcuts, false);
					element.addEventListener('keydown', handlePlaceholderChanges, false);
					element.addEventListener('paste', handlePaste, false);
					element.addEventListener('keyup', handleChanges, false);
					element.addEventListener('mouseup', handleChanges, false);
					element.addEventListener('mousedown', handleChanges, false);
					element.addEventListener('paste', handleChanges, false);
					element.addEventListener('cut', handleChanges, false);
					element.addEventListener('mousedown', handleImageSelectStart, false);
					element.addEventListener('mouseup', handleImageSelectEnd, false);
					element.addEventListener('blur', handleBlur, false);
					element.addEventListener('focus', handleFocus, false);

					handlePlaceholder(element);
				}
			}
		},

		disable: function(element) {
			var elements;
			if (element) {
				elements = [element];
			} else {
				elements = document.querySelectorAll('[' + wyg.attribute + ']');
			}

			for (var i = 0; i < elements.length; i++) {
				element = elements[i];
				var type = wyg.getType(element);
				if (wyg.dispatchFrom(element, 'disable', true, { type: type })) {
					element.removeAttribute('contenteditable');
					element.removeEventListener('keydown', handleShortcuts, false);
					element.removeEventListener('keydown', handlePlaceholderChanges, false);
					element.removeEventListener('paste', handlePaste, false);
					element.removeEventListener('keyup', handleChanges, false);
					element.removeEventListener('mouseup', handleChanges, false);
					element.removeEventListener('mousedown', handleChanges, false);
					element.removeEventListener('paste', handleChanges, false);
					element.removeEventListener('cut', handleChanges, false);
					element.removeEventListener('mousedown', handleImageSelectStart, false);
					element.removeEventListener('mouseup', handleImageSelectEnd, false);
					element.removeEventListener('blur', handleBlur, false);
					element.removeEventListener('focus', handleFocus, false);
					element.removeEventListener('mousedown', handlePlaceholder, false);
					handlePlaceholder(element, true);
				}
			}
		},

		getType: function(element) {
			if (!element) element = wyg.current;
			return element ? element.getAttribute(wyg.attribute) : '';
		},

		on: function(eventName, listener) {
			var listeners = events[eventName] || (events[eventName] = []);
			var index = listeners.indexOf(listener);
			if (index != -1) return false;
			listeners.push(listener);
			return true;
		},

		off: function(eventName, listener) {
			var listeners = events[eventName];
			if (!listeners) return false;
			var index = listeners.indexOf(listener);
			if (index == -1) return false;
			listeners.splice(index, 1);
			return true;
		},

		html: function(element, value) {
			if (typeof element == 'string') {
				value = element;
				element = wyg.current;
			} else if (!element) {
				element = wyg.current;
				if (!element) return '';
			}

			if (value != undefined) {
				if (value != element.innerHTML) {
					element.innerHTML = value;
				}
				element.lastHTML = value;
				element.lastText = wyg.text(element);
				handlePlaceholder(element);
			} else {
				return element.innerHTML;
			}
		},

		text: function(element, value) {
			if (typeof element == 'string') {
				value = element;
				element = wyg.current;
			} else if (!element) {
				element = wyg.current;
				if (!element) return '';
			}
			
			if (value != undefined) {
				if ( (element.innerText !== undefined && value != element.innerText) || (element.innerText === undefined && value != element.textContent) ) {
					element.innerText !== undefined ? (element.innerText = value) : (element.textContent = value);
				}
				element.lastText = value;
				element.lastHTML = wyg.html(element);
				handlePlaceholder(element);
			} else {
				return element.innerText !== undefined ? element.innerText : element.textContent;
			}
		},
		
		selectAll: function(element) {
			if (!element) element = wyg.current;
			if (!element) return;
			var range = document.createRange();
			range.selectNodeContents(element);
			var selection = getSelection();
			selection.removeAllRanges();
			selection.addRange(range);
		},

		dispatch: function(eventName, cancelable, details) {
			if (!wyg.current) return false;
			return wyg.dispatchFrom(wyg.current, eventName, cancelable, details);
		},

		dispatchFrom: function(target, eventName, cancelable, details) {
			var event = new CustomEvent(eventName, { cancelable: cancelable, detail: details });
			if (eventName != 'focus' && eventName != 'blur') {
				target.dispatchEvent(event);
			}

			var listeners = events[eventName];
			if (listeners)
				listeners.forEach(function(listener) {
					if (listener.call(target, event) === false) {
						event.preventDefault();
					}
				});
			return !event.defaultPrevented;
		},

		exec: function(command, param) {
			// allow a listener to prevent this command from being called
			if (wyg.dispatch(command, true, { value: param }) && wyg.dispatch('command', true, { command: command, value: param })) {
				if (!wyg.commands[command]) return;

				// make sure to update selection once the command has been called
				handleChanges();

				// put the focus back to the current editable in case there was a button pressed, unless the command was cancel
				if (command != 'cancel')
					wyg.current.focus();

				return wyg.commands[command].call(wyg.current, param);
			} else {
				return false;
			}
		},

		state: {
			current:         {},
			bold:            makeQuery('bold'),
			italic:          makeQuery('italic'),
			strike:          makeQuery('strikethrough'),
			underline:       makeQuery('underline'),
			sub:             makeQuery('subscript'),
			sup:             makeQuery('superscript'),

			block:           checkParent(),
			h1:              checkParent('h1'),
			h2:              checkParent('h2'),
			h3:              checkParent('h3'),
			h4:              checkParent('h4'),
			h5:              checkParent('h5'),
			h6:              checkParent('h6'),
			p:               checkParent('p'),
			div:             checkParent('div'),
			blockquote:      checkParent('blockquote'),

			ol:              checkParent('ol'),
			ul:              checkParent('ul')
		},

		commands: {
			bold:            makeCommand('bold'),
			italic:          makeCommand('italic'),
			strike:          makeCommand('strikethrough'),
			underline:       makeCommand('underline'),
			sub:             makeCommand('subscript'),
			sup:             makeCommand('superscript'),

			block:           makeCommand('formatblock'),
			h1:              makeCommand('formatblock','h1'),
			h2:              makeCommand('formatblock','h2'),
			h3:              makeCommand('formatblock','h3'),
			h4:              makeCommand('formatblock','h4'),
			h5:              makeCommand('formatblock','h5'),
			h6:              makeCommand('formatblock','h6'),
			p:               makeCommand('formatblock','p'),
			div:             makeCommand('formatblock','div'),
			blockquote:      makeCommand('formatblock','blockquote'),

			ol:              makeCommand('insertorderedlist'),
			ul:              makeCommand('insertunorderedlist'),

			indent:          makeCommand('indent'),
			outdent:         makeCommand('outdent'),
			clear:           makeCommand('removeformat'),

			hr:              makeCommand('inserthorizontalrule'),
			img:             makeCommand('insertimage'),
			br:              makeCommand('inserthtml', '<br>'),

			html:            makeCommand('inserthtml'),
			cancel:          cancel
		},

		shortcuts: {
			'Ctrl+B': 'bold',
			'Ctrl+I': 'italic',
			'Ctrl+U': 'underline',
			'Ctrl+L': 'ol',
			'Ctrl+Shift+L': 'ul',
			'Ctrl+]': 'indent',
			'Ctrl+[': 'outdent',
			'Ctrl+1': 'h1',
			'Ctrl+2': 'h2',
			'Ctrl+3': 'h3',
			'Ctrl+4': 'h4',
			'Ctrl+5': 'h5',
			'Ctrl+6': 'h6',
			'Ctrl+0': 'p',
			'Ctrl+Shift+_': 'hr',
			'Ctrl+K': 'clear',
			'Esc': 'cancel'
		}

	};


	/*****************************************************
	 *
	 * Event Handlers
	 *
	 *****************************************************/

	function handleBlur() {
		this.focused = false;
		if (wyg.dispatch('blur', true)) {
			updateSelectionRange();
	
			if (this.lastFocusedHTML != wyg.html()) {
				wyg.dispatch('change', false, { html: this.lastHTML, text: this.lastText });
				delete this.lastFocusedHTML; // preserve memory
				delete this.lastHTML;
				delete this.lastText;
			}
		}
	}

	function handleFocus() {
		wyg.current = this;
		if (this.focused) return; // if the blur event was canceled don't process the focused event either
		
		this.focused = true;
		this.lastHTML = this.lastFocusedHTML = wyg.html();
		this.lastText = wyg.text();

		// use the tags, not the style attribute
		document.execCommand('styleWithCSS', false, false);
		// use <p> by default, not <div> or <br>
		document.execCommand('defaultParagraphSeparator', false, 'p');

		wyg.dispatch('focus');
		updateSelectionRange();
	}

	function handleShortcuts(event) {
		var commandKey = navigator.userAgent.indexOf('Macintosh') != -1 ? 'metaKey' : 'ctrlKey';

		var shortcutArray = [];
		if (event[commandKey]) shortcutArray.push('Ctrl');
		if (event.altKey) shortcutArray.push('Alt');
		if (event.shiftKey) shortcutArray.push('Shift');
		var character = hotkeys.specialKeys[event.which] || String.fromCharCode(event.which);
		if (character == 'Ctrl' || character == 'Meta' || character == 'Alt' || character == 'Shift') {
			return;
		}
		character = event.shiftKey && hotkeys.shiftNums[character] || character;
		shortcutArray.push(character);
		var shortcut = shortcutArray.join('+');

		// if the shortcut isn't registered then stop
		var command = wyg.shortcuts[shortcut];
		if (!command) return;

		// be consistent in stopping any browser shortcuts across editable fields of all types 
		event.preventDefault();
		event.stopPropagation();

		wyg.exec(command);
	}

	function handlePaste() {
		var element = this;
		setTimeout(function() {
			var selection = getSelection();
			var selRange = selection.getRangeAt(0);
			var range = document.createRange();
			range.selectNodeContents(element);
			selection.removeAllRanges();
			selection.addRange(range);
			wyg.exec('clear');
			wyg.exec('clear');
			wyg.exec('clear');
			selection.removeAllRanges();
			selection.addRange(selRange);
		});
	}

	function handleChanges() {
		setTimeout(function() {
			updateSelectionRange();
			updateState();
			updateContentChange();
		})
	}

	function handleImageSelectStart(event) {
		if (event.target.tagName == 'IMG') event.preventDefault();

	}

	function handleImageSelectEnd(event) {
		if (event.target.tagName != 'IMG') return;
		var range = document.createRange();
		range.setStartBefore(event.target);
		range.setEndAfter(event.target);
		var selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function handlePlaceholderChanges() {
		setTimeout(handlePlaceholder)
	}

	function handlePlaceholder(element, remove) {
		element = element || wyg.current;
		if (!element.hasAttribute('placeholder')) return;

		var placeholder = element.previousElementSibling;
		if (placeholder && !placeholder.hasAttribute('data-placeholder')) placeholder = null;

		if (wyg.text(element) || remove) {
			if (placeholder) element.parentNode.removeChild(placeholder);
		} else {
			if (!placeholder) {
				// make sure it has time to place elements in the page
				placeholder = document.createElement(element.nodeName);
				// make sure it gets styled the same
				for (var i = 0; i < element.attributes.length; i++) {
					var attr = element.attributes[i];
					placeholder.setAttribute(attr.name, attr.value);
				}
				placeholder.setAttribute('data-placeholder', '');
				placeholder.style.position = 'absolute';
				element.style.position = 'relative';
				placeholder.style.color = element.getAttribute('placeholder-color') || 'darkGray';
				placeholder.style.whiteSpace = 'pre';
				placeholder.style.wordWrap = 'normal';
				placeholder.style.margin = '0';
				placeholder.style.borderColor = 'transparent';
				placeholder.textContent = element.getAttribute('placeholder');
				element.parentNode.insertBefore(placeholder, element);
				if (getStyle(element.parentNode).position == 'static') {
					element.parentNode.style.position = 'relative';
				}
			}

			setTimeout(function() {
				placeholder.style.left = element.offsetLeft + 'px';
				placeholder.style.top = element.offsetTop + 'px';
			})
		}
	}



	/*****************************************************
	 *
	 * Updaters
	 *
	 *****************************************************/


	function updateState() {
		var state = wyg.state, current = state.current, changes = {};
		Object.keys(state).forEach(function(stateName) {
			if (stateName == 'current') return;

			var value = state[stateName](), prev = current[stateName];
			if (value !== prev) {
				changes[stateName] = value;
				current[stateName] = value;
				wyg.dispatch('stateChange:' + stateName, false, { value: value, previous: prev });
			}
		});
		if (Object.keys(changes).length) {
			wyg.dispatch('stateChange', false, { changes: changes, current: current });
		}
	}

	function updateSelectionRange() {
		var selection = window.getSelection();
		var range = selection.rangeCount ? selection.getRangeAt(0) : null;
		if (wyg.current && !wyg.current.focused) range = null;
		if (range && !range.collapsed && range.endOffset == 0) range.setEndBefore(range.endContainer);

		if (!rangeEquals(range, wyg.range)) {
			if (wyg.range) wyg.range.detach();
			wyg.range = range;
			wyg.rangeObj = storeRange(range); // fix where some browsers update the range instance instead of creating new ones
			wyg.dispatch('selectionChange', false, { range: range, selection: selection });
		}
	}

	function updateContentChange(element) {
		if (!element) element = wyg.current;
		if (!element) return;
		var html = wyg.html(element);
		var text = wyg.text(element);

		if (html != element.lastHTML) {
			wyg.dispatchFrom(element, 'htmlChange', false, { value: html, previous: element.lastHTML });
			element.lastHTML = html;
		}

		if (text != element.lastText) {
			wyg.dispatchFrom(element, 'textChange', false, { value: text, previous: element.lastText });
			element.lastText = text;
			handlePlaceholder(element);
		}
	}


	/*****************************************************
	 *
	 * Utility
	 *
	 *****************************************************/

	function cancel() {
		var selection = window.getSelection();
		selection.removeAllRanges();
		this.blur();
	}

	function makeCommand(command, param) {
		return function(userParam) {
			return document.execCommand(command, false, param || userParam);
		};
	}

	function makeQuery(command){
		return function(){
			return document.queryCommandState(command);
		};
	}

	function checkParent(name){
		return function(){
			var el, blockEl;
			el = nearestElement(getRangeStartNode());

			if (el) {
				blockEl = getBlockElement(el);
				if (name) {
					return blockEl && blockEl.tagName.toLowerCase() === name;
				} else {
					return blockEl && blockEl.tagName.toLowerCase();
				}
			}
		};
	}

	function getBlockElement(el){
		var style = getStyle(el);
		var display = style.display;

		if (display == 'block' || display == 'table') {
			return el;
		} else {
			return getBlockElement(el.parentElement);
		}
	}

	function nearestElement(node){
		return node.nodeType == 1 ? node : node.parentElement;
	}

	function getStyle(el){
		if (window.getComputedStyle) {
			return window.getComputedStyle(el);
		} else {
			return el.currentStyle;
		}
	}

	function getRangeStartNode(){
		var selection;
		var node;

		if (document.getSelection){
			selection = document.getSelection();
			if (selection.rangeCount){
				node = selection.getRangeAt(0).startContainer;
			} else {
				node = document.body;
			}
		} else {
			node = document.selection.createRange().parentElement();
		}

		return node;
	}

	function storeRange(range) {
		if (!range) return null;

		return {
			startContainer: range.startContainer,
			startOffset: range.startOffset,
			endContainer: range.endContainer,
			endOffset: range.endOffset,
			collapsed: range.collapsed
		};
	}

	function rangeEquals(range, rangeObj) {
		return range == rangeObj ||
			rangeObj && range &&
				range.startContainer == rangeObj.startContainer &&
				range.startOffset == rangeObj.startOffset &&
				range.endContainer == rangeObj.endContainer &&
				range.endOffset == rangeObj.endOffset
	}

	var hotkeys = {
		specialKeys: {
			8: 'Backspace', 9: 'Tab', 13: 'Return', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 19: 'Pause',
			20: 'CapsLock', 27: 'Esc', 32: 'Space', 33: 'PageUp', 34: 'PageDown', 35: 'End', 36: 'Home',
			37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down', 45: 'Insert', 46: 'Del', 91: 'Meta',
			96: '0', 97: '1', 98: '2', 99: '3', 100: '4', 101: '5', 102: '6', 103: '7',
			104: '8', 105: '9', 106: '*', 107: '+', 109: '-', 110: '.', 111 : '/',
			112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6', 118: 'F7', 119: 'F8',
			120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12', 144: 'NumLock', 145: 'Scroll', 189: '-', 187: '=', 191: '/',
			219: '[', 221: ']', 224: 'Meta'
		},

		shiftNums: {
			'`': '~', '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&',
			'8': '*', '9': '(', '0': ')', '-': '_', '=': '+',
			'[': '{', ']': '}', '\\': '|',
			';': ': ', '\'': '\"',
			',': '<', '.': '>',  '/': '?'
		}
	};
})();
