# Golden Cookie Alarm

Paste either line in the game's console (F12 → Console):

```js
Game.LoadMod('https://cdn.jsdelivr.net/gh/micahdot/cookieclickermod@main/alarm.js')
Game.LoadMod('https://xplodebrainz.com/cookie/alarm.js')
```

Bookmarklet (paste into a bookmark's URL field), either one:

```js
javascript:(function(){Game.LoadMod('https://cdn.jsdelivr.net/gh/micahdot/cookieclickermod@main/alarm.js');}());
javascript:(function(){Game.LoadMod('https://xplodebrainz.com/cookie/alarm.js');}());
```

Loops a song while a golden/wrath/reindeer cookie is up. Stop with `__goldenAlarmStop()`; refreshing turns it off.

On coolmathgames.com (game runs in a frame), use one of these instead:

```js
document.body.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.jsdelivr.net/gh/micahdot/cookieclickermod@main/alarm.js'}))
document.body.appendChild(Object.assign(document.createElement('script'),{src:'https://xplodebrainz.com/cookie/alarm.js'}))
```
