# CUDL Embedded Viewer

This repository contains the CUDL embedded item viewer.

It consists of essentially a single page app which is intended to run in an
iframe.

## Developing

Run `$ npm install` first, then:

```
$ bin/devserver.js
```

The devserver will be available at http://localhost:1234/

The player is available at [/embed/v0/viewer](http://localhost:1234/embed/v0/viewer) on the devserver. It serves
`src/html-templates/player.jade`.


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


## Releasing a version

These steps are performed manually at the moment.

1. Build the player using the default config (`$ grunt player`)
2. Set the version in `package.json` to the version to be tagged (e.g. remove
   the -snapshot suffix) and stage it to be committed
3. Stage `build/player` to be committed (note that it's ignored in .gitignore)
4. Commit the staged changes with the message "Release x.y.z"
5. Tag the release commit with the version number and message "Tag x.y.z"
6. Create another commit which reverts the effects of the release commit, and
   bumps the version in `package.json` to the next version with a `-snapshot`
   suffix. An easy way to do this is to `$ git revert HEAD`, then edit
   `package.json` and `$ git commit --amend` onto the revert commit, changing
   the commit message to: "Finish x.y.z release".
