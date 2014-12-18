# CUDL Embedded Viewer

This repository contains the CUDL embedded item viewer.

It consists of essentially a single page app which is intended to run in an
iframe.


## Building

Run `$ npm install` first, then:

```
$ grunt player
```

to build the player with the default config (`config/default.json`). Use
`$ grunt player-custom-config` to build with `config/custom.json` (which you'll
need to provide first).

The output is created in `build/player/`. Tagged version release commits contain
the default player pre-built in `build/player/`, so they can be checked out and
used without building.
