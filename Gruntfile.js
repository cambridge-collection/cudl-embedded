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
                        "build/font-awesome/font-awesome.css",
                        "src/lib/normalize.css",
                        "src/stylesheets/player.css"
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
            },

            // Change the path that fontawesome uses to point to its font files
            "font-awesome-font-path": {
                nonull: true,
                expand: true,
                cwd: "src/lib/font-awesome/css/",
                src: ["font-awesome.css"],
                dest: "build/font-awesome/",
                options: {
                    process: fixFontAwesomeFontPaths
                }
            }
        },

        jshint: {
            player: {
                options: {
                    jshintrc: true
                },
                files: {
                    src: ["src/scripts/*.js"]
                }
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

    // Define our task aliases. The "player" task is the top-level task which
    // should be run normally.
    grunt.registerTask("default", ["player"]);
    grunt.registerTask("css", ["copy:font-awesome-font-path", "cssmin:player"]);
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

    function willBreakTag(tagName, text) {
        var regex = new RegExp("<\/" + tagName);
        return regex.test(text);
    }

    function fixFontAwesomeFontPaths(content) {
        // Change ../fonts/ to fonts/
        return content.replace(/url\('\.\.\/fonts\//g, "url('fonts/");
    }
};
