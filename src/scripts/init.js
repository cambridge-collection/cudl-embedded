import $ from 'jquery';

// These are loaded for their side-effects
import 'google-analytics';
import 'modernizr.custom';
import '../stylesheets/player.css';


window.__cudlEmbeddedVersion = VERSION;

function getConfig() {
    // CONFIG global is set via the webpack define plugin
    let config = CONFIG;

    // Allow overriding the config with a script tag w/ id config.
    let configElement = $('script#config[type="application/json"]');
    if(configElement.length) {
        try {
            Object.assign(config, JSON.parse(configElement.text()));
        }
        catch(e) {
            console.error('Unable to parse config: ' + configElement.text(), e);
        }
    }

    return config;
}

$(function() {
    // In dev mode we're using the webpack dev server to provide the HTML
    // which loads our js bundle, so we need to render the HTML outself.
    // Whereas in production, the template is pre-rendered and the CSS
    // is extracted into a separate bundle.
    if(DEV) {
        let playerTemplate = require('../html-templates/player.jade');
        let markup = $($.parseHTML(playerTemplate()));

        $(document.body)
            .append(markup.children())
            .attr('class', markup.attr('class'));

        $(document.head)
            .prepend('<meta name="viewport" content="initial-scale=1">');
    }

    let config = getConfig();
    console.debug('Using config: ', config);

    // player.js needs to be loaded after the DOM is loaded
    require('./player.js').initFromConfig(config);
});
