var url = require("url");

module.exports = function(grunt) {
    grunt.config.init({
        pkg: grunt.file.readJSON("package.json"),
        uglify: {
            player: {
                options: {
                    preserveComments: "some",
                    beautify: false,
                    compress: true,
                    mangle: true
                },
                src: [
                    "src/lib/modernizr.custom.js",
                    "src/lib/google-analytics.js",
                    "src/lib/jquery.js",
                    "src/lib/openseadragon/openseadragon.js",
                    "src/scripts/player.js",
                    "src/scripts/init.js"
                ],
                dest: "build/player/player.min.js"
            }
        },

        clean: {
            player: ["build/player/"],
            "font-awesome-font-path": ["build/font-awesome/"]
        },

        cssmin: {
            player: {
                options: {
                    keepSpecialComments: "1"
                },
                files: {
                    "build/player/player.min.css": [
                        "build/css-url-rewrite/font-awesome.css",
                        "src/lib/normalize.css",
                        "build/css-url-rewrite/player.css"
                    ]
                }
            }
        },

        jade: {
            player: {
                options: {
                    pretty: false,
                    data: function(dest, src) {
                        var playerConfigFile = grunt.option("player-config") ||
                            "./config/default.json";

                        grunt.log.writeln("Using player config: " +
                            playerConfigFile);

                        var playerConfig = JSON.stringify(
                            require(playerConfigFile));
                        var minifiedJavascript = grunt.file.read(
                            "build/player/player.min.js", {encoding: "utf-8"});
                        var minifiedCss = grunt.file.read(
                            "build/player/player.min.css", {encoding: "utf-8"});

                        // Ensure the js/css we're inserting into script tags
                        // does not contain closing tags which would break the
                        // HTML.
                        assertSafeToInsert("script",
                            playerConfig, playerConfigFile);
                        assertSafeToInsert("script",
                            minifiedJavascript, "Minified javascript");
                        assertSafeToInsert("style",
                            minifiedCss, "Minified css");

                        return {
                            versionInfo: grunt.config("pkg.version"),
                            viewerSettings: playerConfig,
                            minifiedJavascript: minifiedJavascript,
                            minifiedCss: minifiedCss

                        }
                    }
                },
                files: {
                    "build/player/player.html": [
                        "src/html-templates/player-prod.jade"
                    ]
                }
            }
        },

        copy: {
            player: {
                files: [
                    {
                        nonull: true,
                        expand: true,
                        cwd: "src/",
                        src: ["images/player/*.png", "fonts/*"],
                        dest: "build/player/"
                    },
                    {
                        nonull: true,
                        expand: true,
                        cwd: "src/lib/font-awesome",
                        src: ["fonts/*"],
                        dest: "build/player/"
                    }
                ]
            }
        },

        jshint: {
            player: {
                options: {
                    jshintrc: true
                },
                files: {
                    src: ["src/scripts/*.js", "bin/devserver.js"]
                }
            }
        },

        // Rewrite the relative urls in the CSS so that they are relative to
        // the src directory. When the CSS gets embedded into the player HTML,
        // it's effectively at the same location as the src directory.
        cssUrlRewrite: {
            player: {
                options: {
                    rewriteUrl: function(path) {
                        // Path is relative to the project root. We need to make
                        // it relative to ./src/, as src contains the static files
                        // which we serve up.
                        return /^src\/(.*)$/.exec(path)[1];
                    }
                },
                src: "src/stylesheets/player.css",
                dest: "build/css-url-rewrite/player.css"
            },
            fontawesome: {
                options: {
                    rewriteUrl: function(path) {
                        // Font-Awesome fonts are moved into ./fonts/* after
                        // building, so we need to point fontawesome's urls
                        // there.
                        var fontFile = /^src\/lib\/font-awesome\/fonts\/(.*)$/
                            .exec(path)[1];
                        return url.resolve("fonts/", fontFile);
                    }
                },
                src: "src/lib/font-awesome/css/font-awesome.css",
                dest: "build/css-url-rewrite/font-awesome.css"
            }
        }
    });

    // Load external tasks
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-contrib-cssmin");
    grunt.loadNpmTasks("grunt-contrib-jade");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-serve");
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-css-url-rewrite");

    // Define our task aliases. The "player" task is the top-level task which
    // should be run normally.
    grunt.registerTask("default", ["player"]);
    grunt.registerTask("css", ["cssUrlRewrite", "cssmin:player"]);
    grunt.registerTask("player", [
        "clean", "jshint:player", "css", "uglify:player", "jade:player",
        "copy:player"
    ]);
    grunt.registerTask("player-custom-config",
        "Build the player with a custom configuration.", function() {

        grunt.option("player-config",
            grunt.option("player-config") || "./config/custom.json");
        grunt.task.run("player");
    });

    function assertSafeToInsert(tag, text, textDesc) {
        if(willBreakTag("script", text)) {
            grunt.fail.fatal(
                textDesc + " contains closing " + tag + " tag.");
        }
    }

    /**
     * Check if inserting text into a tag (which doesn't support HTML escaping)
     * named tagName will break the markup. e.g. if text contains the closing
     * tag.
     * @param tagName The name of the containing tag, e.g. script, style
     * @param text The text to be inserted
     * @returns {boolean} false if the text can be inserted safely, false
     *          otherwise.
     */
    function willBreakTag(tagName, text) {
        var regex = new RegExp("<\/" + tagName);
        return regex.test(text);
    }
};
