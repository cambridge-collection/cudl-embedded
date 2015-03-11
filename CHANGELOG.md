# Cudl Embedded Viewer Changelog

## 0.0.2 - WIP

## 0.0.1 - 2015-03-11 - Small bugfixes and cleanup

* Added development server (bin/devserver.js) to correctly serve the viewer
  using the unminified sources
  * Also serves the example blog page
* `hide-info=true` URL hash param to control initial visibility of metadata
  sidebar
* Code cleanup
  * Added .editorconfig and normalised all files to match it
  * Added jshint linting to grunt and fixed various style issues
  * Some new doc comments
* Work around Safari bug which prevents viewer from zooming when embedded
* Correctly report non-embeddable items, now that cudl-services reports them
  with 403 responses
* Fix hide/show button on metadata bar not being visible in Safari
* Fix shortcut help text for W key saying Right instead of Up

## 0.0.0 - 2014-12-18 - Initial version

* Support for embedding CUDL items into another page inside an iframe
* Grunt build to compile viewer to 1 HTML file, inlining js and css
