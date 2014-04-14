Wyg is an *inline WYSIWYG* which can edit content directly in your page, without
an iframe. This allows the content to keep the styling and to stay in context
with the rest of your page.

Wyg is broken up into a core library which handles the commands and keyboard
shortcuts, and a toolbar extension, which adds a floating toolbar. Because of
its modularity you may create your own toolbars or use the core as a building
block to larger libraries or features.

If you use wyg and like it, please contribute back any fixes or improvements you
make. We'd like to keep any visual features out of the core, and use hooks or
events to make extending easy.

## Features

Wyg employs the concept of "type" in the core as purely an extension attribute.
The packaged wyg toolbar uses "type" to determine what toolbar buttons to
display and what commands to allow. In this way, some editable areas can have
images, paragraphs, and headers, while other areas may only allow bold and
italics.

If an editable element has a `placeholder` attribute, wyg will attempt to
duplicate placeholder functionality as an `<input type="text">` element has.

## Usage

You can use wyg in two ways. First, you may add `data-editable` attributes to
HTML tags in your page and then call wyg.enable() after the page is loaded to
make them editable.

```html
<html>
<head>
<title>Regular HTML page with editable elements</title>
<link rel="stylesheet" href="css/font-awesome.css">
<link rel="stylesheet" href="css/wyg-toolbar.css">
<script type="text/javascript" src="wyg.js"></script>
<script type="text/javascript" src="wyg-toolbar.js"></script>
</head>
<body>
<section>
  <h1 data-editable="simple">Regular HTML page with editable elements</h1>
</section>
<article>
  <h2 data-editable="text">Lorem Ipsum Dolor</h2>
  <div data-editable="full">
    <p>Lorem ipsum dolor sit amet, consecteur.</p>
    <p>Cras feugiat commodo tincidunt.</p>
  </div>
</article>
<script type="text/javascript">
  wyg.enable();
</script>
</body>
</html>
```

The second way is to turn editing on and off using JavaScript. You may pass in
an `element` and a `type` to the `enable` function.

```javascript
var element = document.body;
wyg.enable(element, "full");
...
wyg.disable(element);
```

To get and set the HTML/text of an element use `wyg.html` and `wyg.text`.
Although wyg is focused on HTML content, sometimes it is desirable to use
inline-editing with content-editable (for styling) without wanting the rich
text features.

```javascript
var element = document.querySelector("#my-input");
wyg.enable(element, "simple");
wyg.html(element, localStorage.get('content') || "Hello <strong>world!</strong>");

element.addEventListener('htmlChange', function(event) {
  localStorage.set('content', event.detail.value);
});
```

## Events

Wyg dispatches `CustomEvent` events from the editable element's themselves and
also through wyg. If you want to listen to all `htmlChange` events anywhere on
the page you may use `wyg.on('htmlChange', function(event){})` but if you're
only interested in individual elements you may use
`element.addEventListener('htmlChange', function(event){})`. Extra information
for each event can be found in the `event.detail` object.

**Events**

* `focus` when an element (or any wyg-enabled element) recieves focus.
* `blur` when an element loses focus.
* `change` when an element's content is changed, only dispatches when the
element loses focus the same as a text input element, will happen infrequently.
`detail: {html: 'html content', text: 'text content'}`
* `htmlChange` when an element's HTML changes, immediatly after it changes. It
can happen many times a second.
`detail: {value: 'html content', previous: 'content before the change'}`
* `textChange` when an element's text changes, immediately after it changes.
This will only dispatch if the text value is different, so a `bold` command will
not cause this event to dispatch.
`detail: {value: 'text content', previous: 'content before the change'}`
* `stateChange:{state}` when the specific state `state` changes, e.g. from bold
(`true`) to not bold (`false`). This indicates the state of where the cursor is
at, so moving the cursor from non-bolded text to bolded text will trigger this
event the same as executing the `bold` command.
`detail: {value: newState, previous: previousState}`
* `stateChange` when any state changes. This represents all state where the
cursor is currently at and includes things like `bold`, `block`, `h1`, and `ul`.
`detail: {changes: newStates, current: allStates}`
* `selectionChange` whenever the cursor moves or a new selection is made.
`detail: {range: actualRangeObject, selection: actualSelectionObject}`
* `{command}` before a command is executed an event by its name is dispatched.
The command may be prevented by calling event.preventDefault().
`detail: {value: valueSentToExec}`
* `command` a generic "command" event is also dispatched before any command,
allowing you to listen to all commands instead of specific ones. Using
`event.preventDefault()` can cancel them from here as well.
`detail: {command: commandName, value: valueSentToExec}`

## Commands

Each action such as bolding text is a command. You may call execute commands on
the currently focused editable element by calling `wyg.exec("bold")`. Many of
the commands are toggle commands, such as bold and italics, so passing in a
value does not affect the result. But other commands such as `html` take a
value. We have opted for a wysiwyg/editor that does not allow the user to mess
up the page design by adding their own font-size, color, or font-family. Though
default browser commands can easily be added with:

```javascript
wyg.commands.fontName = function(value) {
  return document.execCommand(command, false, value);
};
```

The commands are currently:
* bold
* italic
* strike
* underline
* sub
* sup
* block
* h1
* h2
* h3
* h4
* h5
* h6
* p
* div
* blockquote
* ol
* ul
* indent
* outdent
* clear
* hr
* img
* br
* html
* cancel

## State

State is the current state of where the cursor is at in an editable area. This
allows toolbars to show a toggled-on state for a bold button. The
`wyg.state.current` object always holds the latest state information for the
selected area. And using the `stateChange` event can alert you to when that
changes.

You may also add your own state checks:

```javascript
wyg.states.fontName = function() {
  return document.queryCommandValue("fontName");
};
```

The states are currently:

* current
* bold
* italic
* strike
* underline
* sub
* sup
* block
* h1
* h2
* h3
* h4
* h5
* h6
* p
* div
* blockquote
* ol
* ul

## Shortcuts

Shortcuts are built-in to wyg since it is a common need. You may make your own
shortcuts by altering the `wyg.shortcuts` object. Use "Ctrl" for either the
control key on Windows/Linux or the command key (⌘) on a Mac. 

```javascript
wyg.commands.newDocument = createNewDocument;
wyg.shortcuts["Ctrl+Shift+N"] = 'newDocument';
```

The shortcuts are currently:

* Ctrl+B = bold
* Ctrl+I = italic
* Ctrl+U = underline
* Ctrl+L = ol
* Ctrl+Shift+L = ul
* Ctrl+] = indent
* Ctrl+[ = outdent
* Ctrl+1 = h1
* Ctrl+2 = h2
* Ctrl+3 = h3
* Ctrl+4 = h4
* Ctrl+5 = h5
* Ctrl+6 = h6
* Ctrl+0 = p
* Ctrl+Shift+_ = hr
* Ctrl+K = clear
* Esc = cancel

## API

The wyg API (note, element may always be left out to indicate the currently
focused element):

* `wyg.getType()`
* `wyg.on(eventName, listener)`
* `wyg.off(eventName, listener)`
* `wyg.html([element], [value])` (getter/setter)
* `wyg.text([element], [value])` (getter/setter)
* `wyg.selectAll(element)`
* `wyg.dispatch(eventName, cancelable, details)`
* `wyg.dispatchFrom(element, eventName, cancelable, details)`
* `wyg.exec(command, value)`
