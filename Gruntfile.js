var url = require("url");

module.exports = function(grunt) {
    grunt.config.init({
        pkg: grunt.file.readJSON("package.json"),
        shell: {
            /** Build embedded viewer for use on real server deployments. */
            build: {
                command: './node_modules/.bin/webpack -p --bail'
            },
            /** Run the webpack dev server in with hot module reloading */
            develop: {
                command:
                    'echo "Viewer is available at ' +
                    'http://localhost:8080/viewer" && ' +

                    './node_modules/.bin/webpack-dev-server ' +
                    '--config webpack.config.dev.babel.js --inline --hot'
            }
        },
        clean: {
            viewer: ["built/"]
        },
        jshint: {
            player: {
                options: {
                    jshintrc: true
                },
                files: {
                    src: ["src/scripts/*.js", "*.js"]
                }
            }
        }
    });

    // Load external tasks
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-contrib-jshint");

    // Define our task aliases. The "player" task is the top-level task which
    // should be run normally.
    grunt.registerTask("default", ["player"]);

    grunt.registerTask("build", [
        "clean", "shell:build"
    ]);

    grunt.registerTask("develop", [
        "shell:develop"
    ]);

    grunt.registerTask("player-custom-config",
        "Build the player with a custom configuration.", function() {

        grunt.option("player-config",
            grunt.option("player-config") || "./config/custom.json");
        grunt.task.run("player");
    });
};
