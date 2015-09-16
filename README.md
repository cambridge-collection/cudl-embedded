# CUDL Embedded Viewer

This repository contains the CUDL embedded item viewer.

It consists of essentially a single page app which is intended to run in an
iframe.


## Install dependencies

```
$ npm install
$ npm install -g webpack webpack-dev-server grunt-cli
```

`webpack` and `webpack-dev-server` are optional if you're doing everything via
grunt.


## Developing

[Webpack](http://webpack.github.io/) is used to build the viewer.

The javascript source can use
[es6 functionality](https://babeljs.io/docs/learn-es2015/), but at this time
I've not refactored it from vanila js to make use of es6 features.

The CSS is post-processed by [postcss]() which allows us to use less/sass like
functionality and more. Again, I've not refactored the vanilla CSS to make use
of these features. The only postcss processor currently installed is
autoprefixer.


### Workflow

Configuration is provided to run the viewer in webpack's dev server with [hot
module replacement](http://webpack.github.io/docs/hot-module-replacement.html) to provide live updates as source files are changed.

Either of the following will launch the dev server:

```
$ grunt develop
$ webpack-dev-server --config webpack.config.dev.babel.js --inline --hot
```

Once the server's started, the viewer can be accessed at these URLs:

* http://localhost:8080/viewer - The viewer, taking up the entire browser window
* http://localhost:8080/webpack-dev-server/viewer - As above, but with a status bar showing HMR status
* http://localhost:8080/examples/blog/blog.html - The viewer embedded in a mock blog post


### Accessing dev server from external hosts

Because of the way CSS files are created in dev mode, the webpack output public
path has to be an absolute URL. This will cause the viewer to break if you
try to acccess it from another host, as the default dev public path is
`http://localhost:8080/`. You can specify a hostname/IP that the external host
can use to access the webpack dev server host on the command line:

```
$ webpack-dev-server --config ./webpack.config.dev.babel.js \
    # Bind to all interfaces. By default only loopback is bound to
    --host 0.0.0.0 \
    # Specify the URL the external host(s) can use to access the server
    --output-public-path 'http://192.168.1.2:8080/'
```


## Building

The default webpack config contains the production config. It's slightly
different to the dev config. An HTML file is created with the default template
pre-rendered. The JS and CSS are separate files.

To build, either use:

```
$ webpack -p
```
(`-p` enables production mode, which turns on minification and other bundle size optimisations.)

Or:
```
$ grunt build
```

The grunt build has the advantage that it cleans `built/` before running.


## Viewer Configuration

The commands above for building the viewer in dev and production mode will use
the default config (`./config/default.json`).

Set the `CONFIG` envar to the `require()` path of the desired config file to
use a different one. For example:

```
$ CONFIG=./config/custom.json webpack -p
```

This works in the same way for dev and production builds.


## Releasing a version

These steps are performed manually at the moment.

1. Set the version in `package.json` to the version to be tagged (e.g. remove
   the -snapshot suffix) and stage it to be committed
2. Build the player using the default config (`$ grunt build`)
3. Stage `build/*` to be committed (note that it's ignored in .gitignore, so `-f` will be required)
4. Commit the staged changes with the message "Release x.y.z"
5. Tag the release commit with the version number and message "Tag x.y.z"
6. Create another commit which reverts the effects of the release commit, and
   bumps the version in `package.json` to the next version with a `-snapshot`
   suffix. An easy way to do this is to `$ git revert HEAD`, then edit
   `package.json` and `$ git commit --amend` onto the revert commit, changing
   the commit message to: "Finish x.y.z release".
